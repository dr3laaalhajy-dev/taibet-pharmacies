import 'dotenv/config';
import express from 'express';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import cors from 'cors';

const { Pool } = pg;
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'pharmacy-secret-key';
const SUPER_ADMINS = ['admin@pharmaduty.com', 'alaa@taiba.pharma.sy', 'alaa3@taiba.dental.sy'];

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
app.use(express.json()); app.use(cookieParser()); app.use(cors({ origin: true, credentials: true }));

const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'غير مصرح' });
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => { if (err) return res.status(403).json({ error: 'ممنوع' }); req.user = user; next(); });
};

// --- Public Routes ---
app.get('/api/public/facilities', async (req, res) => { try { res.json((await pool.query('SELECT id, name, type, address, phone, latitude, longitude, pharmacist_name, whatsapp_phone, image_url, working_hours, doctor_id, manual_status, specialty, is_ecommerce_enabled, services, consultation_fee, waiting_time FROM pharmacies ORDER BY id DESC')).rows); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.get('/api/public/doctors/:id', async (req, res) => { try { const doctor = (await pool.query('SELECT id, name, email, role, phone, notes FROM users WHERE id = $1', [req.params.id])).rows[0]; if (!doctor) return res.status(404).json({ error: 'User not found' }); const facilities = (await pool.query('SELECT id, name, type, address, phone, specialty, services, consultation_fee, waiting_time, working_hours, whatsapp_phone, image_url FROM pharmacies WHERE doctor_id = $1', [doctor.id])).rows; res.json({ ...doctor, facilities }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.get('/api/public/settings', async (req, res) => { try { res.json((await pool.query("SELECT value FROM settings WHERE key = 'footer'")).rows[0]?.value || {}); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.get('/api/public/products', async (req, res) => { try { res.json((await pool.query(`SELECT p.*, ph.name as pharmacy_name, ph.whatsapp_phone FROM products p JOIN pharmacies ph ON p.pharmacy_id = ph.id WHERE ph.is_ecommerce_enabled = true ORDER BY p.id DESC`)).rows); } catch (err: any) { res.status(500).json({ error: err.message }); } });

app.post('/api/public/orders', async (req: any, res: any) => {
  const { pharmacy_id, customer_name, customer_phone, items, total_price, payment_method } = req.body;
  if (payment_method === 'wallet') {
    const token = req.cookies.token; if (!token) return res.status(401).json({ error: 'يجب تسجيل الدخول.' });
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const balance = parseFloat((await pool.query('SELECT wallet_balance FROM users WHERE id = $1', [decoded.id])).rows[0].wallet_balance);
      if (balance < parseFloat(total_price)) return res.status(400).json({ error: 'رصيد غير كافٍ.' });
      await pool.query('UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2', [total_price, decoded.id]);
    } catch(e) { return res.status(403).json({ error: 'جلستك انتهت.' }); }
  }
  try {
    for (const item of items) { await pool.query('UPDATE products SET quantity = quantity - $1 WHERE id = $2 AND quantity >= $1', [item.qty, item.product_id]); }
    await pool.query('INSERT INTO orders (pharmacy_id, customer_name, customer_phone, items, total_price) VALUES ($1, $2, $3, $4, $5)', [pharmacy_id, customer_name, customer_phone, JSON.stringify(items), total_price]);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// --- Auth Routes ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = (await pool.query('SELECT * FROM users WHERE email = $1', [email])).rows[0];
    if (user && user.password && bcrypt.compareSync(password, user.password)) {
      if (!user.is_active) return res.status(403).json({ error: 'حسابك قيد المراجعة.' });
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name, wallet_balance: user.wallet_balance }, JWT_SECRET, { expiresIn: '24h' });
      res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
      res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name, wallet_balance: user.wallet_balance } });
    } else { res.status(401).json({ error: 'بيانات غير صحيحة' }); }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, phone, role, activationKey } = req.body;
  try {
    let isActive = role === 'patient';
    if (!isActive && activationKey) {
      const keyCheck = await pool.query('SELECT * FROM activation_keys WHERE key = $1 AND is_used = false', [activationKey]);
      if (keyCheck.rows.length === 0) return res.status(400).json({ error: 'مفتاح التفعيل غير صحيح.' });
      isActive = true; await pool.query('UPDATE activation_keys SET is_used = true WHERE key = $1', [activationKey]); 
    }
    await pool.query(`INSERT INTO users (email, password, role, name, phone, pharmacy_limit, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [email, bcrypt.hashSync(password, 10), role, name, phone || null, 10, isActive]);
    res.json({ success: true, isActive });
  } catch (err: any) { res.status(err.code === '23505' ? 400 : 500).json({ error: err.code === '23505' ? 'البريد مستخدم!' : err.message }); }
});
app.post('/api/auth/logout', (req, res) => { res.clearCookie('token'); res.json({ message: 'تم تسجيل الخروج' }); });
app.get('/api/auth/me', authenticateToken, async (req: any, res) => { res.json({ user: (await pool.query('SELECT id, email, role, name, wallet_balance FROM users WHERE id = $1', [req.user.id])).rows[0] }); });
app.post('/api/auth/update-profile', authenticateToken, async (req: any, res) => {
  const { email, currentPassword, newPassword, name, phone, notes } = req.body; const userId = req.user.id;
  try {
    const user = (await pool.query('SELECT * FROM users WHERE id = $1', [userId])).rows[0];
    if ((newPassword || email !== user.email) && (!currentPassword || !user.password || !bcrypt.compareSync(currentPassword, user.password))) return res.status(401).json({ error: 'كلمة المرور الحالية غير صالحة' });
    if (newPassword) await pool.query('UPDATE users SET password = $1 WHERE id = $2', [bcrypt.hashSync(newPassword, 10), userId]);
    await pool.query('UPDATE users SET name=$1, phone=$2, notes=$3 WHERE id=$4', [name, phone, notes, userId]);
    res.json({ message: 'تم التحديث' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// --- Facilities & Products ---
app.get('/api/pharmacies', authenticateToken, async (req: any, res) => { try { res.json((await pool.query(req.user.role === 'admin' ? 'SELECT * FROM pharmacies ORDER BY id DESC' : 'SELECT * FROM pharmacies WHERE doctor_id = $1 ORDER BY id DESC', req.user.role === 'admin' ? [] : [req.user.id])).rows); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.patch('/api/pharmacies/:id/status', authenticateToken, async (req: any, res) => { try { await pool.query(req.user.role === 'admin' ? 'UPDATE pharmacies SET manual_status = $1 WHERE id = $2' : 'UPDATE pharmacies SET manual_status = $1 WHERE id = $2 AND doctor_id = $3', req.user.role === 'admin' ? [req.body.manual_status, req.params.id] : [req.body.manual_status, req.params.id, req.user.id]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.patch('/api/pharmacies/:id/ecommerce', authenticateToken, async (req: any, res) => { if (!SUPER_ADMINS.includes(req.user.email)) return res.status(403).json({ error: 'ممنوع' }); try { await pool.query('UPDATE pharmacies SET is_ecommerce_enabled = $1 WHERE id = $2', [req.body.is_ecommerce_enabled, req.params.id]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.post('/api/pharmacies', authenticateToken, async (req: any, res) => { const { name, address, phone, latitude, longitude, doctor_id, pharmacist_name, whatsapp_phone, image_url, type, working_hours, specialty, services, consultation_fee, waiting_time } = req.body; try { res.json({ id: (await pool.query(`INSERT INTO pharmacies (name, address, phone, latitude, longitude, created_by, doctor_id, pharmacist_name, whatsapp_phone, image_url, type, working_hours, manual_status, specialty, services, consultation_fee, waiting_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'auto', $13, $14, $15, $16) RETURNING id`, [name, address, phone, latitude, longitude, req.user.id, req.user.role === 'admin' ? (doctor_id || req.user.id) : req.user.id, pharmacist_name || null, whatsapp_phone || null, image_url || null, req.user.role === 'doctor' ? 'clinic' : (req.user.role === 'dentist' ? 'dental_clinic' : (req.user.role === 'pharmacist' ? 'pharmacy' : (type || 'pharmacy'))), working_hours || {}, specialty || null, services || null, consultation_fee || 0, waiting_time || '15 دقيقة'])).rows[0].id }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.put('/api/pharmacies/:id', authenticateToken, async (req: any, res) => { const { name, address, phone, latitude, longitude, doctor_id, pharmacist_name, whatsapp_phone, image_url, type, working_hours, specialty, services, consultation_fee, waiting_time } = req.body; try { let q = `UPDATE pharmacies SET name=$1, address=$2, phone=$3, latitude=$4, longitude=$5, pharmacist_name=$6, whatsapp_phone=$7, image_url=$8, working_hours=$9, specialty=$10, services=$11, consultation_fee=$12, waiting_time=$13`; let p = [name, address, phone, latitude, longitude, pharmacist_name || null, whatsapp_phone || null, image_url || null, working_hours || {}, specialty || null, services || null, consultation_fee || 0, waiting_time || '15 دقيقة']; if (req.user.role === 'admin') { q += `, doctor_id=$14, type=$15 WHERE id=$16`; p.push(doctor_id, type, req.params.id); } else { q += ` WHERE id=$14 AND doctor_id=$15`; p.push(req.params.id, req.user.id); } await pool.query(q, p); res.json({ message: 'تم' }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.delete('/api/pharmacies/:id', authenticateToken, async (req: any, res) => { try { await pool.query('DELETE FROM products WHERE pharmacy_id = $1', [req.params.id]); await pool.query('DELETE FROM pharmacies WHERE id = $1', [req.params.id]); res.json({ message: 'تم' }); } catch (err: any) { res.status(500).json({ error: err.message }); } });

app.get('/api/products', authenticateToken, async (req: any, res) => { try { res.json((await pool.query(req.user.role === 'admin' ? 'SELECT p.*, ph.name as pharmacy_name FROM products p JOIN pharmacies ph ON p.pharmacy_id = ph.id ORDER BY p.id DESC' : 'SELECT p.*, ph.name as pharmacy_name FROM products p JOIN pharmacies ph ON p.pharmacy_id = ph.id WHERE ph.doctor_id = $1 ORDER BY p.id DESC', req.user.role === 'admin' ? [] : [req.user.id])).rows); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.post('/api/products', authenticateToken, async (req: any, res) => { const { pharmacy_id, name, price, quantity, image_url, max_per_user } = req.body; try { await pool.query('INSERT INTO products (pharmacy_id, name, price, quantity, image_url, max_per_user) VALUES ($1, $2, $3, $4, $5, $6)', [pharmacy_id, name, price, quantity, image_url || null, max_per_user || null]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.put('/api/products/:id', authenticateToken, async (req: any, res) => { const { name, price, quantity, image_url, max_per_user } = req.body; try { await pool.query('UPDATE products SET name = $1, price = $2, quantity = $3, image_url = $4, max_per_user = $5 WHERE id = $6', [name, price, quantity, image_url || null, max_per_user || null, req.params.id]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.delete('/api/products/:id', authenticateToken, async (req: any, res) => { try { await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); } });

// --- Orders Management (With Auto-Delete) ---
app.get('/api/orders', authenticateToken, async (req: any, res) => { 
  try { 
    // الحذف التلقائي للطلبات القديمة جداً (أقدم من شهر)
    await pool.query("DELETE FROM orders WHERE status != 'pending' AND created_at < NOW() - INTERVAL '1 month'");
    res.json((await pool.query(req.user.role === 'admin' ? 'SELECT o.*, ph.name as pharmacy_name FROM orders o JOIN pharmacies ph ON o.pharmacy_id = ph.id ORDER BY o.id DESC' : 'SELECT o.*, ph.name as pharmacy_name FROM orders o JOIN pharmacies ph ON o.pharmacy_id = ph.id WHERE ph.doctor_id = $1 ORDER BY o.id DESC', req.user.role === 'admin' ? [] : [req.user.id])).rows); 
  } catch (err: any) { res.status(500).json({ error: err.message }); } 
});
app.patch('/api/orders/:id/status', authenticateToken, async (req: any, res) => { const { status } = req.body; try { const orderCheck = await pool.query('SELECT o.items, o.status FROM orders o WHERE o.id = $1', [req.params.id]); if (status === 'cancelled' && orderCheck.rows[0].status === 'pending') { const items = orderCheck.rows[0].items; for(const item of items) { await pool.query('UPDATE products SET quantity = quantity + $1 WHERE id = $2', [item.qty, item.product_id]); } } await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, req.params.id]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.delete('/api/orders/:id', authenticateToken, async (req: any, res) => { 
  if (!SUPER_ADMINS.includes(req.user.email)) return res.status(403).json({ error: 'ممنوع' });
  try { await pool.query('DELETE FROM orders WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// --- Wallet & User Admin ---
// 🟢 مسار استقبال طلبات المحفظة (شحن أو سحب) - النسخة المنيعة
app.post('/api/wallet/request', authenticateToken, async (req: any, res: any) => {
  const { type, amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'مبلغ غير صالح' });
  
  try {
    // التحقق من الرصيد في حالة السحب
    if (type === 'withdrawal') {
      const balance = parseFloat((await pool.query('SELECT wallet_balance FROM users WHERE id = $1', [req.user.id])).rows[0].wallet_balance);
      if (balance < amount) return res.status(400).json({ error: 'رصيد غير كافٍ للسحب' });
    }

    // 🟢 الحل الجذري: جلب بيانات المستخدم من الداتا بيز لتفادي التوكن القديم (undefined)
    const userDb = (await pool.query('SELECT name, email FROM users WHERE id = $1', [req.user.id])).rows[0];

    // إرسال الطلب بأمان تام
    await pool.query(
      'INSERT INTO wallet_requests (user_id, user_name, user_email, type, amount) VALUES ($1, $2, $3, $4, $5)', 
      [req.user.id, userDb.name || 'غير معروف', userDb.email || 'غير معروف', type, amount]
    );

    res.json({ success: true });
  } catch(err: any) { 
    // طباعة الخطأ الحقيقي في لوحة تحكم السيرفر (Vercel Logs)
    console.error("🔥 خطأ المحفظة الجذري:", err);
    res.status(500).json({ error: err.message || 'حدث خطأ في قاعدة البيانات.' }); 
  }
});
app.get('/api/admin/wallet-requests', authenticateToken, async (req: any, res) => {
  if (!SUPER_ADMINS.includes(req.user.email)) return res.status(403).json({ error: 'ممنوع' });
  try { res.json((await pool.query("SELECT * FROM wallet_requests ORDER BY id DESC")).rows); } catch(err: any) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/admin/wallet-requests/:id', authenticateToken, async (req: any, res) => {
  if (!SUPER_ADMINS.includes(req.user.email)) return res.status(403).json({ error: 'ممنوع' });
  const { action } = req.body; // 'approve' or 'reject'
  try {
    const request = (await pool.query('SELECT * FROM wallet_requests WHERE id = $1', [req.params.id])).rows[0];
    if (request.status !== 'pending') return res.status(400).json({ error: 'الطلب معالج مسبقاً' });
    if (action === 'approve') {
      const modifier = request.type === 'deposit' ? request.amount : -request.amount;
      await pool.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [modifier, request.user_id]);
      await pool.query("UPDATE wallet_requests SET status = 'approved' WHERE id = $1", [req.params.id]);
    } else {
      await pool.query("UPDATE wallet_requests SET status = 'rejected' WHERE id = $1", [req.params.id]);
    }
    res.json({ success: true });
  } catch(err: any) { res.status(500).json({ error: err.message }); }
});


app.post('/api/admin/wallet/:id', authenticateToken, async (req: any, res) => {
  if (!SUPER_ADMINS.includes(req.user.email)) return res.status(403).json({ error: 'ممنوع' });
  try { await pool.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [req.body.amount, req.params.id]); res.json({ success: true }); } catch(err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/users', authenticateToken, async (req: any, res) => { if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' }); res.json((await pool.query('SELECT id, email, role, name, pharmacy_limit, phone, notes, is_active, wallet_balance FROM users ORDER BY id DESC')).rows); });
app.patch('/api/admin/users/:id/approve', authenticateToken, async (req: any, res) => { if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' }); await pool.query('UPDATE users SET is_active = TRUE WHERE id = $1', [req.params.id]); res.json({ success: true }); });
app.post('/api/admin/users', authenticateToken, async (req: any, res) => { if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' }); const { email, password, role, name, pharmacy_limit, phone, notes } = req.body; if (role === 'admin' && !SUPER_ADMINS.includes(req.user.email)) return res.status(403).json({ error: 'ممنوع' }); try { res.json({ id: (await pool.query('INSERT INTO users (email, password, role, name, pharmacy_limit, phone, notes, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id', [email, bcrypt.hashSync(password, 10), role, name, pharmacy_limit || 10, phone || null, notes || null, true])).rows[0].id }); } catch (err) { res.status(400).json({ error: 'البريد مستخدم' }); } });

// تم إصلاح مشكلة تعديل المستخدمين هنا
app.put('/api/admin/users/:id', authenticateToken, async (req: any, res) => { 
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' }); 
  const { email, password, role, name, pharmacy_limit, phone, notes } = req.body; 
  try { 
    const targetUser = (await pool.query('SELECT email FROM users WHERE id = $1', [req.params.id])).rows[0]; 
    if (SUPER_ADMINS.includes(targetUser.email) && req.user.email !== targetUser.email) return res.status(403).json({ error: 'لا يمكنك تعديل هذا الحساب' }); 
    if (password && password.trim() !== '') {
      await pool.query('UPDATE users SET email=$1, password=$2, role=$3, name=$4, pharmacy_limit=$5, phone=$6, notes=$7 WHERE id=$8', [email, bcrypt.hashSync(password, 10), role, name, pharmacy_limit || 10, phone || null, notes || null, req.params.id]); 
    } else { 
      await pool.query('UPDATE users SET email=$1, role=$2, name=$3, pharmacy_limit=$4, phone=$5, notes=$6 WHERE id=$7', [email, role, name, pharmacy_limit || 10, phone || null, notes || null, req.params.id]); 
    }
    res.json({ success: true }); 
  } catch (err: any) { res.status(500).json({ error: err.message }); } 
});

app.delete('/api/admin/users/:id', authenticateToken, async (req: any, res) => { if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' }); await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]); res.json({ success: true }); });
app.put('/api/admin/settings', authenticateToken, async (req: any, res) => { if (req.user.role !== 'admin' || !SUPER_ADMINS.includes(req.user.email)) return res.status(403).json({ error: 'ممنوع' }); await pool.query("INSERT INTO settings (key, value) VALUES ('footer', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [req.body]); res.json({ success: true }); });
app.post('/api/admin/generate-key', authenticateToken, async (req: any, res) => { if (!SUPER_ADMINS.includes(req.user.email)) return res.status(403).json({ error: 'ممنوع' }); const newKey = Math.random().toString(36).substring(2, 10).toUpperCase(); await pool.query('INSERT INTO activation_keys (key) VALUES ($1)', [newKey]); res.json({ key: newKey }); });

export default app;