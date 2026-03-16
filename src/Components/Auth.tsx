import React, { useState } from 'react';
import { Shield, MessageCircle, ArrowRight, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../api-client';
import { LegalModal } from './LegalModal';
import { PhoneContactInput, PhoneValue } from './PhoneContactInput';
import { getErrorMessage } from '../helpers';

export const Auth = ({ onLogin, onBack, t, lang }: { onLogin: (user: any) => void, onBack: () => void, t: any, lang: string }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [emailPrefix, setEmailPrefix] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phoneData, setPhoneData] = useState<PhoneValue>({ phone: '', whatsapp: '', hasSeparateWhatsapp: false });
  const [activationKey, setActivationKey] = useState('');
  const [isActivatedByKey, setIsActivatedByKey] = useState(false);
  const [role, setRole] = useState('patient');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPassword, setParentPassword] = useState('');

  // 🟢 الحالة الجديدة للتحكم بظهور كلمة المرور
  const [showPassword, setShowPassword] = useState(false);
  
  // 🟢 حالة الموافقة على الشروط
  const [agreed, setAgreed] = useState(false);
  const [activeLegalModal, setActiveLegalModal] = useState<'privacy' | 'terms' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccessMsg('');

    if (!isLogin && !agreed) {
      setError(lang === 'ar' ? 'يجب الموافقة على شروط الاستخدام وسياسة الخصوصية للمتابعة.' : 'You must agree to the Terms and Privacy Policy to continue.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        // 🟢 الإضافة هنا: تحويل الأحرف إلى صغيرة وإزالة المسافات المخفية
        const cleanEmail = email.toLowerCase().trim();
        const data = await api.post('/api/auth/login', { email: cleanEmail, password });
        if (data.token) localStorage.setItem('token', data.token);
        onLogin(data.user);
      } else {
        if (role === 'child') {
          const res = await api.post('/api/auth/register-child', {
            childData: { name, gender, age },
            parentCredentials: { email: parentEmail, password: parentPassword }
          });
          setSuccessMsg(lang === 'ar' ? 'تم إنشاء حساب الطفل وربطه بنجاح!' : 'Child account created and linked successfully!');
        } else {
          const domain = role === 'patient' ? '@taiba.user.sy' : (role === 'dentist' ? '@taiba.dental.sy' : (role === 'doctor' ? '@taiba.Health.sy' : '@taiba.pharma.sy'));
          const fullEmail = `${emailPrefix.toLowerCase().trim()}${domain}`;
          const res = await api.post('/api/auth/register', { 
            email: fullEmail, 
            password, 
            name, 
            phone: phoneData.phone, 
            whatsapp_number: phoneData.whatsapp, 
            role, 
            activationKey 
          });

          if (res.isActive) {
            setSuccessMsg(lang === 'ar' ? 'تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن.' : 'Account created successfully! You can login now.');
            setIsActivatedByKey(true);
          } else {
            setSuccessMsg(lang === 'ar' ? 'تم إنشاء الحساب بنجاح! يرجى التواصل مع الإدارة لتفعيل حسابك (للكوادر الطبية).' : 'Account created successfully! Please contact admin to activate your account.');
            setIsActivatedByKey(false);
          }
        }
        setIsLogin(true); setPassword(''); setEmailPrefix(''); setActivationKey('');
      }
    } catch (err: any) {
      console.error(err);
      setError(getErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-md mx-auto mb-4 pt-4">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold transition-colors">
          <ArrowRight className={lang === 'en' ? 'rotate-180' : ''} size={20} />
          {lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
        </button>
      </div>
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 w-full">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield size={32} />
            </div>
            <h2 className="text-3xl font-bold text-slate-900">{isLogin ? t.loginTitle : (lang === 'ar' ? 'إنشاء حساب جديد' : 'Create Account')}</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold border border-red-100 animate-shake">{error}</div>}
            {successMsg && (
              <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm flex flex-col gap-3 text-center border border-emerald-100">
                <span className="font-bold">{successMsg}</span>
                {!isActivatedByKey && role !== 'patient' && successMsg.includes('التواصل') && (
                  <a href="https://wa.me/963000000000" target="_blank" rel="noreferrer" className="bg-emerald-500 text-white py-2 rounded-lg font-bold flex justify-center items-center gap-2 hover:bg-emerald-600 transition-colors">
                    <MessageCircle size={16} /> تواصل عبر واتساب للتفعيل
                  </a>
                )}
              </div>
            )}

            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.fullName}</label>
                    <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.role}</label>
                    <select className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" value={role} onChange={e => setRole(e.target.value)}>
                      <option value="patient">{lang === 'ar' ? 'مريض / مستخدم' : 'Patient'}</option>
                      <option value="child">{lang === 'ar' ? 'إنشاء حساب لطفل' : 'Create Account for a Child'}</option>
                      <option value="pharmacist">{t.pharmacist}</option>
                      <option value="doctor">{t.doctor}</option>
                      <option value="dentist">{lang === 'ar' ? 'طبيب أسنان' : 'Dentist'}</option>
                    </select>
                  </div>
                </div>
                {role === 'child' ? (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{lang === 'ar' ? 'العمر' : 'Age'}</label>
                      <input type="number" required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" value={age} onChange={e => setAge(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{lang === 'ar' ? 'الجنس' : 'Gender'}</label>
                      <select className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" value={gender} onChange={e => setGender(e.target.value)}>
                        <option value="male">{lang === 'ar' ? 'ذكر' : 'Male'}</option>
                        <option value="female">{lang === 'ar' ? 'أنثى' : 'Female'}</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="pt-2">
                      <PhoneContactInput 
                        value={phoneData} 
                        onChange={setPhoneData} 
                        lang={lang as 'ar' | 'en'} 
                        label={t.phone} 
                      />
                    </div>
                    {role !== 'patient' && (
                      <div className="pt-2 border-t border-slate-100 mt-2">
                        <p className="text-xs text-slate-500 mb-2 font-medium leading-relaxed">مفتاح التفعيل للكادر الطبي (اختياري):</p>
                        <input placeholder="مفتاح التفعيل (إن وجد)" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center tracking-widest uppercase" value={activationKey} onChange={e => setActivationKey(e.target.value.toUpperCase())} />
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {!isLogin && role !== 'child' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.email}</label>
                <div className="flex" dir="ltr">
                  <input type="text" required placeholder="username" className="flex-1 px-4 py-3 rounded-l-xl border border-r-0 border-slate-200 outline-none text-left focus:ring-2 focus:ring-blue-500" value={emailPrefix} onChange={e => setEmailPrefix(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ''))} />
                  <div className="px-3 py-3 bg-slate-50 border border-slate-200 rounded-r-xl text-slate-500 font-mono text-xs flex items-center select-none">{role === 'patient' ? '@taiba.user.sy' : (role === 'dentist' ? '@taiba.dental.sy' : (role === 'doctor' ? '@taiba.Health.sy' : '@taiba.pharma.sy'))}</div>
                </div>
              </div>
            )}

            {(isLogin || (!isLogin && role !== 'child')) && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.email}</label>
                <input type="email" required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-left" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} />
                {isLogin && (
                  <div className="flex gap-2 mt-2 justify-end flex-wrap" dir="ltr">
                    <button type="button" onClick={() => setEmail(email.split('@')[0] + '@taiba.user.sy')} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-mono rounded-lg hover:bg-slate-200 transition-colors">@taiba.user.sy</button>
                    <button type="button" onClick={() => setEmail(email.split('@')[0] + '@taiba.pharma.sy')} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-mono rounded-lg hover:bg-slate-200 transition-colors">@taiba.pharma.sy</button>
                    <button type="button" onClick={() => setEmail(email.split('@')[0] + '@taiba.Health.sy')} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-mono rounded-lg hover:bg-slate-200 transition-colors">@taiba.Health.sy</button>
                    <button type="button" onClick={() => setEmail(email.split('@')[0] + '@taiba.dental.sy')} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-mono rounded-lg hover:bg-slate-200 transition-colors">@taiba.dental.sy</button>
                  </div>
                )}
              </div>
            )}

            {isLogin || (!isLogin && role !== 'child') ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.password}</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-left"
                    dir="ltr"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            ) : null}

            {!isLogin && role === 'child' && (
              <div className="pt-4 mt-2 border-t border-slate-100 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                  {lang === 'ar' ? 'بيانات حساب الوالدين للربط' : 'Parent Account Verification'}
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{lang === 'ar' ? 'البريد الإلكتروني للوالد' : 'Parent\'s Email'}</label>
                  <input type="email" required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-left" dir="ltr" value={parentEmail} onChange={e => setParentEmail(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{lang === 'ar' ? 'كلمة مرور الوالد' : 'Parent\'s Password'}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-left"
                      dir="ltr"
                      value={parentPassword}
                      onChange={e => setParentPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors mt-6 shadow-lg shadow-blue-200 hover:-translate-y-0.5 transition-all outline-none focus:ring-2 focus:ring-blue-300">
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   {lang === 'ar' ? 'جاري التحميل...' : 'Processing...'}
                </div>
              ) : (isLogin ? t.signIn : (!isLogin && role === 'child' ? (lang === 'ar' ? 'إنشاء وربط الحساب' : 'Create and Link Account') : (lang === 'ar' ? 'إنشاء الحساب والموافقة' : 'Sign Up & Agree')))}
            </button>
          </form>
          <div className="mt-6 text-center border-t border-slate-100 pt-6">
            <p className="text-sm text-slate-600">
              {isLogin ? (lang === 'ar' ? 'ليس لديك حساب؟' : "Don't have an account?") : (lang === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?')}
              <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMsg(''); setShowPassword(false); setAgreed(false); }} className="text-blue-600 font-bold hover:underline mx-2">
                {isLogin ? (lang === 'ar' ? 'إنشاء حساب' : 'Sign Up') : (lang === 'ar' ? 'تسجيل الدخول' : 'Login')}
              </button>
            </p>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {activeLegalModal && (
          <LegalModal 
            isOpen={!!activeLegalModal} 
            type={activeLegalModal} 
            onClose={() => setActiveLegalModal(null)} 
            lang={lang} 
          />
        )}
      </AnimatePresence>
    </>
  );
};