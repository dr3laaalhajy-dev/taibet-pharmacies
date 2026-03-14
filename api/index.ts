import 'dotenv/config';
import express from 'express';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

// تهيئة نظام إشعارات فايربيز
try {
  const serviceAccountPath = path.resolve(process.cwd(), 'firebase-key.json');
  if (fs.existsSync(serviceAccountPath)) {
    const fileContent = fs.readFileSync(serviceAccountPath, 'utf-8');
    const serviceAccount = JSON.parse(fileContent);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
} catch (error) { }

export const sendPushNotification = async (fcmToken: string, title: string, body: string) => {
  if (!fcmToken || admin.apps.length === 0) return;
  try {
    await admin.messaging().send({ token: fcmToken, notification: { title, body } });
  } catch (error) { }
};

const { Pool } = pg;
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'pharmacy-secret-key';

app.use(cors({ origin: true, credentials: true }));
app.use(helmet({ crossOriginResourcePolicy: false }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, message: { error: 'تم تجاوز الحد المسموح، يرجى المحاولة لاحقاً.' }, standardHeaders: true, legacyHeaders: false });
app.use('/api', limiter);
app.use(express.json());
app.use(cookieParser());

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const initDB = async () => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS super_admins (email VARCHAR(255) PRIMARY KEY)`);
    await pool.query(`INSERT INTO super_admins (email) VALUES ('alaa@taiba.pharma.sy'), ('admin@pharmaduty.com'), ('alaa3@taiba.dental.sy') ON CONFLICT DO NOTHING`);
    try { await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;`); } catch (e) { }
    try { await pool.query(`ALTER TABLE users ADD COLUMN fcm_token TEXT;`); } catch (e) { }
    try { await pool.query(`ALTER TABLE users ADD COLUMN specialty VARCHAR(255);`); } catch (e) { }
    try { await pool.query(`ALTER TABLE users ADD COLUMN consultation_price DECIMAL(10, 2) DEFAULT 0;`); } catch (e) { }
    try { await pool.query(`ALTER TABLE users ADD COLUMN about TEXT;`); } catch (e) { }
    try { await pool.query(`ALTER TABLE users ADD COLUMN faqs JSONB DEFAULT '[]';`); } catch (e) { }
    try { await pool.query(`ALTER TABLE users ADD COLUMN profile_picture TEXT;`); } catch (e) { }
    try { await pool.query(`ALTER TABLE users ADD COLUMN show_in_directory BOOLEAN DEFAULT true;`); } catch (e) { }
    try { await pool.query(`ALTER TABLE users ADD COLUMN daily_limit INTEGER DEFAULT 20;`); } catch (e) { }
    try { await pool.query(`ALTER TABLE users ADD COLUMN loyalty_points INTEGER DEFAULT 0;`); } catch (e) { }

    await pool.query(`CREATE TABLE IF NOT EXISTS doctor_reviews (id SERIAL PRIMARY KEY, doctor_id INTEGER REFERENCES users(id) ON DELETE CASCADE, patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE, rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), comment TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(doctor_id, patient_id));`);
    await pool.query(`CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, title VARCHAR(255) NOT NULL, message TEXT NOT NULL, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS appointments (id SERIAL PRIMARY KEY, patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE, doctor_id INTEGER REFERENCES users(id) ON DELETE CASCADE, facility_id INTEGER REFERENCES pharmacies(id) ON DELETE CASCADE, appointment_date DATE NOT NULL, status VARCHAR(50) DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(patient_id, doctor_id, appointment_date));`);
    try { await pool.query(`ALTER TABLE appointments ADD COLUMN attachments JSONB DEFAULT '[]';`); } catch (e) { }
    await pool.query(`CREATE TABLE IF NOT EXISTS conversations (id SERIAL PRIMARY KEY, user1_id INTEGER REFERENCES users(id) ON DELETE CASCADE, user2_id INTEGER REFERENCES users(id) ON DELETE CASCADE, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(user1_id, user2_id));`);
    try { await pool.query(`ALTER TABLE conversations ADD COLUMN status VARCHAR(50) DEFAULT 'active';`); } catch (e) { }
    try { await pool.query(`ALTER TABLE conversations ADD COLUMN type VARCHAR(50) DEFAULT 'direct';`); } catch (e) { }

    // 🟢 إزالة شرط التعارض لكي لا يحدث خطأ عند قبول المحادثة
    try { await pool.query(`ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_user1_id_user2_id_key;`); } catch (e) { }

    await pool.query(`CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE, sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE, content TEXT NOT NULL, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS family_members ( id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, name VARCHAR(255) NOT NULL, relation VARCHAR(100), birth_date DATE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP );`);
    await pool.query(`CREATE TABLE IF NOT EXISTS medical_records ( id SERIAL PRIMARY KEY, patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE, blood_type VARCHAR(10), allergies TEXT, chronic_diseases TEXT, past_surgeries TEXT, notes TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP );`);
    try { await pool.query(`ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS regular_medications TEXT;`); } catch (e) { }
    try { await pool.query(`ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS vaccinations TEXT;`); } catch (e) { }
    try { await pool.query(`ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS family_history TEXT;`); } catch (e) { }
    try { await pool.query(`ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS smoking_status VARCHAR(50);`); } catch (e) { }
    try { await pool.query(`ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS alcohol_status VARCHAR(50);`); } catch (e) { }
    try { await pool.query(`ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50);`); } catch (e) { }
    try { await pool.query(`ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS occupation VARCHAR(255);`); } catch (e) { }
    try { await pool.query(`ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';`); } catch (e) { }
    try { await pool.query(`ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS xray_urls JSONB DEFAULT '[]';`); } catch (e) { }
    try { await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS prescription_image_url TEXT;`); } catch (e) { }
    await pool.query(`CREATE TABLE IF NOT EXISTS prescriptions ( id SERIAL PRIMARY KEY, doctor_id INTEGER REFERENCES users(id) ON DELETE CASCADE, patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE, appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL, diagnosis TEXT, medicines JSONB NOT NULL, notes TEXT, status VARCHAR(50) DEFAULT 'active', dispensed_by INTEGER REFERENCES pharmacies(id) ON DELETE SET NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP );`);
    // 🟢 إضافة جدول تقييمات الدعم الفني
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_reviews (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        staff_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (e) { }
};
initDB();

const isSuperAdmin = async (email: string) => {
  const res = await pool.query('SELECT email FROM super_admins WHERE email = $1', [email]);
  return res.rows.length > 0 || email === 'admin@pharmaduty.com';
};

const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'غير مصرح' });
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'ممنوع' });
    req.user = user;
    next();
  });
};

app.post('/api/chat/support/request', authenticateToken, async (req: any, res: any) => {
  try {
    const patientId = req.user.id;
    const existing = await pool.query(`SELECT id, status FROM conversations WHERE user1_id = $1 AND type = 'support' AND status IN ('pending', 'active')`, [patientId]);
    let convId;
    if (existing.rows.length > 0) {
      if (existing.rows[0].status === 'pending') return res.status(400).json({ error: 'لديك طلب دعم فني قيد الانتظار بالفعل.' });
      convId = existing.rows[0].id;
    } else {
      const closed = await pool.query(`SELECT id FROM conversations WHERE user1_id = $1 AND type = 'support'`, [patientId]);
      if (closed.rows.length > 0) {
        await pool.query(`UPDATE conversations SET status = 'pending', user2_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [closed.rows[0].id]);
        convId = closed.rows[0].id;
      } else {
        const newConv = await pool.query(`INSERT INTO conversations (user1_id, user2_id, type, status) VALUES ($1, NULL, 'support', 'pending') RETURNING id`, [patientId]);
        convId = newConv.rows[0].id;
      }
    }
    res.json({ success: true, conversation_id: convId, message: 'تم إرسال طلبك لخدمة العملاء.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/chat/support/pending', authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'customer_service' && req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
  try {
    const pending = await pool.query(`SELECT c.id as conversation_id, c.updated_at as created_at, u.name as patient_name, u.profile_picture FROM conversations c JOIN users u ON c.user1_id = u.id WHERE c.type = 'support' AND c.status = 'pending' ORDER BY c.updated_at ASC`);
    res.json(pending.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/chat/support/accept/:id', authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'customer_service' && req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const conv = await client.query('SELECT status, user1_id FROM conversations WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (conv.rows.length === 0) throw new Error('الطلب غير موجود.');
    if (conv.rows[0].status !== 'pending') throw new Error('عذراً، تم قبول هذا الطلب مسبقاً من موظف آخر.');
    await client.query(`UPDATE conversations SET user2_id = $1, status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [req.user.id, req.params.id]);
    await client.query('COMMIT');
    res.json({ success: true, conversation_id: req.params.id });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally { client.release(); }
});

app.post('/api/chat/end/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const convId = req.params.id;
    const conv = await pool.query('SELECT * FROM conversations WHERE id = $1', [convId]);
    if (conv.rows.length === 0) return res.status(400).json({ error: 'المحادثة غير موجودة في قاعدة البيانات!' });
    const { user1_id, user2_id, type } = conv.rows[0];
    const currentUserId = String(req.user.id);
    const u1 = String(user1_id);
    const u2 = String(user2_id);

    if (currentUserId !== u1 && currentUserId !== u2 && req.user.role !== 'admin') {
      return res.status(400).json({ error: 'مرفوض: أنت لست طرفاً في هذه المحادثة' });
    }
    await pool.query('DELETE FROM messages WHERE conversation_id = $1', [convId]);
    await pool.query(`UPDATE conversations SET status = 'closed' WHERE id = $1`, [convId]);
    res.json({ success: true, message: 'تم إنهاء المحادثة بنجاح.' });
  } catch (err: any) {
    res.status(500).json({ error: 'خطأ برمجي: ' + err.message });
  }
});

app.post('/api/support/review', authenticateToken, async (req: any, res: any) => {
  const { staff_id, rating, comment } = req.body;
  try {
    await pool.query(
      'INSERT INTO support_reviews (patient_id, staff_id, rating, comment) VALUES ($1, $2, $3, $4)',
      [req.user.id, staff_id, rating, comment]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل حفظ التقييم: ' + err.message });
  }
});

app.get('/api/admin/staff-reviews', authenticateToken, async (req: any, res: any) => {
  if (!(await isSuperAdmin(req.user.email))) return res.status(403).json({ error: 'ممنوع' });
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.profile_picture,
             COALESCE(AVG(sr.rating), 0) as avg_rating,
             COUNT(sr.id) as reviews_count,
             json_agg(
               json_build_object('comment', sr.comment, 'rating', sr.rating, 'date', sr.created_at)
               ORDER BY sr.created_at DESC
             ) FILTER (WHERE sr.id IS NOT NULL) as comments
      FROM users u
      LEFT JOIN support_reviews sr ON u.id = sr.staff_id
      WHERE u.role IN ('support', 'admin', 'customer_service') OR u.email IN (SELECT email FROM super_admins)
      GROUP BY u.id
      HAVING COUNT(sr.id) > 0 OR u.role = 'customer_service'
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب التقييمات: ' + err.message });
  }
});

app.get('/api/chat/conversations', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id);
    const query = `
      SELECT c.id as conversation_id, c.type, c.status,
        CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END as other_user_id,
        u.name as other_user_name, u.role as other_user_role, u.profile_picture as other_user_image,
        (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != $1 AND m.is_read = false) as unread_count
      FROM conversations c
      LEFT JOIN users u ON u.id = CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END
      WHERE (c.user1_id = $1 OR c.user2_id = $1) AND c.status = 'active'
      ORDER BY c.updated_at DESC
    `;
    res.json((await pool.query(query, [userId])).rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/api/chat/messages/:otherUserId', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id);
    const otherId = parseInt(req.params.otherUserId);
    if (isNaN(otherId)) return res.json({ conversation_id: 0, messages: [] });

    let conv = await pool.query(`
      SELECT id, status FROM conversations 
      WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
      ORDER BY updated_at DESC LIMIT 1
    `, [userId, otherId]);

    if (conv.rows.length === 0 || conv.rows[0].status === 'closed') {
      return res.json({ conversation_id: conv.rows.length > 0 ? conv.rows[0].id : 0, messages: [], status: conv.rows.length > 0 ? conv.rows[0].status : 'closed' });
    }

    const convId = conv.rows[0].id;
    await pool.query('UPDATE messages SET is_read = true WHERE conversation_id = $1 AND sender_id = $2', [convId, otherId]);
    const messages = await pool.query('SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC', [convId]);
    res.json({ conversation_id: convId, messages: messages.rows, status: 'active' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/chat/messages', authenticateToken, async (req: any, res: any) => {
  try {
    const { receiver_id, content } = req.body;
    const sender_id = req.user.id;
    const numSender = parseInt(sender_id); const numReceiver = parseInt(receiver_id);
    if (isNaN(numReceiver)) return res.status(400).json({ error: 'معرف المستخدم غير صالح' });
    if (!content || !content.trim()) return res.status(400).json({ error: 'لا يمكن إرسال رسالة فارغة' });

    let conv = await pool.query(`
      SELECT id, status FROM conversations 
      WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
      ORDER BY updated_at DESC LIMIT 1
    `, [numSender, numReceiver]);

    if (conv.rows.length === 0) {
      const user1 = Math.min(numSender, numReceiver);
      const user2 = Math.max(numSender, numReceiver);
      conv = await pool.query(`INSERT INTO conversations (user1_id, user2_id, type, status) VALUES ($1, $2, 'direct', 'active') RETURNING id, status`, [user1, user2]);
    } else if (conv.rows[0].status === 'closed') {
      await pool.query(`UPDATE conversations SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [conv.rows[0].id]);
    }

    const convId = conv.rows[0].id;
    const newMsg = await pool.query('INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *', [convId, numSender, content]);
    await pool.query('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [convId]);

    res.json(newMsg.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// 🟢🟢 ====== بداية نظام السجل الطبي (النسخة النهائية) ====== 🟢🟢

// 1. مسار جلب البيانات (هذا ما كان ينقص الطبيب والمريض لكي يقرأوا البيانات)
app.get('/api/medical-records/:patientId', authenticateToken, async (req: any, res: any) => {
  try {
    const pId = parseInt(req.params.patientId);
    const record = await pool.query('SELECT * FROM medical_records WHERE patient_id = $1', [pId]);
    res.json(record.rows.length > 0 ? record.rows[0] : {});
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. مسار حفظ البيانات (محصن ضد كل أخطاء قواعد البيانات)
app.post('/api/medical-records', authenticateToken, async (req: any, res: any) => {
  const {
    patient_id, full_name, dob, gender, marital_status, children_count,
    occupation, special_habits, menstrual_history, past_medical_history,
    past_surgeries, allergies, family_history, medication_list, blood_type
  } = req.body;

  const pId = patient_id || req.user.id;
  const validDob = (dob === '' || !dob) ? null : dob;

  try {
    // التأكد من الجدول والأعمدة (الصيانة الذاتية)
    await pool.query(`CREATE TABLE IF NOT EXISTS medical_records (id SERIAL PRIMARY KEY, patient_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE)`);

    const columns = [
      'full_name VARCHAR(255)', 'dob DATE', 'age INT', 'gender VARCHAR(50)', 'marital_status VARCHAR(50)',
      'children_count INT', 'occupation VARCHAR(255)', 'special_habits TEXT', 'menstrual_history TEXT',
      'medication_list JSONB', 'past_medical_history TEXT', 'past_surgeries TEXT',
      'allergies TEXT', 'family_history TEXT', 'blood_type VARCHAR(50)', 'attachments JSONB',
      'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP', 'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
    ];
    for (let col of columns) {
      try { await pool.query(`ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS ${col};`); } catch (e) { }
    }

    // مسح النسخة المعلقة القديمة (لتجنب أي تضارب)
    await pool.query('DELETE FROM medical_records WHERE patient_id = $1', [pId]);

    // إدخال السجل النظيف الجديد
    const query = `
      INSERT INTO medical_records (
        patient_id, full_name, dob, gender, marital_status, children_count, 
        occupation, special_habits, menstrual_history, past_medical_history, 
        past_surgeries, allergies, family_history, medication_list, blood_type, attachments,
        created_at, updated_at
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
      RETURNING *`;

    const values = [
      pId, full_name || '', validDob, gender || '', marital_status || 'أعزب',
      children_count ? parseInt(children_count.toString()) : 0, occupation || '', special_habits || '', menstrual_history || '',
      past_medical_history || '', past_surgeries || '', allergies || '', family_history || '',
      JSON.stringify(medication_list || []), blood_type || '', JSON.stringify(req.body.attachments || [])
    ];

    const result = await pool.query(query, values);
    res.json({ success: true, record: result.rows[0] });

  } catch (err: any) {
    console.error("Medical Record Save Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 🟢 PATCH: patient updates specific fields (e.g. xray_urls)
app.patch('/api/medical-records/:id', authenticateToken, async (req: any, res: any) => {
  const patientId = parseInt(req.params.id);
  const updates = req.body; // e.g. { xray_urls: [...] }
  try {
    const setClauses = Object.keys(updates).map((key, i) => `${key} = $${i + 2}`);
    if (setClauses.length === 0) return res.json({ success: true });
    const values = [patientId, ...Object.values(updates).map(v => typeof v === 'object' ? JSON.stringify(v) : v)];
    await pool.query(
      `UPDATE medical_records SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE patient_id = $1`,
      values
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
// 🟢🟢 ====== نهاية نظام السجل الطبي ====== 🟢🟢

app.post('/api/prescriptions', authenticateToken, async (req: any, res: any) => { if (req.user.role !== 'doctor' && req.user.role !== 'dentist' && req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' }); const { patient_id, appointment_id, diagnosis, medicines, notes } = req.body; try { const result = await pool.query('INSERT INTO prescriptions (doctor_id, patient_id, appointment_id, diagnosis, medicines, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [req.user.id, patient_id, appointment_id || null, diagnosis, JSON.stringify(medicines), notes]); await pool.query('INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)', [patient_id, '📝 وصفة طبية جديدة', `قام طبيبك بإصدار وصفة طبية جديدة لك، يمكنك مراجعتها وصرفها الآن.`]); res.json({ success: true, prescription: result.rows }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.get('/api/prescriptions/patient/:patientId', authenticateToken, async (req: any, res: any) => { try { res.json((await pool.query(`SELECT p.*, d.name as doctor_name, d.specialty as doctor_specialty FROM prescriptions p JOIN users d ON p.doctor_id = d.id WHERE p.patient_id = $1 ORDER BY p.created_at DESC`, [req.params.patientId])).rows); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.get('/api/doctors/patient-history/:patientId', authenticateToken, async (req: any, res: any) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.created_at,
        p.diagnosis,
        p.medicines::text AS prescription,
        u.name AS doctor_name,
        u.specialty
      FROM prescriptions p
      JOIN users u ON p.doctor_id = u.id
      WHERE p.patient_id = $1
      ORDER BY p.created_at DESC
    `, [req.params.patientId]);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/public/facilities', async (req: any, res: any) => { try { res.json((await pool.query(`SELECT f.*, (SELECT COUNT(*) FROM appointments a WHERE a.facility_id = f.id AND a.status = 'waiting' AND a.appointment_date = CURRENT_DATE) as waiting_patients FROM pharmacies f ORDER BY f.id DESC`)).rows); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.get('/api/public/doctors', async (req: any, res: any) => { try { res.json((await pool.query(`SELECT u.id, u.name, u.email, u.role, u.phone, u.specialty, u.consultation_price, u.about, u.faqs, u.profile_picture, u.daily_limit, COALESCE(AVG(r.rating), 0) as average_rating, COUNT(r.id) as reviews_count FROM users u LEFT JOIN doctor_reviews r ON u.id = r.doctor_id WHERE u.role IN ('doctor', 'dentist') AND u.is_active = true AND u.show_in_directory = true GROUP BY u.id`)).rows); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.get('/api/public/doctors/:id', async (req: any, res: any) => { try { const doctor = (await pool.query(`SELECT u.id, u.name, u.email, u.role, u.phone, u.notes, u.specialty, u.consultation_price, u.about, u.faqs, u.profile_picture, u.daily_limit, COALESCE(AVG(r.rating), 0) as average_rating, COUNT(r.id) as reviews_count FROM users u LEFT JOIN doctor_reviews r ON u.id = r.doctor_id WHERE u.id = $1 GROUP BY u.id`, [req.params.id])).rows[0]; if (!doctor) return res.status(404).json({ error: 'User not found' }); const facilities = (await pool.query('SELECT id, name, type, address, phone, specialty, services, consultation_fee, waiting_time, working_hours, whatsapp_phone, image_url FROM pharmacies WHERE doctor_id = $1', [doctor.id])).rows; res.json({ ...doctor, facilities }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.post('/api/appointments/book', authenticateToken, async (req: any, res: any) => { const { doctor_id, facility_id, appointment_date } = req.body; const patient_id = req.user.id; try { await pool.query('INSERT INTO appointments (patient_id, doctor_id, facility_id, appointment_date) VALUES ($1, $2, $3, $4)', [patient_id, doctor_id, facility_id, appointment_date]); res.json({ success: true }); } catch (err: any) { res.status(err.code === '23505' ? 400 : 500).json({ error: err.code === '23505' ? 'حجزت مسبقاً.' : err.message }); } });
app.get('/api/appointments/doctor', authenticateToken, async (req: any, res: any) => { try { res.json((await pool.query(`SELECT a.*, p.name as patient_name, p.phone as patient_phone FROM appointments a JOIN users p ON a.patient_id = p.id WHERE a.doctor_id = $1 AND a.appointment_date = $2 ORDER BY a.created_at ASC`, [req.user.id, req.query.date])).rows); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.patch('/api/appointments/:id/status', authenticateToken, async (req: any, res: any) => { const { status } = req.body; try { await pool.query('UPDATE appointments SET status = $1 WHERE id = $2', [status, req.params.id]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.post('/api/public/doctors/:id/review', authenticateToken, async (req: any, res: any) => { const { rating, comment } = req.body; try { await pool.query(`INSERT INTO doctor_reviews (doctor_id, patient_id, rating, comment) VALUES ($1, $2, $3, $4) ON CONFLICT (doctor_id, patient_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = CURRENT_TIMESTAMP`, [req.params.id, req.user.id, rating, comment || null]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.get('/api/public/settings', async (req: any, res: any) => { try { res.json((await pool.query("SELECT value FROM settings WHERE key = 'footer'")).rows[0]?.value || {}); } catch (err: any) { res.status(500).json({ error: err.message }); } });

// 🟢 قسم المرفقات الطبية (أشعة وتحاليل)
app.patch('/api/appointments/:id/attachments', authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'doctor' && req.user.role !== 'dentist' && req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
  const { attachments } = req.body;
  try {
    await pool.query('UPDATE appointments SET attachments = $1 WHERE id = $2', [JSON.stringify(attachments || []), req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 🟢 الإحصائيات مع التصحيح [0]
app.get('/api/public/stats', async (req: any, res: any) => {
  try {
    const clinics = await pool.query(`SELECT COUNT(*) FROM pharmacies WHERE type = 'clinic'`);
    const dental = await pool.query(`SELECT COUNT(*) FROM pharmacies WHERE type = 'dental_clinic'`);
    const pharmacies = await pool.query(`SELECT COUNT(*) FROM pharmacies WHERE type = 'pharmacy'`);
    const bookings = await pool.query(`SELECT COUNT(*) FROM appointments`);
    const patients = await pool.query(`SELECT COUNT(*) FROM users WHERE role = 'patient'`);

    res.json({
      clinics: parseInt(clinics.rows[0]?.count || '0'),
      dental_clinics: parseInt(dental.rows[0]?.count || '0'),
      pharmacies: parseInt(pharmacies.rows[0]?.count || '0'),
      bookings: parseInt(bookings.rows[0]?.count || '0'),
      patients: parseInt(patients.rows[0]?.count || '0')
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/public/products', async (req: any, res: any) => { try { res.json((await pool.query(`SELECT p.*, ph.name as pharmacy_name, ph.whatsapp_phone FROM products p JOIN pharmacies ph ON p.pharmacy_id = ph.id WHERE ph.is_ecommerce_enabled = true ORDER BY p.id DESC`)).rows); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.post('/api/public/orders', async (req: any, res: any) => {
  const { pharmacy_id, customer_name, customer_phone, items, total_price, payment_method, delivery_address, prescription_image_url, status } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let buyerId = null;
    // Get buyer from token if available
    const token = req.cookies.token;
    if (token) { try { buyerId = (jwt.verify(token, JWT_SECRET) as any).id; } catch (e) {} }
    // Deduct wallet balance only for wallet payments
    if (payment_method === 'wallet') {
      if (!buyerId) throw new Error('AuthRequired');
      await client.query('UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2', [total_price, buyerId]);
    }
    // Only update product quantities for real products (product_id > 0)
    for (const item of items) {
      if (item.product_id && item.product_id > 0) {
        await client.query('UPDATE products SET quantity = quantity - $1 WHERE id = $2', [item.qty, item.product_id]);
      }
    }
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id INT;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS prescription_image_url TEXT;');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'pending\';');
    await client.query(
      'INSERT INTO orders (pharmacy_id, customer_name, customer_phone, items, total_price, user_id, delivery_address, prescription_image_url, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [pharmacy_id, customer_name, customer_phone, JSON.stringify(items), total_price, buyerId, delivery_address || null, prescription_image_url || null, status || 'pending']
    );
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});
app.get('/api/notifications', authenticateToken, async (req: any, res: any) => { try { res.json((await pool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20', [req.user.id])).rows); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.patch('/api/notifications/read', authenticateToken, async (req: any, res: any) => { try { await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE', [req.user.id]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'محاولات كثيرة.' } });
app.post('/api/auth/login', loginLimiter, async (req: any, res: any) => {
  const { email, password } = req.body;
  // 🟢 فلتر التنظيف: تحويل الإيميل لأحرف صغيرة وإزالة أي مسافات زائدة
  const cleanEmail = email ? email.toLowerCase().trim() : '';

  try {
    // 🟢 استخدمنا LOWER(email) لكي نطلب من قاعدة البيانات تجاهل الأحرف  الكبيرة أثناء البحث
    const user = (await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail])).rows[0];
    if (user && user.password && bcrypt.compareSync(password, user.password)) {
      if (!user.is_active) return res.status(403).json({ error: 'حسابك قيد المراجعة.' });
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name, wallet_balance: user.wallet_balance }, JWT_SECRET, { expiresIn: '24h' });
      res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
      res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name, wallet_balance: user.wallet_balance, loyalty_points: user.loyalty_points, profile_picture: user.profile_picture } });
    } else {
      res.status(401).json({ error: 'بيانات غير صحيحة' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/auth/register', async (req: any, res: any) => {
  const { email, password, name, phone, role, activationKey } = req.body;
  // 🟢 فلتر التنظيف هنا أيضاً لضمان الحفظ في قاعدة البيانات بشكل موحد
  const cleanEmail = email ? email.toLowerCase().trim() : '';

  try {
    let isActive = role === 'patient';
    if (!isActive && activationKey) {
      await pool.query('UPDATE activation_keys SET is_used = true WHERE key = $1', [activationKey]);
      isActive = true;
    }
    await pool.query(`INSERT INTO users (email, password, role, name, phone, pharmacy_limit, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [cleanEmail, bcrypt.hashSync(password, 10), role, name, phone || null, 10, isActive]);
    res.json({ success: true, isActive });
  } catch (err: any) {
    res.status(err.code === '23505' ? 400 : 500).json({ error: err.code === '23505' ? 'البريد مستخدم!' : err.message });
  }
});
app.post('/api/auth/logout', (req: any, res: any) => { res.clearCookie('token'); res.json({ message: 'تم تسجيل الخروج' }); });
app.get('/api/auth/me', authenticateToken, async (req: any, res: any) => { res.json({ user: (await pool.query('SELECT id, email, role, name, wallet_balance, loyalty_points, profile_picture FROM users WHERE id = $1', [req.user.id])).rows.shift() }); });

app.post('/api/auth/update-profile', authenticateToken, async (req: any, res: any) => {
  const { name, phone, notes, email, current_password, new_password } = req.body;
  try {
    // تحويل الإيميل لأحرف صغيرة دائماً
    const cleanEmail = email ? email.toLowerCase().trim() : req.user.email;

    // إذا كان المستخدم يريد تغيير كلمة المرور
    if (new_password && new_password.trim() !== '') {
      if (!current_password) {
        return res.status(400).json({ error: 'يجب إدخال كلمة المرور الحالية لتأكيد التغيير.' });
      }

      // جلب كلمة المرور المشفرة من قاعدة البيانات للمقارنة
      const userDb = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
      const isValidPassword = bcrypt.compareSync(current_password, userDb.rows[0].password);

      if (!isValidPassword) {
        return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة.' });
      }

      // تشفير كلمة المرور الجديدة
      const hashedNewPassword = bcrypt.hashSync(new_password, 10);
      await pool.query(
        'UPDATE users SET name=$1, phone=$2, notes=$3, email=$4, password=$5 WHERE id=$6',
        [name, phone, notes, cleanEmail, hashedNewPassword, req.user.id]
      );
    } else {
      // تحديث البيانات العادية بدون تغيير كلمة المرور
      await pool.query(
        'UPDATE users SET name=$1, phone=$2, notes=$3, email=$4 WHERE id=$5',
        [name, phone, notes, cleanEmail, req.user.id]
      );
    }

    res.json({ message: 'تم تحديث الملف الشخصي بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/user', authenticateToken, async (req: any, res: any) => {
  try {
    const { profile_picture } = req.body;
    if (!profile_picture) {
      return res.status(400).json({ error: 'لم يتم إرسال رابط الصورة' });
    }
    await pool.query(
      "UPDATE users SET profile_picture = $1 WHERE id = $2",
      [profile_picture, req.user.id]
    );
    res.json({ success: true, message: 'تم تحديث الصورة بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/doctor/update-profile', authenticateToken, async (req: any, res: any) => { const { specialty, consultation_price, about, faqs, show_in_directory, user_id, daily_limit } = req.body; try { await pool.query(`UPDATE users SET specialty = $1, consultation_price = $2, about = $3, faqs = $4, show_in_directory = $5, daily_limit = $6 WHERE id = $7`, [specialty, consultation_price, about, JSON.stringify(faqs || []), show_in_directory, daily_limit || 20, user_id || req.user.id]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.get('/api/pharmacies', authenticateToken, async (req: any, res: any) => { try { res.json((await pool.query(req.user.role === 'admin' ? 'SELECT * FROM pharmacies ORDER BY id DESC' : 'SELECT * FROM pharmacies WHERE doctor_id = $1 ORDER BY id DESC', req.user.role === 'admin' ? [] : [req.user.id])).rows); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.patch('/api/pharmacies/:id/status', authenticateToken, async (req: any, res: any) => { try { await pool.query(req.user.role === 'admin' ? 'UPDATE pharmacies SET manual_status = $1 WHERE id = $2' : 'UPDATE pharmacies SET manual_status = $1 WHERE id = $2 AND doctor_id = $3', req.user.role === 'admin' ? [req.body.manual_status, req.params.id] : [req.body.manual_status, req.params.id, req.user.id]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.patch('/api/pharmacies/:id/ecommerce', authenticateToken, async (req: any, res: any) => { if (!(await isSuperAdmin(req.user.email))) return res.status(403).json({ error: 'ممنوع' }); try { await pool.query('UPDATE pharmacies SET is_ecommerce_enabled = $1 WHERE id = $2', [req.body.is_ecommerce_enabled, req.params.id]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.post('/api/pharmacies', authenticateToken, async (req: any, res: any) => { const { name, address, phone, latitude, longitude, doctor_id, pharmacist_name, whatsapp_phone, image_url, type, working_hours, specialty, services, consultation_fee, waiting_time } = req.body; try { res.json({ id: (await pool.query(`INSERT INTO pharmacies (name, address, phone, latitude, longitude, created_by, doctor_id, pharmacist_name, whatsapp_phone, image_url, type, working_hours, manual_status, specialty, services, consultation_fee, waiting_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'auto', $13, $14, $15, $16) RETURNING id`, [name, address, phone, latitude, longitude, req.user.id, req.user.role === 'admin' ? (doctor_id || req.user.id) : req.user.id, pharmacist_name || null, whatsapp_phone || null, image_url || null, req.user.role === 'doctor' ? 'clinic' : (req.user.role === 'dentist' ? 'dental_clinic' : (req.user.role === 'pharmacist' ? 'pharmacy' : (type || 'pharmacy'))), working_hours || {}, specialty || null, services || null, consultation_fee || 0, waiting_time || '15 دقيقة'])).rows[0].id }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.put('/api/pharmacies/:id', authenticateToken, async (req: any, res: any) => { const { name, address, phone, latitude, longitude, doctor_id, pharmacist_name, whatsapp_phone, image_url, type, working_hours, specialty, services, consultation_fee, waiting_time } = req.body; try { let q = `UPDATE pharmacies SET name=$1, address=$2, phone=$3, latitude=$4, longitude=$5, pharmacist_name=$6, whatsapp_phone=$7, image_url=$8, working_hours=$9, specialty=$10, services=$11, consultation_fee=$12, waiting_time=$13`; let p = [name, address, phone, latitude, longitude, pharmacist_name || null, whatsapp_phone || null, image_url || null, working_hours || {}, specialty || null, services || null, consultation_fee || 0, waiting_time || '15 دقيقة']; if (req.user.role === 'admin') { q += `, doctor_id=$14, type=$15 WHERE id=$16`; p.push(doctor_id, type, req.params.id); } else { q += ` WHERE id=$14 AND doctor_id=$15`; p.push(req.params.id, req.user.id); } await pool.query(q, p); res.json({ message: 'تم' }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.delete('/api/pharmacies/:id', authenticateToken, async (req: any, res: any) => { try { await pool.query('DELETE FROM products WHERE pharmacy_id = $1', [req.params.id]); await pool.query('DELETE FROM pharmacies WHERE id = $1', [req.params.id]); res.json({ message: 'تم' }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.get('/api/products', authenticateToken, async (req: any, res: any) => { try { res.json((await pool.query(req.user.role === 'admin' ? 'SELECT p.*, ph.name as pharmacy_name FROM products p JOIN pharmacies ph ON p.pharmacy_id = ph.id ORDER BY p.id DESC' : 'SELECT p.*, ph.name as pharmacy_name FROM products p JOIN pharmacies ph ON p.pharmacy_id = ph.id WHERE ph.doctor_id = $1 ORDER BY p.id DESC', req.user.role === 'admin' ? [] : [req.user.id])).rows); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.post('/api/products', authenticateToken, async (req: any, res: any) => { const { pharmacy_id, name, price, quantity, image_url, max_per_user } = req.body; try { await pool.query('INSERT INTO products (pharmacy_id, name, price, quantity, image_url, max_per_user) VALUES ($1, $2, $3, $4, $5, $6)', [pharmacy_id, name, price, quantity, image_url || null, max_per_user || null]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.put('/api/products/:id', authenticateToken, async (req: any, res: any) => { const { name, price, quantity, image_url, max_per_user } = req.body; try { await pool.query('UPDATE products SET name = $1, price = $2, quantity = $3, image_url = $4, max_per_user = $5 WHERE id = $6', [name, price, quantity, image_url || null, max_per_user || null, req.params.id]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.delete('/api/products/:id', authenticateToken, async (req: any, res: any) => { try { await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.get('/api/orders', authenticateToken, async (req: any, res: any) => { try { await pool.query("DELETE FROM orders WHERE status != 'pending' AND created_at < NOW() - INTERVAL '1 month'"); res.json((await pool.query(req.user.role === 'admin' ? 'SELECT o.*, ph.name as pharmacy_name FROM orders o JOIN pharmacies ph ON o.pharmacy_id = ph.id ORDER BY o.id DESC' : 'SELECT o.*, ph.name as pharmacy_name FROM orders o JOIN pharmacies ph ON o.pharmacy_id = ph.id WHERE ph.doctor_id = $1 ORDER BY o.id DESC', req.user.role === 'admin' ? [] : [req.user.id])).rows); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.get('/api/patient/orders', authenticateToken, async (req: any, res: any) => {
  try {
    const userPhoneResult = await pool.query('SELECT phone FROM users WHERE id = $1', [req.user.id]);
    if (userPhoneResult.rows.length === 0) return res.json([]);
    const phone = userPhoneResult.rows[0].phone;
    if (!phone) return res.json([]);
    res.json((await pool.query('SELECT o.*, ph.name as pharmacy_name FROM orders o JOIN pharmacies ph ON o.pharmacy_id = ph.id WHERE o.customer_phone = $1 ORDER BY o.id DESC', [phone])).rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
app.patch('/api/orders/:id/status', authenticateToken, async (req: any, res: any) => { const { status } = req.body; try { await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, req.params.id]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.delete('/api/orders/:id', authenticateToken, async (req: any, res: any) => { if (!(await isSuperAdmin(req.user.email))) return res.status(403).json({ error: 'ممنوع' }); try { await pool.query('DELETE FROM orders WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.patch('/api/orders/:id/pricing', authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'pharmacist' && req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' });
  const { items, total_price, status } = req.body;
  try {
    await pool.query('UPDATE orders SET items = $1, total_price = $2, status = $3 WHERE id = $4', [JSON.stringify(items), total_price, status, req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/wallet/request', authenticateToken, async (req: any, res: any) => { const { type, amount } = req.body; try { await pool.query(`CREATE TABLE IF NOT EXISTS wallet_requests ( id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, user_name VARCHAR(255), user_email VARCHAR(255), type VARCHAR(50) NOT NULL, amount DECIMAL(10, 2) NOT NULL, status VARCHAR(50) DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP );`); const userDb = (await pool.query('SELECT name, email FROM users WHERE id = $1', [req.user.id])).rows.shift(); await pool.query('INSERT INTO wallet_requests (user_id, user_name, user_email, type, amount) VALUES ($1, $2, $3, $4, $5)', [req.user.id, userDb.name || 'غير معروف', userDb.email || 'غير معروف', type, amount]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.get('/api/admin/wallet-requests', authenticateToken, async (req: any, res: any) => { if (!(await isSuperAdmin(req.user.email))) return res.status(403).json({ error: 'ممنوع' }); try { res.json((await pool.query("SELECT * FROM wallet_requests ORDER BY id DESC")).rows); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.patch('/api/admin/wallet-requests/:id', authenticateToken, async (req: any, res: any) => { if (!(await isSuperAdmin(req.user.email))) return res.status(403).json({ error: 'ممنوع' }); const { action } = req.body; const client = await pool.connect(); try { await client.query('BEGIN'); const reqRes = await client.query('SELECT * FROM wallet_requests WHERE id = $1 FOR UPDATE', [req.params.id]); const request = reqRes.rows.shift(); if (action === 'approve') { const modifier = request.type === 'deposit' ? request.amount : -request.amount; await client.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [modifier, request.user_id]); await client.query("UPDATE wallet_requests SET status = 'approved' WHERE id = $1", [req.params.id]); } else { await client.query("UPDATE wallet_requests SET status = 'rejected' WHERE id = $1", [req.params.id]); } await client.query('COMMIT'); res.json({ success: true }); } catch (err: any) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }); } finally { client.release(); } });
app.post('/api/admin/wallet/:id', authenticateToken, async (req: any, res: any) => { if (!(await isSuperAdmin(req.user.email))) return res.status(403).json({ error: 'ممنوع' }); try { await pool.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [req.body.amount, req.params.id]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.get('/api/admin/users', authenticateToken, async (req: any, res: any) => { if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' }); res.json((await pool.query('SELECT id, email, role, name, pharmacy_limit, phone, notes, is_active, wallet_balance, specialty, consultation_price, about, faqs, show_in_directory, profile_picture FROM users ORDER BY id DESC')).rows); });
app.patch('/api/admin/users/:id/approve', authenticateToken, async (req: any, res: any) => { if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' }); await pool.query('UPDATE users SET is_active = TRUE WHERE id = $1', [req.params.id]); res.json({ success: true }); });
app.post('/api/admin/users', authenticateToken, async (req: any, res: any) => { if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' }); const { email, password, role, name, phone, notes, pharmacy_limit, wallet_balance, is_active } = req.body; try { const hashedPassword = await bcrypt.hash(password, 10); const result = await pool.query('INSERT INTO users (email, password, role, name, phone, notes, pharmacy_limit, wallet_balance, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *', [email, hashedPassword, role, name, phone, notes, pharmacy_limit, wallet_balance || 0, is_active !== undefined ? is_active : true]); res.json(result.rows); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.put('/api/admin/users/:id', authenticateToken, async (req: any, res: any) => { if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' }); const { id } = req.params; const { email, password, role, name, phone, notes, wallet_balance, is_active } = req.body; try { let query = 'UPDATE users SET name = $1, email = $2, role = $3, phone = $4, notes = $5, wallet_balance = $6, is_active = $7'; let values = [name, email, role, phone, notes, wallet_balance || 0, is_active]; if (password && password.trim() !== '') { query += ', password = $8 WHERE id = $9 RETURNING *'; values.push(await bcrypt.hash(password, 10), id); } else { query += ' WHERE id = $8 RETURNING *'; values.push(id); } const result = await pool.query(query, values); res.json(result.rows); } catch (err: any) { res.status(500).json({ error: err.message }); } });
app.delete('/api/admin/users/:id', authenticateToken, async (req: any, res: any) => { if (req.user.role !== 'admin') return res.status(403).json({ error: 'ممنوع' }); await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]); res.json({ success: true }); });
app.put('/api/admin/settings', authenticateToken, async (req: any, res: any) => { if (req.user.role !== 'admin' || !(await isSuperAdmin(req.user.email))) return res.status(403).json({ error: 'ممنوع' }); await pool.query("INSERT INTO settings (key, value) VALUES ('footer', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [req.body]); res.json({ success: true }); });
app.post('/api/admin/generate-key', authenticateToken, async (req: any, res: any) => { if (!(await isSuperAdmin(req.user.email))) return res.status(403).json({ error: 'ممنوع' }); const newKey = Math.random().toString(36).substring(2, 10).toUpperCase(); await pool.query('INSERT INTO activation_keys (key) VALUES ($1)', [newKey]); res.json({ key: newKey }); });
app.get('/api/admin/super-admins', authenticateToken, async (req: any, res: any) => { if (!(await isSuperAdmin(req.user.email))) return res.status(403).json({ error: 'ممنوع' }); const result = await pool.query('SELECT email FROM super_admins'); res.json(result.rows.map(row => row.email)); });
app.post('/api/admin/super-admins', authenticateToken, async (req: any, res: any) => { if (!(await isSuperAdmin(req.user.email))) return res.status(403).json({ error: 'ممنوع' }); await pool.query('INSERT INTO super_admins (email) VALUES ($1) ON CONFLICT DO NOTHING', [req.body.email]); res.json({ message: 'تمت الإضافة بنجاح' }); });
app.delete('/api/admin/super-admins/:email', authenticateToken, async (req: any, res: any) => { if (!(await isSuperAdmin(req.user.email))) return res.status(403).json({ error: 'ممنوع' }); if (req.params.email === 'alaa@taiba.pharma.sy') return res.status(400).json({ error: 'لا يمكن حذف حساب المؤسس!' }); await pool.query('DELETE FROM super_admins WHERE email = $1', [req.params.email]); res.json({ message: 'تم الحذف بنجاح' }); });
app.post('/api/auth/fcm-token', authenticateToken, async (req: any, res: any) => { const { fcm_token } = req.body; if (!fcm_token) return res.status(400).json({ error: 'Token is required' }); try { await pool.query('UPDATE users SET fcm_token = $1 WHERE id = $2', [fcm_token, req.user.id]); res.json({ success: true, message: 'تم ربط الهاتف بنجاح لاستلام الإشعارات.' }); } catch (err: any) { res.status(500).json({ error: err.message }); } });

// 🤖 AI Triage Chatbot Endpoint
app.post('/api/ai/triage', async (req: any, res: any) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'مفتاح API الخاص بالمساعد الذكي غير مكوّن' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        systemInstruction: `أنت مساعد طبي (Medical Triage Assistant) وصيدلاني محترف.
مهمتك الرئيسية هي:
1. تحليل الأعراض التي يصفها المريض وتوجيهه إلى التخصص الطبي المناسب.
2. تقديم معلومات دوائية عامة وموثوقة (مثل دواعي الاستعمال، الآثار الجانبية الشائعة، التداخلات الدوائية) من مصادر طبية وصيدلانية عالمية مشهورة (مثل FDA، WHO، WebMD، Mayo Clinic) عندما يسأل المريض عن دواء معين.

قيود صارمة:
- ممنوع منعاً باتاً تشخيص الحالة طبياً أو وصف أدوية كعلاج لحالة المريض.
- عند تقديم معلومات عن دواء، أضف دائماً ملاحظة إخلاء مسؤولية قصيرة بأن هذه المعلومات تثقيفية ولا تغني عن استشارة الطبيب أو الصيدلي.

اكتب ردك باللغة العربية، بأسلوب مهني، دافئ، وموجز وفي صلب الموضوع. لا تستخدم تنسيقات معقدة بل نصوص بسيطة وواضحة.`
      }
    });

    res.json({ reply: response.text });
  } catch (err: any) {
    console.error('AI Error:', err);
    res.status(500).json({ error: 'عذراً، فشل الاتصال بالمساعد الذكي حالياً. حاول مجدداً.' });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => console.log('API Server running on http://localhost:3000'));
}

export default app;