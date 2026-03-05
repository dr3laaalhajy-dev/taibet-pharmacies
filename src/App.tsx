import { SuccessModal } from './Components/SuccessModal';
import toast, { Toaster } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { LogOut, Wallet, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore
import { translations } from './translations';
import { UserType, FooterSettings } from './types';
import { api } from './api-client';
import { PublicView } from './Components/PublicView';
import { Auth } from './Components/Auth';
import { Dashboard } from './Components/Dashboard';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png', iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png' });

export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [view, setView] = useState<'public' | 'login' | 'dashboard'>('public');
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [footerData, setFooterData] = useState<FooterSettings | null>(null);
  const t = translations[lang] || translations['ar'];

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [walletAmount, setWalletAmount] = useState('');

  useEffect(() => { document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; document.documentElement.lang = lang; }, [lang]);
  const refreshUser = () => { api.get('/api/auth/me').then(data => setUser(data.user)).catch(console.error); };

  useEffect(() => {
    api.get('/api/auth/me').then(data => { 
      setUser(data.user); 
      setView(data.user.role === 'patient' ? 'public' : 'dashboard'); 
    }).catch(() => setView('public')).finally(() => setLoading(false));
    api.get('/api/public/settings').then(data => { if(Object.keys(data).length > 0) setFooterData(data); }).catch(console.error);
  }, []);

  const handleLogin = (u: UserType) => { setUser(u); setView(u.role === 'patient' ? 'public' : 'dashboard'); };
  const handleLogout = async () => { await api.post('/api/auth/logout', {}); setUser(null); setView('public'); };

  const submitWalletRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/wallet/request', { type: walletActionType, amount: parseFloat(walletAmount) });
      
      setSuccessModalData({ isOpen: true, title: lang === 'ar' ? 'تم إرسال طلبك للإدارة بنجاح.' : 'Request sent successfully.', message: lang === 'ar' ? 'شكراً لتواصلكم معنا.' : 'Thank you for contacting us.' });
      setShowWalletModal(false); setWalletAmount('');
    } catch(err: any) { 
      // 🟢 أضفنا هذا السطر لطباعة الخطأ الحقيقي في شاشة المطور
      console.error("🔥 التفاصيل التقنية للخطأ:", err.response?.data || err.message || err);
      
      toast.error(err.response?.data?.error || err.error || (lang === 'ar' ? 'حدث خطأ' : 'Error occurred')); 
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-slate-50">
      <Toaster position="top-center" reverseOrder={false} />
      {view !== 'dashboard' && (
        <nav className="bg-white border-b px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-40 backdrop-blur-md bg-white/90 shadow-sm">
          <button onClick={() => setView('public')} className="text-xl font-bold flex items-center gap-2"> Taibet Health</button>
          <div className="flex gap-2 md:gap-4 items-center">
            {user && user.role === 'patient' && (
              <div className="flex items-center gap-1">
                <div className="bg-blue-50 text-blue-700 px-3 md:px-4 py-1.5 rounded-full flex items-center gap-2 text-xs md:text-sm font-bold border border-blue-200 shadow-sm">
                  <Wallet size={16}/> <span dir="ltr">{user.wallet_balance || '0.00'}ل.س جديدة </span>
                </div>
                <button onClick={() => setShowWalletModal(true)} className="bg-blue-600 text-white p-1.5 rounded-full hover:bg-blue-700 transition-colors shadow-md"><Plus size={18}/></button>
              </div>
            )}
            <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-bold border border-slate-200 hover:bg-slate-50 transition-colors">{lang === 'ar' ? 'English' : 'العربية'}</button>
            {user ? (
              <div className="flex gap-2">
                {user.role !== 'patient' && view === 'public' && (<button onClick={() => setView('dashboard')} className="bg-slate-900 text-white px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-bold hover:bg-slate-800 transition-colors shadow-md">Dashboard</button>)}
                <button onClick={handleLogout} className="bg-red-50 text-red-600 px-3 md:px-4 py-1.5 rounded-full flex items-center gap-1 text-xs md:text-sm font-bold hover:bg-red-100 transition-colors"><LogOut size={16}/> <span className="hidden sm:inline">Logout</span></button>
              </div>
            ) : (<button onClick={() => setView('login')} className="bg-blue-600 text-white px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-bold hover:bg-blue-700 transition-colors shadow-md">{t.staffLogin}</button>)}
          </div>
        </nav>
      )}
      <main className="flex-1">
        {view === 'public' && <PublicView user={user} refreshUser={refreshUser} lang={lang} t={t} />}
        {view === 'login' && <Auth onLogin={handleLogin} t={t} lang={lang} />}
        {view === 'dashboard' && user && <Dashboard user={user} onLogout={handleLogout} lang={lang} t={t} />}
      <SuccessModal 
        isOpen={showSuccess} 
        onClose={() => setShowSuccess(false)} 
        title={lang === 'ar' ? "تم إرسال طلبك للإدارة بنجاح." : "Request sent successfully."}
        message={lang === 'ar' ? "شكراً لتواصلكم معنا." : "Thank you for contacting us."}
      />
      </main>
      <AnimatePresence>
        {showWalletModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-sm">
              <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold">شحن المحفظة</h3><button onClick={() => setShowWalletModal(false)} className="p-1 hover:bg-slate-100 rounded-full"><X size={20}/></button></div>
              <form onSubmit={submitWalletRequest}>
                <input type="number" min="1" required className="w-full px-4 py-4 border-2 border-blue-100 rounded-2xl outline-none text-center text-2xl font-bold text-blue-600 mb-6" placeholder="0.00" value={walletAmount} onChange={e => setWalletAmount(e.target.value)} />
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg">إرسال طلب الشحن</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}