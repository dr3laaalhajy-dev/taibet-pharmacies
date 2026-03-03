import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import cors from 'cors';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. تعريف التطبيق (حل خطأ Cannot find name 'app')
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'pharmacy-secret-key';

// إعداد الاتصال بقاعدة البيانات
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 2. دالة تهيئة قاعدة البيانات (تم تصحيح الأقواس هنا)
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'doctor', 'pharmacist')),
        name TEXT NOT NULL,
        phone TEXT,
        notes TEXT,
        pharmacy_limit INTEGER DEFAULT 10
      );

      CREATE TABLE IF NOT EXISTS pharmacies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        phone TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        pharmacist_name TEXT,
        whatsapp_phone TEXT,
        image_url TEXT,
        created_by INTEGER REFERENCES users(id),
        doctor_id INTEGER REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS roster (
        id SERIAL PRIMARY KEY,
        pharmacy_id INTEGER NOT NULL REFERENCES pharmacies(id),
        duty_date TEXT NOT NULL,
        notes TEXT
      );
    `);

    const adminCheck = await pool.query('SELECT * FROM users WHERE role = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      await pool.query(
        'INSERT INTO users (email, password, role, name) VALUES ($1, $2, $3, $4)',
        ['admin@pharmaduty.com', hashedPassword, 'admin', 'مدير النظام']
      );
      console.log('✅ Admin user created');
    }
    console.log('✅ Database initialized');
  } catch (err) {
    console.error('❌ Database error:', err);
  }
}

// تشغيل التهيئة
initDB();

// الإعدادات العامة
app.use(express.json());
app.use(cookieParser());
app.use(cors());

// Middleware للتحقق من التوكن
const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'غير مصرح' });
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'ممنوع' });
    req.user = user;
    next();
  });
};

// --- API Routes ---
// إضافة مستخدم جديد (للمدير فقط)
app.post('/api/admin/users', authenticateToken, async (req: any, res: any) => {
  // التأكد من أن الشخص الذي يضيف هو المدير
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'غير مصرح لك بإضافة مستخدمين' });
  }

  const { email, password, role, name, phone, notes, pharmacy_limit } = req.body;
  
  try {
    // تشفير كلمة المرور قبل حفظها
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    // إدخال البيانات في قاعدة بيانات Neon
    const result = await pool.query(
      `INSERT INTO users (email, password, role, name, phone, notes, pharmacy_limit) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, role, name`,
      [email, hashedPassword, role, name, phone, notes, pharmacy_limit || 10]
    );
    
    res.json(result.rows[0]); // إرسال رسالة نجاح للموقع
  } catch (err: any) {
    console.error('Error saving user:', err);
    // إذا كان الإيميل مكرر
    if (err.code === '23505') {
      res.status(400).json({ error: 'البريد الإلكتروني موجود مسبقاً!' });
    } else {
      res.status(500).json({ error: 'فشل في حفظ البيانات في قاعدة البيانات' });
    }
  }
});
app.get('/api/public/on-call', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const result = await pool.query(`
    SELECT p.*, r.duty_date, r.notes 
    FROM pharmacies p 
    JOIN roster r ON p.id = r.pharmacy_id 
    WHERE r.duty_date = $1
  `, [today]);
  res.json(result.rows);
});

app.get('/api/public/pharmacies', async (req, res) => {
  const result = await pool.query('SELECT * FROM pharmacies');
  res.json(result.rows);
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
    res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  } else {
    res.status(401).json({ error: 'بيانات غير صحيحة' });
  }
});

app.get('/api/auth/me', authenticateToken, (req: any, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// إدارة الصيدليات (كمثال)
app.get('/api/pharmacies', authenticateToken, async (req: any, res) => {
  const result = (req.user.role === 'admin') 
    ? await pool.query('SELECT * FROM pharmacies')
    : await pool.query('SELECT * FROM pharmacies WHERE doctor_id = $1', [req.user.id]);
  res.json(result.rows);
});

// --- إعدادات البيئة (Vercel vs Local) ---
// تصدير التطبيق لمنصة Vercel
export default app;