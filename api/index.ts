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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(cookieParser());
app.use(cors());

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
app.get('/api/public/on-call', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const onCall = await pool.query(`
      SELECT p.*, r.duty_date, r.notes 
      FROM pharmacies p JOIN roster r ON p.id = r.pharmacy_id 
      WHERE r.duty_date = $1
    `, [today]);
    res.json(onCall.rows);
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

app.get('/api/public/pharmacies', async (req, res) => {
  try {
    const pharmacies = await pool.query('SELECT id, name, address, phone, latitude, longitude, pharmacist_name, whatsapp_phone, image_url FROM pharmacies');
    res.json(pharmacies.rows);
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

app.get('/api/public/doctors/:id', async (req, res) => {
  try {
    const doctorResult = await pool.query('SELECT id, name, email, role, phone, notes FROM users WHERE id = $1 AND role IN ($2, $3)', [req.params.id, 'doctor', 'pharmacist']);
    const doctor = doctorResult.rows[0];
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    const managedPharmacies = await pool.query('SELECT id, name, address, phone FROM pharmacies WHERE doctor_id = $1', [doctor.id]);
    res.json({ ...doctor, pharmacies: managedPharmacies.rows });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

app.get('/api/public/roster', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;
  try {
    const roster = await pool.query(`
      SELECT p.name as pharmacy_name, p.address, p.phone as pharmacy_phone, r.duty_date, r.notes, u.name as creator_name, u.phone as creator_phone, u.id as creator_id
      FROM pharmacies p JOIN roster r ON p.id = r.pharmacy_id LEFT JOIN users u ON p.created_by = u.id
      ORDER BY r.duty_date ASC LIMIT $1 OFFSET $2
    `, [limit, offset]);
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM roster');
    res.json({ data: roster.rows, total: parseInt(totalResult.rows[0].count), page, limit });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

// --- API Routes (Auth & Profile) ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (user && bcrypt.compareSync(password, user.password)) {
      if (user.is_active === false) {
        return res.status(403).json({ error: 'حسابك قيد المراجعة. يرجى انتظار موافقة الإدارة.' });
      }
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
      res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
      res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name } });
    } else {
      res.status(401).json({ error: 'بيانات الاعتماد غير صالحة' });
    }
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// مسار التسجيل الجديد (إنشاء حساب)
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, phone, role } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    // إدخال الحساب كـ غير مفعل (is_active = false)
    await pool.query(
      `INSERT INTO users (email, password, role, name, phone, pharmacy_limit, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [email, hashedPassword, role, name, phone || null, 10, false]
    );
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === '23505') res.status(400).json({ error: 'البريد الإلكتروني مستخدم بالفعل!' });
    else res.status(500).json({ error: 'حدث خطأ أثناء التسجيل' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'تم تسجيل الخروج' });
});

app.get('/api/auth/me', authenticateToken, (req: any, res) => res.json({ user: req.user }));

app.post('/api/auth/update-profile', authenticateToken, async (req: any, res) => {
  const { email, currentPassword, newPassword, name, phone, notes } = req.body;
  const userId = req.user.id;
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    if (newPassword || email !== user.email) {
      if (!currentPassword || !bcrypt.compareSync(currentPassword, user.password)) return res.status(401).json({ error: 'كلمة المرور الحالية غير صالحة' });
    }
    if (newPassword) {
      const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
      await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNewPassword, userId]);
    }
    if (name) await pool.query('UPDATE users SET name = $1 WHERE id = $2', [name, userId]);
    if (phone !== undefined) await pool.query('UPDATE users SET phone = $1 WHERE id = $2', [phone, userId]);
    if (notes !== undefined) await pool.query('UPDATE users SET notes = $1 WHERE id = $2', [notes, userId]);
    res.json({ message: 'تم تحديث الملف الشخصي' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// --- API Routes (Pharmacies & Roster) ---
app.get('/api/pharmacies', authenticateToken, async (req: any, res) => {
  try {
    let pharmacies = req.user.role === 'admin' 
      ? await pool.query('SELECT * FROM pharmacies') 
      : await pool.query('SELECT * FROM pharmacies WHERE doctor_id = $1', [req.user.id]);
    res.json(pharmacies.rows);
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

app.post('/api/pharmacies', authenticateToken, async (req: any, res) => {
  const { name, address, phone, latitude, longitude, doctor_id, pharmacist_name, whatsapp_phone, image_url } = req.body;
  const assignedDoctorId = req.user.role === 'admin' ? (doctor_id || req.user.id) : req.user.id;
  try {
    const result = await pool.query(
      `INSERT INTO pharmacies (name, address, phone, latitude, longitude, created_by, doctor_id, pharmacist_name, whatsapp_phone, image_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [name, address, phone, latitude, longitude, req.user.id, assignedDoctorId, pharmacist_name || null, whatsapp_phone || null, image_url || null]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

app.put('/api/pharmacies/:id', authenticateToken, async (req: any, res) => {
  const { name, address, phone, latitude, longitude, doctor_id, pharmacist_name, whatsapp_phone, image_url } = req.body;
  try {
    await pool.query(
      `UPDATE pharmacies SET name = $1, address = $2, phone = $3, latitude = $4, longitude = $5, doctor_id = $6, pharmacist_name = $7, whatsapp_phone = $8, image_url = $9 WHERE id = $10`,
      [name, address, phone, latitude, longitude, doctor_id, pharmacist_name || null, whatsapp_phone || null, image_url || null, req.params.id]
    );
    res.json({ message: 'تم التحديث' });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

app.delete('/api/pharmacies/:id', authenticateToken, async (req: any, res) => {
  try {
    await pool.query('DELETE FROM pharmacies WHERE id = $1', [req.params.id]);
    res.json({ message: 'تم الحذف' });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

app.get('/api/roster', authenticateToken, async (req: any, res) => {
  try {
    let roster = req.user.role === 'admin'
      ? await pool.query('SELECT r.*, p.name as pharmacy_name FROM roster r JOIN pharmacies p ON r.pharmacy_id = p.id ORDER BY r.duty_date ASC')
      : await pool.query('SELECT r.*, p.name as pharmacy_name FROM roster r JOIN pharmacies p ON r.pharmacy_id = p.id WHERE p.doctor_id = $1 ORDER BY r.duty_date ASC', [req.user.id]);
    res.json(roster.rows);
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

app.post('/api/roster', authenticateToken, async (req: any, res) => {
  const { pharmacy_id, duty_date, notes } = req.body;
  try {
    await pool.query('INSERT INTO roster (pharmacy_id, duty_date, notes) VALUES ($1, $2, $3)', [pharmacy_id, duty_date, notes]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

app.put('/api/roster/:id', authenticateToken, async (req: any, res) => {
  const { pharmacy_id, duty_date, notes } = req.body;
  try {
    await pool.query('UPDATE roster SET pharmacy_id = $1, duty_date = $2, notes = $3 WHERE id = $4', [pharmacy_id, duty_date, notes, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

app.delete('/api/roster/:id', authenticateToken, async (req: any, res) => {
  try {
    await pool.query('DELETE FROM roster WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

// --- API Routes (Admin Users) ---
app.get('/api/admin/users', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
  try {
    const users = await pool.query('SELECT id, email, role, name, pharmacy_limit, phone, notes, is_active FROM users ORDER BY id DESC');
    res.json(users.rows);
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

// مسار للأدمن لتفعيل الحساب
app.patch('/api/admin/users/:id/approve', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
  try {
    await pool.query('UPDATE users SET is_active = TRUE WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

app.post('/api/admin/users', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
  const { email, password, role, name, pharmacy_limit, phone, notes } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  try {
    const result = await pool.query(
      'INSERT INTO users (email, password, role, name, pharmacy_limit, phone, notes, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [email, hashedPassword, role, name, pharmacy_limit || 10, phone || null, notes || null, true] // حسابات الأدمن مفعلة تلقائياً
    );
    res.json({ id: result.rows[0].id });
  } catch (err: any) { res.status(400).json({ error: 'البريد الإلكتروني موجود بالفعل' }); }
});

app.put('/api/admin/users/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
  const { email, password, role, name, pharmacy_limit, phone, notes } = req.body;
  try {
    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      await pool.query(
        'UPDATE users SET email = $1, password = $2, role = $3, name = $4, pharmacy_limit = $5, phone = $6, notes = $7 WHERE id = $8',
        [email, hashedPassword, role, name, pharmacy_limit, phone || null, notes || null, req.params.id]
      );
    } else {
      await pool.query(
        'UPDATE users SET email = $1, role = $2, name = $3, pharmacy_limit = $4, phone = $5, notes = $6 WHERE id = $7',
        [email, role, name, pharmacy_limit, phone || null, notes || null, req.params.id]
      );
    }
    res.json({ message: 'تم تحديث المستخدم' });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

app.delete('/api/admin/users/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'لا يمكنك حذف نفسك' });
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'تم حذف المستخدم' });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

export default app;