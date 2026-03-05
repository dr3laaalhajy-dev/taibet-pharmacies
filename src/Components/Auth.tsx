import React, { useState } from 'react';
import { Shield, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../api-client'; // 👈 تم التصحيح هنا

export const Auth = ({ onLogin, t, lang }: { onLogin: (user: any) => void, t: any, lang: string }) => {
  const [isLogin, setIsLogin] = useState(true); 
  const [email, setEmail] = useState(''); 
  const [emailPrefix, setEmailPrefix] = useState(''); 
  const [password, setPassword] = useState(''); 
  const [name, setName] = useState(''); 
  const [phone, setPhone] = useState(''); 
  const [activationKey, setActivationKey] = useState(''); 
  const [role, setRole] = useState('patient'); 
  const [error, setError] = useState(''); 
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => { 
    e.preventDefault(); setError(''); setLoading(true); 
    try { 
      if (isLogin) { 
        const data = await api.post('/api/auth/login', { email, password }); onLogin(data.user); 
      } else { 
        const domain = role === 'patient' ? '@taiba.user.sy' : (role === 'dentist' ? '@taiba.dental.sy' : (role === 'doctor' ? '@taiba.Health.sy' : '@taiba.pharma.sy')); 
        const fullEmail = `${emailPrefix}${domain}`; 
        await api.post('/api/auth/register', { email: fullEmail, password, name, phone, role, activationKey }); 
        alert('تم إنشاء الحساب بنجاح! يمكنك الدخول الآن.'); setIsLogin(true); 
      } 
    } catch (err: any) { setError(err.error || 'فشل الإجراء'); } finally { setLoading(false); } 
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl shadow-xl border w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-8">{isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}</h2>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && <input required placeholder="الاسم الكامل" className="w-full px-4 py-3 rounded-xl border" value={name} onChange={e=>setName(e.target.value)} />}
          {isLogin ? (
            <input type="email" required placeholder="البريد الإلكتروني" className="w-full px-4 py-3 rounded-xl border" value={email} onChange={e=>setEmail(e.target.value)} />
          ) : (
            <div className="flex items-center border rounded-xl overflow-hidden">
               <input required placeholder="اسم المستخدم" className="flex-1 px-4 py-3 outline-none" value={emailPrefix} onChange={e=>setEmailPrefix(e.target.value)} />
               <span className="px-3 bg-slate-50 text-xs text-slate-500">{role === 'patient' ? '@taiba.user.sy' : '@taiba.Health.sy'}</span>
            </div>
          )}
          {!isLogin && (
            <select className="w-full px-4 py-3 rounded-xl border" value={role} onChange={e=>setRole(e.target.value)}>
              <option value="patient">مريض / مستخدم</option>
              <option value="pharmacist">صيدلي</option>
              <option value="doctor">طبيب</option>
            </select>
          )}
          <input type="password" required placeholder="كلمة المرور" className="w-full px-4 py-3 rounded-xl border" value={password} onChange={e=>setPassword(e.target.value)} />
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold">{loading ? '...' : (isLogin ? 'دخول' : 'تسجيل')}</button>
        </form>
        <button onClick={() => setIsLogin(!isLogin)} className="w-full text-center mt-6 text-blue-600 text-sm font-bold">{isLogin ? 'إنشاء حساب جديد' : 'لديك حساب؟ سجل دخولك'}</button>
      </motion.div>
    </div>
  );
};