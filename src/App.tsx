import { SuccessModal } from './Components/SuccessModal';
import toast, { Toaster } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { LogOut, Wallet, Plus, X, User, Settings, LayoutDashboard, Camera, MapPin, CreditCard, Trash2, CheckCircle } from 'lucide-react';
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
L.Icon.Default.mergeOptions({ 
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png', 
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png', 
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png' 
});

const uploadImageToImgBB = async (file: File) => { 
  const base64 = await new Promise<string>((resolve, reject) => { 
    const reader = new FileReader(); reader.readAsDataURL(file); 
    reader.onload = () => resolve(reader.result as string); 
    reader.onerror = e => reject(e); 
  }); 
  const f = new FormData(); f.append('image', base64.split(',')[1]); 
  const r = await fetch('https://api.imgbb.com/1/upload?key=6c2a41bd40fa2cde82b95b871c26b527', { method: 'POST', body: f }); 
  const d = await r.json(); if (d.success) return d.data.url; 
  throw new Error(d.error?.message || 'فشل الرفع'); 
};

export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [view, setView] = useState<'public' | 'login' | 'dashboard'>('public');
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [footerData, setFooterData] = useState<FooterSettings | null>(null);
  
  // 🟢 حالات التحميل لمنع Double Submit
  const [isSubmittingWallet, setIsSubmittingWallet] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'currency' | 'addresses'>('currency');
  
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [walletAmount, setWalletAmount] = useState('');

  const [currency, setCurrency] = useState<'old' | 'new'>((localStorage.getItem('currency') as 'old' | 'new') || 'new');

  const handleCurrencyChange = (newCurr: 'old' | 'new') => {
    setCurrency(newCurr);
    localStorage.setItem('currency', newCurr);
  };

  const [addresses, setAddresses] = useState<string[]>([]);
  const [defaultAddress, setDefaultAddress] = useState<string>('');
  const [newAddress, setNewAddress] = useState('');

  const [profileForm, setProfileForm] = useState({ name: '', email: '', password: '', profile_picture: '' });
  const [uploadingImage, setUploadingImage] = useState(false);

  const t = translations[lang] || translations['ar'];

  useEffect(() => { document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; document.documentElement.lang = lang; }, [lang]);

  useEffect(() => {
    api.get('/api/auth/me').then(data => { 
      setUser(data.user); 
      setView(data.user.role === 'patient' ? 'public' : 'dashboard');
      const savedAddresses = JSON.parse(localStorage.getItem(`addrs_${data.user.id}`) || '[]');
      const savedDefault = localStorage.getItem(`defAddr_${data.user.id}`) || savedAddresses[0] || '';
      setAddresses(savedAddresses); setDefaultAddress(savedDefault);
    }).catch(() => setView('public')).finally(() => setLoading(false));
    api.get('/api/public/settings').then(data => { if(Object.keys(data).length > 0) setFooterData(data); }).catch(console.error);
  }, []);

  useEffect(() => { if(user) setProfileForm({ name: user.name, email: user.email, password: '', profile_picture: (user as any).profile_picture || '' }); }, [user, showProfileModal]);

  const refreshUser = () => { api.get('/api/auth/me').then(data => setUser(data.user)).catch(console.error); };
  const handleLogin = (u: UserType) => { 
    setUser(u); setView(u.role === 'patient' ? 'public' : 'dashboard'); 
    const savedAddresses = JSON.parse(localStorage.getItem(`addrs_${u.id}`) || '[]');
    setAddresses(savedAddresses); setDefaultAddress(localStorage.getItem(`defAddr_${u.id}`) || savedAddresses[0] || '');
  };
  const handleLogout = async () => { await api.post('/api/auth/logout', {}); setUser(null); setView('public'); setIsMenuOpen(false); };

  // 🟢 منع Double Submit في طلب المحفظة
  const submitWalletRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingWallet) return;
    setIsSubmittingWallet(true);

    try {
      await api.post('/api/wallet/request', { type: 'deposit', amount: parseFloat(walletAmount) * 100 });
      setShowSuccess(true); setShowWalletModal(false); setWalletAmount('');
    } catch(err: any) { 
      toast.error(err.response?.data?.error || err.error || (lang === 'ar' ? 'حدث خطأ' : 'Error occurred')); 
    } finally {
      setIsSubmittingWallet(false);
    }
  };

  // 🟢 منع Double Submit في تحديث الملف
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdatingProfile) return;
    setIsUpdatingProfile(true);

    try {
      await api.post('/api/auth/update-profile', { email: profileForm.email, name: profileForm.name, newPassword: profileForm.password, profile_picture: profileForm.profile_picture });
      toast.success(lang === 'ar' ? 'تم تحديث الملف الشخصي بنجاح' : 'Profile updated');
      refreshUser(); setShowProfileModal(false);
    } catch(err: any) { 
      toast.error(err.error || 'خطأ في التحديث'); 
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setUploadingImage(true);
    try { const url = await uploadImageToImgBB(file); setProfileForm({ ...profileForm, profile_picture: url }); } 
    catch (err: any) { toast.error('فشل الرفع'); } finally { setUploadingImage(false); }
  };

  // 🟢 منع Double Submit في إضافة العنوان
  const addAddress = async () => {
    if(!newAddress.trim() || isAddingAddress) return;
    setIsAddingAddress(true);

    try {
      const updated = [...addresses, newAddress.trim()];
      setAddresses(updated); localStorage.setItem(`addrs_${user?.id}`, JSON.stringify(updated));
      if(!defaultAddress) { setDefaultAddress(newAddress.trim()); localStorage.setItem(`defAddr_${user?.id}`, newAddress.trim()); }
      setNewAddress(''); toast.success(lang === 'ar' ? 'تمت الإضافة' : 'Added');
    } finally {
      setIsAddingAddress(false);
    }
  };

  const removeAddress = (addr: string) => {
    const updated = addresses.filter(a => a !== addr);
    setAddresses(updated); localStorage.setItem(`addrs_${user?.id}`, JSON.stringify(updated));
    if(defaultAddress === addr) { setDefaultAddress(updated[0] || ''); localStorage.setItem(`defAddr_${user?.id}`, updated[0] || ''); }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-slate-50">
      <Toaster position="top-center" reverseOrder={false} />
      
      {view !== 'dashboard' && (
        <nav className="bg-white border-b px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-40 backdrop-blur-md bg-white/90 shadow-sm">
          <button onClick={() => setView('public')} className="text-xl font-bold flex items-center gap-2"> Taiba Health</button>
          
          <div className="flex gap-3 items-center">
            {user && (
              <button onClick={() => setShowWalletModal(true)} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full flex items-center gap-2 text-sm font-bold border border-blue-200 hover:bg-blue-100 transition-colors">
                <Wallet size={16}/> <span dir="ltr">{(parseFloat(user.wallet_balance || '0') / (currency === 'new' ? 100 : 1))} {currency === 'new' ? 'ل.س جديدة' : 'ل.س'}</span>
                <Plus size={14} className="bg-blue-600 text-white rounded-full p-0.5 ml-1" />
              </button>
            )}
            
            <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="hidden sm:block px-3 py-1.5 rounded-full text-xs font-bold border border-slate-200 hover:bg-slate-50 transition-colors">{lang === 'ar' ? 'English' : 'العربية'}</button>
            
            {user ? (
              <div className="flex items-center gap-2 md:gap-3">
                {user.role !== 'patient' && (
                  <button onClick={() => setView('dashboard')} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-md">
                    <LayoutDashboard size={16} />
                    <span className="hidden sm:inline">{lang === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</span>
                  </button>
                )}

                <div className="relative">
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2 focus:outline-none rounded-full ring-2 ring-transparent hover:ring-blue-200 transition-all">
                    {(user as any).profile_picture ? (
                      <img src={(user as any).profile_picture} className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm" />
                    ) : (
                      <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>

                  <AnimatePresence>
                    {isMenuOpen && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className={`absolute mt-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 ${lang === 'ar' ? 'left-0' : 'right-0'}`}>
                        <div className="px-4 py-3 border-b border-slate-100 mb-2 bg-slate-50/50">
                          <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                          <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        </div>
                        
                        <button onClick={() => { setShowProfileModal(true); setIsMenuOpen(false); }} className="w-full text-start px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 transition-colors">
                          <User size={16} /> {lang === 'ar' ? 'الملف الشخصي' : 'Profile'}
                        </button>
                        
                        <button onClick={() => { setShowSettingsModal(true); setIsMenuOpen(false); }} className="w-full text-start px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 transition-colors">
                          <Settings size={16} /> {lang === 'ar' ? 'الإعدادات' : 'Settings'}
                        </button>

                        <div className="border-t border-slate-100 mt-2 pt-2">
                          <button onClick={handleLogout} className="w-full text-start px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors">
                            <LogOut size={16} /> {lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (<button onClick={() => setView('login')} className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-blue-700 transition-colors shadow-md">{t.staffLogin}</button>)}
          </div>
        </nav>
      )}

      <main className="flex-1">
        {view === 'public' && (
          <PublicView 
            user={user} 
            refreshUser={refreshUser} 
            lang={lang} 
            t={t} 
            currency={currency} 
            setCurrency={handleCurrencyChange} 
            defaultAddress={defaultAddress} 
            footerData={footerData} 
          />
        )}
        {view === 'login' && <Auth onLogin={handleLogin} onBack={() => setView('public')} t={t} lang={lang} />}
        {view === 'dashboard' && user && <Dashboard user={user} onLogout={handleLogout} onGoToPublic={() => setView('public')} lang={lang} t={t} />}
        
        <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title={lang === 'ar' ? "تم بنجاح." : "Success."} message={lang === 'ar' ? "شكراً لك." : "Thank you."} />
      </main>

      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-md">
              <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold">{lang === 'ar' ? 'الملف الشخصي' : 'Profile'}</h3><button onClick={() => setShowProfileModal(false)} className="p-1 hover:bg-slate-100 rounded-full"><X size={20}/></button></div>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="flex flex-col items-center mb-6">
                  <div className="relative group cursor-pointer">
                    {profileForm.profile_picture ? <img src={profileForm.profile_picture} className="w-24 h-24 rounded-full object-cover border-4 border-slate-50 shadow-md" /> : <div className="w-24 h-24 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-3xl font-bold border-4 border-white shadow-md">{profileForm.name?.charAt(0)}</div>}
                    <label className="absolute inset-0 bg-black/50 text-white rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      {uploadingImage ? <span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span> : <Camera size={24} />}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage || isUpdatingProfile} />
                    </label>
                  </div>
                </div>
                <div><label className="block text-sm font-bold mb-1">{lang === 'ar' ? 'الاسم' : 'Name'}</label><input required className="w-full px-4 py-3 border rounded-xl outline-none" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} disabled={isUpdatingProfile} /></div>
                <div><label className="block text-sm font-bold mb-1">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label><input required type="email" className="w-full px-4 py-3 border rounded-xl outline-none" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} dir="ltr" disabled={isUpdatingProfile} /></div>
                <div><label className="block text-sm font-bold mb-1">{lang === 'ar' ? 'تغيير كلمة المرور (اختياري)' : 'New Password (Optional)'}</label><input type="password" placeholder="***" className="w-full px-4 py-3 border rounded-xl outline-none" value={profileForm.password} onChange={e => setProfileForm({...profileForm, password: e.target.value})} dir="ltr" disabled={isUpdatingProfile} /></div>
                <button type="submit" disabled={uploadingImage || isUpdatingProfile} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-blue-700 disabled:opacity-50 mt-2 flex items-center justify-center gap-2">
                  {isUpdatingProfile ? <><span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span> {lang === 'ar' ? 'جاري الحفظ...' : 'Saving...'}</> : (lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col md:flex-row h-[500px]">
              
              <div className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-l border-slate-200 p-6 flex flex-col">
                <h3 className="text-xl font-bold mb-6 flex justify-between items-center">{lang === 'ar' ? 'الإعدادات' : 'Settings'} <button onClick={() => setShowSettingsModal(false)} className="md:hidden p-1 hover:bg-slate-200 rounded-full"><X size={20}/></button></h3>
                <button onClick={() => setSettingsTab('currency')} className={`text-start px-4 py-3 rounded-xl font-bold mb-2 flex items-center gap-2 transition-colors ${settingsTab === 'currency' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}><CreditCard size={18}/> {lang === 'ar' ? 'العملة' : 'Currency'}</button>
                <button onClick={() => setSettingsTab('addresses')} className={`text-start px-4 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors ${settingsTab === 'addresses' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}><MapPin size={18}/> {lang === 'ar' ? 'عناوين التوصيل' : 'Addresses'}</button>
              </div>

              <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                <div className="hidden md:flex justify-end mb-4"><button onClick={() => setShowSettingsModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={24}/></button></div>
                
                {settingsTab === 'currency' && (
                  <div className="animate-in fade-in">
                    <h4 className="text-lg font-bold mb-4">{lang === 'ar' ? 'اختر العملة المفضلة' : 'Select Currency'}</h4>
                    <p className="text-sm text-slate-500 mb-6">{lang === 'ar' ? 'ملاحظة: 100 ل.س = 1 ل.س جديدة' : 'Note: 100 L.S = 1 New L.S'}</p>
                    <div className="space-y-3">
                      <label className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-colors ${currency === 'old' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                        <div className="flex items-center gap-3"><input type="radio" checked={currency === 'old'} onChange={() => handleCurrencyChange('old')} className="w-5 h-5 accent-blue-600" /> <span className="font-bold text-lg">الليرة السورية (ل.س)</span></div>
                      </label>
                      <label className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-colors ${currency === 'new' ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'}`}>
                        <div className="flex items-center gap-3"><input type="radio" checked={currency === 'new'} onChange={() => handleCurrencyChange('new')} className="w-5 h-5 accent-emerald-600" /> <span className="font-bold text-lg">الليرة الجديدة (ل.س جديدة)</span></div>
                        <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md">÷ 100</span>
                      </label>
                    </div>
                  </div>
                )}

                {settingsTab === 'addresses' && (
                  <div className="animate-in fade-in">
                    <h4 className="text-lg font-bold mb-4">{lang === 'ar' ? 'عناوين التوصيل الخاصة بي' : 'My Delivery Addresses'}</h4>
                    <div className="flex gap-2 mb-6">
                      <input placeholder={lang === 'ar' ? 'مثال: حي الصفا، الشارع الرئيسي، بناء السلام' : 'Add new address...'} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={newAddress} onChange={e => setNewAddress(e.target.value)} disabled={isAddingAddress} />
                      <button onClick={addAddress} disabled={isAddingAddress} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50">
                        {isAddingAddress ? '...' : (lang === 'ar' ? 'إضافة' : 'Add')}
                      </button>
                    </div>
                    <div className="space-y-3">
                      {addresses.length === 0 ? (<div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">{lang === 'ar' ? 'لا توجد عناوين مضافة بعد.' : 'No addresses added.'}</div>) : 
                        addresses.map((addr, idx) => (
                          <div key={idx} className={`p-4 border-2 rounded-2xl flex items-center justify-between transition-colors ${defaultAddress === addr ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                            <div className="flex items-center gap-3 flex-1">
                              <button onClick={() => { setDefaultAddress(addr); localStorage.setItem(`defAddr_${user?.id}`, addr); }} className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${defaultAddress === addr ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>{defaultAddress === addr && <CheckCircle size={14} className="text-white"/>}</button>
                              <span className="font-medium text-slate-700 line-clamp-2">{addr}</span>
                            </div>
                            {defaultAddress === addr && <span className="hidden sm:inline-block text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded mx-2">{lang === 'ar' ? 'الافتراضي' : 'Default'}</span>}
                            <button onClick={() => removeAddress(addr)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWalletModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{lang === 'ar' ? 'شحن المحفظة' : 'Deposit'}</h3>
                <button type="button" onClick={() => setShowWalletModal(false)} className="p-1 hover:bg-slate-100 rounded-full"><X size={20}/></button>
              </div>
              <form onSubmit={submitWalletRequest}>
                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-700 mb-2 text-center">{lang === 'ar' ? 'أدخل المبلغ بـ (ل.س جديدة)' : 'Amount in (New L.S)'}</label>
                  <input type="number" min="1" step="0.01" required className="w-full px-4 py-4 border-2 border-blue-100 rounded-2xl outline-none text-center text-3xl font-extrabold text-blue-600 focus:border-blue-500 transition-colors" placeholder="0" value={walletAmount} onChange={e => setWalletAmount(e.target.value)} disabled={isSubmittingWallet} />
                  {walletAmount && !isNaN(Number(walletAmount)) && Number(walletAmount) > 0 && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                      <p className="text-xs text-slate-500 font-bold mb-1">{lang === 'ar' ? 'يعادل بالليرة السورية القديمة:' : 'Equals to old Syrian Lira:'}</p>
                      <p className="text-lg font-extrabold text-slate-800" dir="ltr">{(Number(walletAmount) * 100).toLocaleString()} {lang === 'ar' ? 'ل.س' : 'L.S'}</p>
                    </motion.div>
                  )}
                </div>
                <button type="submit" disabled={isSubmittingWallet} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmittingWallet ? <><span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span> {lang === 'ar' ? 'جاري الإرسال...' : 'Sending...'}</> : (lang === 'ar' ? 'إرسال طلب الشحن' : 'Submit Deposit')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SpeedInsights />
    </div>
  );
}