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
  connectionString: process.env.DATABASE_URL?.replace('?sslmode=require', ''),
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
    const result = await pool.query('SELECT id, name, type, address, phone, latitude, longitude, pharmacist_name, whatsapp_phone, image_url, working_hours, doctor_id FROM pharmacies ORDER BY id DESC');
    res.json(result.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/public/doctors/:id', async (req, res) => {
  try {
    const doctorResult = await pool.query('SELECT id, name, email, role, phone, notes FROM users WHERE id = $1', [req.params.id]);
    const doctor = doctorResult.rows[0];
    if (!doctor) return res.status(404).json({ error: 'User not found' });
    const managedFacilities = await pool.query('SELECT id, name, type, address, phone FROM pharmacies WHERE doctor_id = $1', [doctor.id]);
    res.json({ ...doctor, facilities: managedFacilities.rows });
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
  const { email, password, name, phone, role } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    await pool.query(
      `INSERT INTO users (email, password, role, name, phone, pharmacy_limit, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [email, hashedPassword, role, name, phone || null, 10, false]
    );
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === '23505') res.status(400).json({ error: 'البريد الإلكتروني مستخدم بالفعل!' });
    else res.status(500).json({ error: err.message });
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
      if (!currentPassword || !user.password || !bcrypt.compareSync(currentPassword, user.password)) return res.status(401).json({ error: 'كلمة المرور الحالية غير صالحة' });
    }
    if (newPassword) {
      const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
      await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNewPassword, userId]);
    }
    if (name) await pool.query('UPDATE users SET name = $1 WHERE id = $2', [name, userId]);
    if (phone !== undefined) await pool.query('UPDATE users SET phone = $1 WHERE id = $2', [phone, userId]);
    if (notes !== undefined) await pool.query('UPDATE users SET notes = $1 WHERE id = $2', [notes, userId]);
    res.json({ message: 'تم تحديث الملف الشخصي' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// --- API Routes (Facilities Management) ---
app.get('/api/pharmacies', authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role === 'admin') {
      const result = await pool.query('SELECT * FROM pharmacies ORDER BY id DESC');
      res.json(result.rows);
    } else {
      const result = await pool.query('SELECT * FROM pharmacies WHERE doctor_id = $1 ORDER BY id DESC', [req.user.id]);
      res.json(result.rows);
    }
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/pharmacies', authenticateToken, async (req: any, res) => {
  const { name, address, phone, latitude, longitude, doctor_id, pharmacist_name, whatsapp_phone, image_url, type, working_hours } = req.body;
  const assignedDoctorId = req.user.role === 'admin' ? (doctor_id || req.user.id) : req.user.id;
  const facilityType = req.user.role === 'doctor' ? 'clinic' : (req.user.role === 'pharmacist' ? 'pharmacy' : (type || 'pharmacy'));
  
  try {
    // --- التحقق من الحد الأقصى للمنشآت قبل الإضافة ---
    const userLimitQuery = await pool.query('SELECT pharmacy_limit FROM users WHERE id = $1', [assignedDoctorId]);
    const currentCountQuery = await pool.query('SELECT count(*) FROM pharmacies WHERE doctor_id = $1', [assignedDoctorId]);
    
    if (userLimitQuery.rows.length > 0 && currentCountQuery.rows.length > 0) {
      const limit = parseInt(userLimitQuery.rows[0].pharmacy_limit || 10);
      const currentCount = parseInt(currentCountQuery.rows[0].count);
      if (currentCount >= limit) {
        return res.status(403).json({ error: `عذراً، لقد تجاوزت الحد الأقصى المسموح لك (${limit} منشآت). يرجى التواصل مع الإدارة.` });
      }
    }
    // ------------------------------------------------

    const result = await pool.query(
      `INSERT INTO pharmacies (name, address, phone, latitude, longitude, created_by, doctor_id, pharmacist_name, whatsapp_phone, image_url, type, working_hours) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [name, address, phone, latitude, longitude, req.user.id, assignedDoctorId, pharmacist_name || null, whatsapp_phone || null, image_url || null, facilityType, working_hours || {}]
    );
    res.json({ id: result.rows[0].id });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.put('/api/pharmacies/:id', authenticateToken, async (req: any, res) => {
  const { name, address, phone, latitude, longitude, doctor_id, pharmacist_name, whatsapp_phone, image_url, type, working_hours } = req.body;
  try {
    let updateQuery = `UPDATE pharmacies SET name = $1, address = $2, phone = $3, latitude = $4, longitude = $5, pharmacist_name = $6, whatsapp_phone = $7, image_url = $8, working_hours = $9`;
    let params = [name, address, phone, latitude, longitude, pharmacist_name || null, whatsapp_phone || null, image_url || null, working_hours || {}];
    
    if (req.user.role === 'admin') {
      updateQuery += `, doctor_id = $10, type = $11 WHERE id = $12`;
      params.push(doctor_id, type, req.params.id);
    } else {
      updateQuery += ` WHERE id = $10 AND doctor_id = $11`;
      params.push(req.params.id, req.user.id);
    }

    await pool.query(updateQuery, params);
    res.json({ message: 'تم التحديث' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/pharmacies/:id', authenticateToken, async (req: any, res) => {
  try {
    await pool.query('DELETE FROM roster WHERE pharmacy_id = $1', [req.params.id]); 
    await pool.query('DELETE FROM pharmacies WHERE id = $1', [req.params.id]);
    res.json({ message: 'تم الحذف' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// --- API Routes (Admin Users) ---
app.get('/api/admin/users', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
  try {
    const users = await pool.query('SELECT id, email, role, name, pharmacy_limit, phone, notes, is_active FROM users ORDER BY id DESC');
    res.json(users.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/admin/users/:id/approve', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
  try {
    await pool.query('UPDATE users SET is_active = TRUE WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/users', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
  const { email, password, role, name, pharmacy_limit, phone, notes } = req.body;
  if (role === 'admin' && !SUPER_ADMINS.includes(req.user.email)) return res.status(403).json({ error: 'فقط المدير الرئيسي يمكنه تعيين مدراء جدد!' });

  const hashedPassword = bcrypt.hashSync(password, 10);
  try {
    const result = await pool.query(
      'INSERT INTO users (email, password, role, name, pharmacy_limit, phone, notes, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [email, hashedPassword, role, name, pharmacy_limit || 10, phone || null, notes || null, true]
    );
    res.json({ id: result.rows[0].id });
  } catch (err: any) { res.status(400).json({ error: 'البريد الإلكتروني موجود بالفعل' }); }
});

app.put('/api/admin/users/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
  const { email, password, role, name, pharmacy_limit, phone, notes } = req.body;
  try {
    const targetUser = (await pool.query('SELECT email, role FROM users WHERE id = $1', [req.params.id])).rows[0];
    if (!targetUser) return res.status(404).json({ error: 'المستخدم غير موجود' });
    if (SUPER_ADMINS.includes(targetUser.email) && req.user.email !== targetUser.email) return res.status(403).json({ error: 'لا تمتلك صلاحية لتعديل بيانات هذا المدير الرئيسي!' });
    if (role === 'admin' && targetUser.role !== 'admin' && !SUPER_ADMINS.includes(req.user.email)) return res.status(403).json({ error: 'فقط المدير الرئيسي يمكنه ترقية الحسابات إلى إدارة!' });

    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      await pool.query('UPDATE users SET email = $1, password = $2, role = $3, name = $4, pharmacy_limit = $5, phone = $6, notes = $7 WHERE id = $8', [email, hashedPassword, role, name, pharmacy_limit, phone || null, notes || null, req.params.id]);
    } else {
      await pool.query('UPDATE users SET email = $1, role = $2, name = $3, pharmacy_limit = $4, phone = $5, notes = $6 WHERE id = $7', [email, role, name, pharmacy_limit, phone || null, notes || null, req.params.id]);
    }
    res.json({ message: 'تم تحديث المستخدم' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/users/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'لا يمكنك حذف نفسك' });
  try {
    const targetUser = (await pool.query('SELECT email FROM users WHERE id = $1', [req.params.id])).rows[0];
    if (targetUser && SUPER_ADMINS.includes(targetUser.email)) return res.status(403).json({ error: 'لا يمكن حذف حساب المدير الرئيسي للنظام.' });
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'تم حذف المستخدم' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default app;