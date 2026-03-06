import React, { useState } from 'react';
import { Mail, Lock, User, Phone, ArrowRight } from 'lucide-react';
import { api } from '../api-client';
import toast from 'react-hot-toast';

export const Auth = ({ onLogin, onBack, t, lang }: { onLogin: (user: any) => void, onBack: () => void, t: any, lang: string }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '', phone: '', activationKey: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin ? { email: formData.email, password: formData.password } : { ...formData, role: 'patient' };
      const data = await api.post(endpoint, payload);
      
      if (isLogin) {
        onLogin(data.user);
        toast.success(lang === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Login successful');
      } else {
        toast.success(lang === 'ar' ? 'تم إنشاء الحساب، يرجى تسجيل الدخول' : 'Account created, please login');
        setIsLogin(true);
      }
    } catch (err: any) {
      toast.error(err.error || (lang === 'ar' ? 'حدث خطأ' : 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      {/* 🟢 زر الرجوع للرئيسية */}
      <div className="w-full max-w-md mb-4">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold transition-colors">
          <ArrowRight className={lang === 'en' ? 'rotate-180' : ''} size={20} />
          {lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
        </button>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100">
        <h2 className="text-3xl font-extrabold text-center mb-8 text-slate-900">
          {isLogin ? (lang === 'ar' ? 'تسجيل الدخول' : 'Login') : (lang === 'ar' ? 'إنشاء حساب' : 'Register')}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <>
              <div className="relative">
                <User className="absolute top-1/2 -translate-y-1/2 text-slate-400 rtl:right-4 ltr:left-4" size={20} />
                <input required type="text" placeholder={lang === 'ar' ? 'الاسم الكامل' : 'Full Name'} className="w-full px-12 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="relative">
                <Phone className="absolute top-1/2 -translate-y-1/2 text-slate-400 rtl:right-4 ltr:left-4" size={20} />
                <input type="text" placeholder={lang === 'ar' ? 'رقم الهاتف' : 'Phone'} className="w-full px-12 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-left" dir="ltr" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
            </>
          )}
          <div className="relative">
            <Mail className="absolute top-1/2 -translate-y-1/2 text-slate-400 rtl:right-4 ltr:left-4" size={20} />
            <input required type="email" placeholder={lang === 'ar' ? 'البريد الإلكتروني' : 'Email'} className="w-full px-12 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-left" dir="ltr" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="relative">
            <Lock className="absolute top-1/2 -translate-y-1/2 text-slate-400 rtl:right-4 ltr:left-4" size={20} />
            <input required type="password" placeholder={lang === 'ar' ? 'كلمة المرور' : 'Password'} className="w-full px-12 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-left" dir="ltr" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>
          
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
            {loading ? '...' : (isLogin ? (lang === 'ar' ? 'دخول' : 'Login') : (lang === 'ar' ? 'تسجيل' : 'Register'))}
          </button>
        </form>
        
        <p className="text-center mt-6 text-slate-500">
          {isLogin ? (lang === 'ar' ? 'ليس لديك حساب؟ ' : "Don't have an account? ") : (lang === 'ar' ? 'لديك حساب بالفعل؟ ' : 'Already have an account? ')}
          <button onClick={() => setIsLogin(!isLogin)} className="text-blue-600 font-bold hover:underline">
            {isLogin ? (lang === 'ar' ? 'إنشاء حساب جديد' : 'Register here') : (lang === 'ar' ? 'تسجيل الدخول' : 'Login here')}
          </button>
        </p>
      </div>
    </div>
  );
};