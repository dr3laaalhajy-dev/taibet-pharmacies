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

const SUPER_ADMINS = ['admin@pharmaduty.com', 'alaa@taiba.pharma.sy'];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'غير مصرح' });
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'ممنوع' });
    req.user = user;
    next();
  });
};

// --- API Routes (Public) ---
app.get('/api/public/facilities', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, type, address, phone, latitude, longitude, pharmacist_name, whatsapp_phone, image_url, working_hours, doctor_id, manual_status, specialty, is_ecommerce_enabled FROM pharmacies ORDER BY id DESC');
    res.json(result.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/public/doctors/:id', async (req, res) => {
  try {
    const doctorResult = await pool.query('SELECT id, name, email, role, phone, notes FROM users WHERE id = $1', [req.params.id]);
    const doctor = doctorResult.rows[0];
    if (!doctor) return res.status(404).json({ error: 'User not found' });
    const managedFacilities = await pool.query('SELECT id, name, type, address, phone, specialty FROM pharmacies WHERE doctor_id = $1', [doctor.id]);
    res.json({ ...doctor, facilities: managedFacilities.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/public/settings', async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'footer'");
    res.json(result.rows[0]?.value || {});
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// --- API Routes (E-Commerce Public) ---
// جلب المنتجات المتاحة للتسوق
app.get('/api/public/products', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, ph.name as pharmacy_name, ph.whatsapp_phone 
      FROM products p 
      JOIN pharmacies ph ON p.pharmacy_id = ph.id 
      WHERE ph.is_ecommerce_enabled = true
      ORDER BY p.id DESC
    `);
    res.json(result.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// --- API Routes (Auth) ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (user && user.password && bcrypt.compareSync(password, user.password)) {
      if (user.is_active === false) return res.status(403).json({ error: 'حسابك قيد المراجعة. يرجى انتظار موافقة الإدارة.' });
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
      res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
      res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name } });
    } else {
      res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, phone, role, activationKey } = req.body;
  try {
    let isActive = false;
    if (activationKey) {
      const keyCheck = await pool.query('SELECT * FROM activation_keys WHERE key = $1 AND is_used = false', [activationKey]);
      if (keyCheck.rows.length === 0) return res.status(400).json({ error: 'مفتاح التفعيل غير صحيح أو تم استخدامه مسبقاً.' });
      isActive = true; 
      await pool.query('UPDATE activation_keys SET is_used = true WHERE key = $1', [activationKey]); 
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    await pool.query(`INSERT INTO users (email, password, role, name, phone, pharmacy_limit, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [email, hashedPassword, role, name, phone || null, 10, isActive]);
    res.json({ success: true, isActive });
  } catch (err: any) {
    if (err.code === '23505') res.status(400).json({ error: 'البريد الإلكتروني مستخدم بالفعل!' });
    else res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => { res.clearCookie('token'); res.json({ message: 'تم تسجيل الخروج' }); });
app.get('/api/auth/me', authenticateToken, (req: any, res) => res.json({ user: req.user }));

app.post('/api/auth/update-profile', authenticateToken, async (req: any, res) => {
  const { email, currentPassword, newPassword, name, phone, notes } = req.body;
  const userId = req.user.id;
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    if (newPassword || email !== user.email) { if (!currentPassword || !user.password || !bcrypt.compareSync(currentPassword, user.password)) return res.status(401).json({ error: 'كلمة المرور الحالية غير صالحة' }); }
    if (newPassword) { const hashedNewPassword = bcrypt.hashSync(newPassword, 10); await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNewPassword, userId]); }
    if (name) await pool.query('UPDATE users SET name = $1 WHERE id = $2', [name, userId]);
    if (phone !== undefined) await pool.query('UPDATE users SET phone = $1 WHERE id = $2', [phone, userId]);
    if (notes !== undefined) await pool.query('UPDATE users SET notes = $1 WHERE id = $2', [notes, userId]);
    res.json({ message: 'تم تحديث الملف الشخصي' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// --- API Routes (Facilities) ---
app.get('/api/pharmacies', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role === 'admin') res.json((await pool.query('SELECT * FROM pharmacies ORDER BY id DESC')).rows);
    else res.json((await pool.query('SELECT * FROM pharmacies WHERE doctor_id = $1 ORDER BY id DESC', [req.user.id])).rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/pharmacies/:id/status', authenticateToken, async (req: any, res) => {
  const { manual_status } = req.body;
  try {
    if (req.user.role === 'admin') await pool.query('UPDATE pharmacies SET manual_status = $1 WHERE id = $2', [manual_status, req.params.id]);
    else await pool.query('UPDATE pharmacies SET manual_status = $1 WHERE id = $2 AND doctor_id = $3', [manual_status, req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/pharmacies/:id/ecommerce', authenticateToken, async (req: any, res) => {
  if (!SUPER_ADMINS.includes(req.user.email)) return res.status(403).json({ error: 'ممنوع' });
  const { is_ecommerce_enabled } = req.body;
  try {
    await pool.query('UPDATE pharmacies SET is_ecommerce_enabled = $1 WHERE id = $2', [is_ecommerce_enabled, req.params.id]);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/pharmacies', authenticateToken, async (req: any, res) => {
  const { name, address, phone, latitude, longitude, doctor_id, pharmacist_name, whatsapp_phone, image_url, type, working_hours, specialty } = req.body;
  const assignedDoctorId = req.user.role === 'admin' ? (doctor_id || req.user.id) : req.user.id;
  const facilityType = req.user.role === 'doctor' ? 'clinic' : (req.user.role === 'pharmacist' ? 'pharmacy' : (type || 'pharmacy'));
  try {
    const userLimitQuery = await pool.query('SELECT pharmacy_limit FROM users WHERE id = $1', [assignedDoctorId]);
    const currentCountQuery = await pool.query('SELECT count(*) FROM pharmacies WHERE doctor_id = $1', [assignedDoctorId]);
    if (userLimitQuery.rows.length > 0 && currentCountQuery.rows.length > 0) {
      const limit = parseInt(userLimitQuery.rows[0].pharmacy_limit || 10);
      const currentCount = parseInt(currentCountQuery.rows[0].count);
      if (currentCount >= limit) return res.status(403).json({ error: `عذراً، لقد تجاوزت الحد الأقصى المسموح لك (${limit} منشآت).` });
    }
    const result = await pool.query(
      `INSERT INTO pharmacies (name, address, phone, latitude, longitude, created_by, doctor_id, pharmacist_name, whatsapp_phone, image_url, type, working_hours, manual_status, specialty) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'auto', $13) RETURNING id`,
      [name, address, phone, latitude, longitude, req.user.id, assignedDoctorId, pharmacist_name || null, whatsapp_phone || null, image_url || null, facilityType, working_hours || {}, specialty || null]
    );
    res.json({ id: result.rows[0].id });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.put('/api/pharmacies/:id', authenticateToken, async (req: any, res) => {
  const { name, address, phone, latitude, longitude, doctor_id, pharmacist_name, whatsapp_phone, image_url, type, working_hours, specialty } = req.body;
  try {
    let updateQuery = `UPDATE pharmacies SET name = $1, address = $2, phone = $3, latitude = $4, longitude = $5, pharmacist_name = $6, whatsapp_phone = $7, image_url = $8, working_hours = $9, specialty = $10`;
    let params = [name, address, phone, latitude, longitude, pharmacist_name || null, whatsapp_phone || null, image_url || null, working_hours || {}, specialty || null];
    if (req.user.role === 'admin') { updateQuery += `, doctor_id = $11, type = $12 WHERE id = $13`; params.push(doctor_id, type, req.params.id); } 
    else { updateQuery += ` WHERE id = $11 AND doctor_id = $12`; params.push(req.params.id, req.user.id); }
    await pool.query(updateQuery, params); res.json({ message: 'تم التحديث' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/pharmacies/:id', authenticateToken, async (req: any, res) => {
  try { await pool.query('DELETE FROM products WHERE pharmacy_id = $1', [req.params.id]); await pool.query('DELETE FROM pharmacies WHERE id = $1', [req.params.id]); res.json({ message: 'تم الحذف' }); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// --- API Routes (Products Management) ---
app.get('/api/products', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role === 'admin') {
      res.json((await pool.query('SELECT p.*, ph.name as pharmacy_name FROM products p JOIN pharmacies ph ON p.pharmacy_id = ph.id ORDER BY p.id DESC')).rows);
    } else {
      res.json((await pool.query('SELECT p.*, ph.name as pharmacy_name FROM products p JOIN pharmacies ph ON p.pharmacy_id = ph.id WHERE ph.doctor_id = $1 ORDER BY p.id DESC', [req.user.id])).rows);
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', authenticateToken, async (req: any, res) => {
  const { pharmacy_id, name, price, quantity, image_url } = req.body;
  try {
    // التحقق من ملكية الصيدلية
    if (req.user.role !== 'admin') {
      const check = await pool.query('SELECT id FROM pharmacies WHERE id = $1 AND doctor_id = $2', [pharmacy_id, req.user.id]);
      if (check.rows.length === 0) return res.status(403).json({ error: 'لا تملك صلاحية الإضافة لهذه الصيدلية' });
    }
    await pool.query('INSERT INTO products (pharmacy_id, name, price, quantity, image_url) VALUES ($1, $2, $3, $4, $5)', [pharmacy_id, name, price, quantity, image_url || null]);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.put('/api/products/:id', authenticateToken, async (req: any, res) => {
  const { name, price, quantity, image_url } = req.body;
  try {
    if (req.user.role !== 'admin') {
      const check = await pool.query('SELECT p.id FROM products p JOIN pharmacies ph ON p.pharmacy_id = ph.id WHERE p.id = $1 AND ph.doctor_id = $2', [req.params.id, req.user.id]);
      if (check.rows.length === 0) return res.status(403).json({ error: 'ممنوع' });
    }
    await pool.query('UPDATE products SET name = $1, price = $2, quantity = $3, image_url = $4 WHERE id = $5', [name, price, quantity, image_url || null, req.params.id]);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== 'admin') {
      const check = await pool.query('SELECT p.id FROM products p JOIN pharmacies ph ON p.pharmacy_id = ph.id WHERE p.id = $1 AND ph.doctor_id = $2', [req.params.id, req.user.id]);
      if (check.rows.length === 0) return res.status(403).json({ error: 'ممنوع' });
    }
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// --- API Routes (Admin Settings & Users) ---
app.get('/api/admin/users', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
  res.json((await pool.query('SELECT id, email, role, name, pharmacy_limit, phone, notes, is_active FROM users ORDER BY id DESC')).rows);
});
app.patch('/api/admin/users/:id/approve', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
  await pool.query('UPDATE users SET is_active = TRUE WHERE id = $1', [req.params.id]); res.json({ success: true });
});
app.post('/api/admin/users', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
  const { email, password, role, name, pharmacy_limit, phone, notes } = req.body;
  if (role === 'admin' && !SUPER_ADMINS.includes(req.user.email)) return res.status(403).json({ error: 'فقط المدير الرئيسي يمكنه تعيين مدراء جدد!' });
  const hashedPassword = bcrypt.hashSync(password, 10);
  try { res.json({ id: (await pool.query('INSERT INTO users (email, password, role, name, pharmacy_limit, phone, notes, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id', [email, hashedPassword, role, name, pharmacy_limit || 10, phone || null, notes || null, true])).rows[0].id }); } catch (err) { res.status(400).json({ error: 'البريد مستخدم' }); }
});
app.put('/api/admin/users/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
  const { email, password, role, name, pharmacy_limit, phone, notes } = req.body;
  try {
    const targetUser = (await pool.query('SELECT email, role FROM users WHERE id = $1', [req.params.id])).rows[0];
    if (SUPER_ADMINS.includes(targetUser.email) && req.user.email !== targetUser.email) return res.status(403).json({ error: 'ممنوع' });
    if (password) await pool.query('UPDATE users SET email=$1, password=$2, role=$3, name=$4, pharmacy_limit=$5, phone=$6, notes=$7 WHERE id=$8', [email, bcrypt.hashSync(password, 10), role, name, pharmacy_limit, phone, notes, req.params.id]);
    else await pool.query('UPDATE users SET email=$1, role=$2, name=$3, pharmacy_limit=$4, phone=$5, notes=$6 WHERE id=$7', [email, role, name, pharmacy_limit, phone, notes, req.params.id]);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/admin/users/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
  await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]); res.json({ success: true });
});
app.put('/api/admin/settings', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin' || !SUPER_ADMINS.includes(req.user.email)) return res.status(403).json({ error: 'ممنوع' });
  await pool.query("INSERT INTO settings (key, value) VALUES ('footer', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [req.body]); res.json({ success: true });
});
app.post('/api/admin/generate-key', authenticateToken, async (req: any, res) => {
  if (!SUPER_ADMINS.includes(req.user.email)) return res.status(403).json({ error: 'ممنوع' });
  const newKey = Math.random().toString(36).substring(2, 10).toUpperCase(); 
  await pool.query('INSERT INTO activation_keys (key) VALUES ($1)', [newKey]); res.json({ key: newKey });
});

export default app;