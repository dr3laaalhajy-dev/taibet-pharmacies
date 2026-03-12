import { SuccessModal } from './Components/SuccessModal';
import toast, { Toaster } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Plus, Edit2, Trash2, Calendar, MapPin, Phone, User, LogOut, Settings, Activity, Layout, UploadCloud, Package, FileText, Smile, Wallet, Banknote, Minus, Store, CheckCircle, Stethoscope, X, ShieldAlert, LayoutDashboard, Search, Clock, Users, AlertCircle, MessageSquare, FileSignature, Star , Sun, Moon, MessageCircle, Bell, Camera, CreditCard, ChevronRight} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore
import { translations } from './translations';
import { UserType, FooterSettings } from './types';
import { api } from './api-client';
import { PublicView } from './Components/PublicView';
import { Auth } from './Components/Auth';
import { Dashboard } from './Components/Dashboard';
import { Chat } from './Components/Chat'; 
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { requestForToken } from './firebase';
 import { Eye, EyeOff } from 'lucide-react'; // تأكد من استيراد أيقونات العين في أعلى الملف


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
  
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  const [addresses, setAddresses] = useState<string[]>([]);
  const [defaultAddress, setDefaultAddress] = useState<string>('');
  const [newAddress, setNewAddress] = useState('');

  const [profileForm, setProfileForm] = useState({ name: '', email: '', password: '', profile_picture: '' });
  const [uploadingImage, setUploadingImage] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const [showChatModal, setShowChatModal] = useState(false);
  const [chatTargetUserId, setChatTargetUserId] = useState<number | null>(null);

  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [recordsTab, setRecordsTab] = useState<'rx' | 'ehr'>('rx');
  const [patientPrescriptions, setPatientPrescriptions] = useState<any[]>([]);
  const [patientEHR, setPatientEHR] = useState<any>({});
  const [loadingRecords, setLoadingRecords] = useState(false);

  const [showPharmacyPicker, setShowPharmacyPicker] = useState(false);
  const [availablePharmacies, setAvailablePharmacies] = useState<any[]>([]);
  const [selectedRxForDispense, setSelectedRxForDispense] = useState<any>(null);

  const t = translations[lang] || translations['ar'];


// أضف هذه المتغيرات
const [showPasswordChange, setShowPasswordChange] = useState(false);
const [currentPassword, setCurrentPassword] = useState('');
const [newPassword, setNewPassword] = useState('');
const [showCurrentPassword, setShowCurrentPassword] = useState(false);
const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prevMode) => {
      const newMode = !prevMode;
      if (newMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('darkMode', 'false');
      }
      return newMode;
    });
  };

  useEffect(() => { document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; document.documentElement.lang = lang; }, [lang]);

  useEffect(() => {
    api.get('/api/auth/me').then(data => { 
      setUser(data.user); 
      setView(data.user.role === 'patient' ? 'public' : 'dashboard');
      const savedAddresses = JSON.parse(localStorage.getItem(`addrs_${data.user.id}`) || '[]');
      const savedDefault = localStorage.getItem(`defAddr_${data.user.id}`) || savedAddresses[0] || '';
      setAddresses(savedAddresses); setDefaultAddress(savedDefault);
      fetchNotifications(); 
    }).catch(() => setView('public')).finally(() => setLoading(false));
    api.get('/api/public/settings').then(data => { if(Object.keys(data).length > 0) setFooterData(data); }).catch(console.error);
  }, []);

  const fetchNotifications = () => { api.get('/api/notifications').then(setNotifications).catch(() => {}); };
  useEffect(() => { if (!user) return; const interval = setInterval(fetchNotifications, 30000); return () => clearInterval(interval); }, [user]);

  const handleOpenNotifications = () => {
    setIsNotifMenuOpen(!isNotifMenuOpen); setIsMenuOpen(false); 
    if (!isNotifMenuOpen && unreadCount > 0) { api.patch('/api/notifications/read').then(() => { setNotifications(prev => prev.map(n => ({ ...n, is_read: true }))); }).catch(console.error); }
  };

  const openChatWithUser = (targetId: number | null = null) => { setChatTargetUserId(targetId); setShowChatModal(true); setIsMenuOpen(false); };

  const openMyRecords = async () => {
    if (!user) return;
    setIsMenuOpen(false); setShowRecordsModal(true); setLoadingRecords(true);
    try {
      const [rxRes, ehrRes] = await Promise.all([ api.get(`/api/prescriptions/patient/${user.id}`), api.get(`/api/medical-records/${user.id}`) ]);
      setPatientPrescriptions(rxRes || []); setPatientEHR(ehrRes || {});
    } catch(err) { console.error(err); } finally { setLoadingRecords(false); }
  };

  const handleDispenseClick = async (rx: any) => {
    setSelectedRxForDispense(rx);
    try { const facs = await api.get('/api/public/facilities'); setAvailablePharmacies(facs.filter((f: any) => f.type === 'pharmacy' && f.doctor_id)); setShowPharmacyPicker(true); } 
    catch(e) { toast.error(lang === 'ar' ? 'حدث خطأ في جلب الصيدليات' : 'Error fetching pharmacies'); }
  };

  const confirmDispenseToPharmacy = async (pharmacy: any) => {
    const msg = `مرحباً، أود صرف الوصفة الطبية التالية من خلال صيدليتكم الموقرة:\n\n👨‍⚕️ الطبيب المعالج: ${selectedRxForDispense.doctor_name} (${selectedRxForDispense.doctor_specialty || 'طبيب'})\n🩺 التشخيص: ${selectedRxForDispense.diagnosis}\n\n💊 الأدوية المطلوبة:\n${selectedRxForDispense.medicines.map((m: any, i:number) => `${i+1}. ${m.name} - الجرعة: ${m.dosage}`).join('\n')}\n\nهل الأدوية متوفرة وكم تكلفتها الإجمالية؟`;
    try {
      await api.post('/api/chat/messages', { receiver_id: pharmacy.doctor_id, content: msg });
      setShowPharmacyPicker(false); setShowRecordsModal(false);
      toast.success(lang === 'ar' ? 'تم إرسال الوصفة للصيدلية بنجاح!' : 'Prescription sent successfully!');
      setTimeout(() => { openChatWithUser(pharmacy.doctor_id); }, 500); 
    } catch (err) { toast.error(lang === 'ar' ? 'فشل إرسال الوصفة' : 'Failed to send'); }
  };

  const handleCurrencyChange = (newCurr: 'old' | 'new') => { setCurrency(newCurr); localStorage.setItem('currency', newCurr); };

  useEffect(() => { if(user) setProfileForm({ name: user.name, email: user.email, password: '', profile_picture: (user as any).profile_picture || '' }); }, [user, showProfileModal]);

  const refreshUser = () => { api.get('/api/auth/me').then(data => setUser(data.user)).catch(console.error); };
  
  const handleLogin = (u: UserType) => { 
    setUser(u); setView(u.role === 'patient' ? 'public' : 'dashboard'); 
    const savedAddresses = JSON.parse(localStorage.getItem(`addrs_${u.id}`) || '[]');
    setAddresses(savedAddresses); setDefaultAddress(localStorage.getItem(`defAddr_${u.id}`) || savedAddresses[0] || '');
    fetchNotifications();
  };

  const handleLogout = async () => { 
    await api.post('/api/auth/logout', {}); 
    setUser(null); setView('public'); setIsMenuOpen(false); setIsNotifMenuOpen(false); setNotifications([]); setShowChatModal(false); setShowRecordsModal(false);
  };

  const submitWalletRequest = async (e: React.FormEvent) => {
    e.preventDefault(); if (isSubmittingWallet) return; setIsSubmittingWallet(true);
    try { await api.post('/api/wallet/request', { type: 'deposit', amount: parseFloat(walletAmount) * 100 }); setShowSuccess(true); setShowWalletModal(false); setWalletAmount(''); } 
    catch(err: any) { toast.error(err.response?.data?.error || err.error || (lang === 'ar' ? 'حدث خطأ' : 'Error occurred')); } 
    finally { setIsSubmittingWallet(false); }
  };

  const handleUpdateProfile = async (e) => {
  e.preventDefault();
  setIsUpdatingProfile(true);
  try {
    const payload = {
      name: profileForm.name,
      email: profileForm.email.toLowerCase().trim(), // 🟢 تحويل للأحرف الصغيرة
      current_password: currentPassword, // 🟢 إرسال كلمة المرور الحالية
      new_password: newPassword          // 🟢 إرسال كلمة المرور الجديدة
    };

    await api.post('/api/auth/update-profile', payload);
    
    toast.success(lang === 'ar' ? 'تم حفظ التغييرات بنجاح!' : 'Profile updated successfully!');
    
    // إخفاء وتصفير حقول كلمة المرور بعد النجاح
    setShowPasswordChange(false);
    setCurrentPassword('');
    setNewPassword('');
    setShowProfileModal(false);
    
    // إذا كان لديك دالة لتحديث بيانات المستخدم محلياً استدعها هنا مثل refreshUser()
  } catch (err) {
    toast.error(err.error || 'حدث خطأ أثناء التحديث');
  } finally {
    setIsUpdatingProfile(false);
  }
};

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setUploadingImage(true);
    try { const url = await uploadImageToImgBB(file); setProfileForm({ ...profileForm, profile_picture: url }); } 
    catch (err: any) { toast.error('فشل الرفع'); } finally { setUploadingImage(false); }
  };

  const addAddress = async () => {
    if(!newAddress.trim() || isAddingAddress) return; setIsAddingAddress(true);
    try {
      const updated = [...addresses, newAddress.trim()]; setAddresses(updated); localStorage.setItem(`addrs_${user?.id}`, JSON.stringify(updated));
      if(!defaultAddress) { setDefaultAddress(newAddress.trim()); localStorage.setItem(`defAddr_${user?.id}`, newAddress.trim()); }
      setNewAddress(''); toast.success(lang === 'ar' ? 'تمت الإضافة' : 'Added');
    } finally { setIsAddingAddress(false); }
  };

  const removeAddress = (addr: string) => {
    const updated = addresses.filter(a => a !== addr); setAddresses(updated); localStorage.setItem(`addrs_${user?.id}`, JSON.stringify(updated));
    if(defaultAddress === addr) { setDefaultAddress(updated[0] || ''); localStorage.setItem(`defAddr_${user?.id}`, updated[0] || ''); }
  };

  const enableNotifications = async () => {
    const toastId = toast.loading(lang === 'ar' ? 'جاري تفعيل الإشعارات...' : 'Enabling notifications...');
    try {
      const token = await requestForToken();
      if (token) {
        await api.post('/api/auth/fcm-token', { fcm_token: token });
        toast.success(lang === 'ar' ? 'تم تفعيل الإشعارات بنجاح! 🔔' : 'Notifications Enabled! 🔔', { id: toastId });
      } else {
        toast.error(lang === 'ar' ? 'الرجاء السماح للإشعارات من إعدادات المتصفح.' : 'Please allow notifications in browser.', { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error(lang === 'ar' ? 'مرفوض! (في الآيفون: يجب إضافة التطبيق للشاشة الرئيسية أولاً)' : 'Failed! (On iOS: Add to Home Screen first)', { id: toastId });
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-slate-50 dark:bg-slate-950 dark:text-slate-100 relative transition-colors duration-300">
      <Toaster position="top-center" reverseOrder={false} />
      
      {view !== 'dashboard' && (
        <nav className="bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-40 backdrop-blur-md shadow-sm transition-colors duration-300">
          <button onClick={() => setView('public')} className="text-xl font-bold flex items-center gap-2 dark:text-white hover:opacity-80 transition-opacity"> 
  <img src="/logo.png" alt="Taiba Health Logo" className="w-9 h-9 md:w-10 md:h-10 object-contain drop-shadow-sm" />
  <span className="text-lg md:text-xl">Taiba Health</span>
</button>
          
          <div className="flex gap-2 md:gap-3 items-center">

            <button onClick={toggleDarkMode} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors" title={lang === 'ar' ? 'الوضع الليلي' : 'Dark Mode'}>
              {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
            </button>

            {user && (
              <button onClick={() => setShowWalletModal(true)} className="hidden sm:flex bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1.5 rounded-full items-center gap-2 text-sm font-bold border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                <Wallet size={16}/> <span dir="ltr">{(parseFloat(user.wallet_balance || '0') / (currency === 'new' ? 100 : 1))} {currency === 'new' ? 'ل.س جديدة' : 'ل.س'}</span>
                <Plus size={14} className="bg-blue-600 text-white rounded-full p-0.5 ml-1" />
              </button>
            )}
            
            <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="hidden sm:block px-3 py-1.5 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">{lang === 'ar' ? 'English' : 'العربية'}</button>
            
            {user ? (
              <div className="flex items-center gap-2 md:gap-3">
                {user.role !== 'patient' && (
                  <button onClick={() => setView('dashboard')} className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors shadow-md">
                    <LayoutDashboard size={16} />
                    <span>{lang === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</span>
                  </button>
                )}

                
                <div className="relative">
                  <button onClick={handleOpenNotifications} className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <Bell size={22} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce border-2 border-white dark:border-slate-900">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {isNotifMenuOpen && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className={`absolute mt-3 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-2 z-50 ${lang === 'ar' ? 'left-0' : 'right-0'}`}>
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                          <h3 className="font-bold text-slate-900 dark:text-white">{lang === 'ar' ? 'الإشعارات' : 'Notifications'}</h3>
                          {unreadCount === 0 && <CheckCircle size={16} className="text-emerald-500" />}
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <p className="text-center text-slate-400 py-8 text-sm">{lang === 'ar' ? 'لا توجد إشعارات.' : 'No notifications yet.'}</p>
                          ) : (
                            notifications.map(notif => (
                              <div key={notif.id} className={`px-4 py-3 border-b border-slate-50 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${!notif.is_read ? 'bg-blue-50/30 dark:bg-blue-900/20' : ''}`}>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">{notif.title}</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-1">{notif.message}</p>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 block text-right" dir="ltr">{new Date(notif.created_at).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative">
                  <button onClick={() => {setIsMenuOpen(!isMenuOpen); setIsNotifMenuOpen(false);}} className="flex items-center gap-2 focus:outline-none rounded-full ring-2 ring-transparent hover:ring-blue-200 transition-all">
                    {(user as any).profile_picture ? (
                      <img src={(user as any).profile_picture} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm" />
                    ) : (
                      <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>

                  <AnimatePresence>
                    {isMenuOpen && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className={`absolute mt-3 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 z-50 ${lang === 'ar' ? 'left-0' : 'right-0'}`}>
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 mb-2 bg-slate-50/50 dark:bg-slate-800/50">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                        </div>
                        
                        {user.role !== 'patient' && (
                          <button onClick={() => { setView('dashboard'); setIsMenuOpen(false); }} className="w-full lg:hidden text-start px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-400 flex items-center gap-3 transition-colors">
                            <LayoutDashboard size={16} /> {lang === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                          </button>
                        )}

                        <button onClick={openMyRecords} className="w-full text-start px-4 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 flex items-center gap-3 transition-colors">
                          <FileSignature size={16} /> {lang === 'ar' ? 'سجلي الطبي ووصفاتي' : 'My EHR & Prescriptions'}
                        </button>

                        <button onClick={() => { setShowProfileModal(true); setIsMenuOpen(false); }} className="w-full text-start px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-400 flex items-center gap-3 transition-colors mt-1">
                          <User size={16} /> {lang === 'ar' ? 'الملف الشخصي' : 'Profile'}
                        </button>
                        
                        <button onClick={() => { setShowSettingsModal(true); setIsMenuOpen(false); }} className="w-full text-start px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-400 flex items-center gap-3 transition-colors">
                          <Settings size={16} /> {lang === 'ar' ? 'الإعدادات' : 'Settings'}
                        </button>

                        <div className="border-t border-slate-100 dark:border-slate-700 mt-2 pt-2">
                          <button onClick={handleLogout} className="w-full text-start px-4 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors">
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
            user={user} refreshUser={refreshUser} lang={lang} t={t} currency={currency} setCurrency={handleCurrencyChange} defaultAddress={defaultAddress} footerData={footerData} openChatWithUser={openChatWithUser}
          />
        )}
        {view === 'login' && <Auth onLogin={handleLogin} onBack={() => setView('public')} t={t} lang={lang} />}
        {view === 'dashboard' && user && <Dashboard user={user} onLogout={handleLogout} onGoToPublic={() => setView('public')} openChatWithUser={openChatWithUser} lang={lang} t={t} />}
        
        <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title={lang === 'ar' ? "تم بنجاح." : "Success."} message={lang === 'ar' ? "شكراً لك." : "Thank you."} />
      
      <AnimatePresence>
  {showWalletModal && (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[110]">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-md relative">
        <button onClick={() => setShowWalletModal(false)} className="absolute top-4 left-4 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><X size={20}/></button>
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"><Wallet size={32}/></div>
        <h3 className="text-xl font-black text-center text-slate-900 dark:text-white mb-2">{lang === 'ar' ? 'شحن رصيد المحفظة' : 'Top up Wallet'}</h3>
        <p className="text-sm text-slate-500 text-center mb-6">{lang === 'ar' ? 'أدخل المبلغ الذي تود شحنه، وسيقوم المسؤول بتأكيد الطلب فور الاستلام.' : 'Enter the amount you want to top up.'}</p>
        
        <form onSubmit={submitWalletRequest} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'المبلغ المراد شحنه (ل.س جديدة)' : 'Amount (L.S)'}</label>
            <div className="relative">
              <input 
                required type="number" 
                className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:border-blue-600 outline-none text-lg font-bold transition-all dark:text-white" 
                placeholder="0.00" 
                value={walletAmount} 
                onChange={e => setWalletAmount(e.target.value)} 
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">{lang === 'ar' ? 'ل.س جديدة' : 'L.S'}</span>
            </div>
          </div>
          <button type="submit" disabled={isSubmittingWallet || !walletAmount} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
            {isSubmittingWallet ? <span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span> : (lang === 'ar' ? 'إرسال طلب الشحن' : 'Submit Request')}
          </button>
        </form>
      </motion.div>
    </div>
  )}
</AnimatePresence>
      </main>

      <AnimatePresence>
        {showChatModal && user && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[90]">
            <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }} className="w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden relative">
              <Chat user={user} lang={lang} onClose={() => setShowChatModal(false)} targetUserId={chatTargetUserId} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRecordsModal && user && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-50 dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="bg-white dark:bg-slate-800 p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center z-10">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Activity className="text-emerald-500" /> {lang === 'ar' ? 'سجلي الطبي ووصفاتي' : 'My Health Records & Rx'}</h2>
                <button onClick={() => setShowRecordsModal(false)} className="p-2 bg-slate-50 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-500 hover:text-red-500 rounded-full transition-colors"><X size={20}/></button>
              </div>
              
              <div className="flex bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
                <button onClick={() => setRecordsTab('rx')} className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${recordsTab === 'rx' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20' : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}><FileSignature size={18}/> {lang === 'ar' ? 'الوصفات الطبية (الروشتات)' : 'Prescriptions'}</button>
                <button onClick={() => setRecordsTab('ehr')} className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${recordsTab === 'ehr' ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20' : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}><Activity size={18}/> {lang === 'ar' ? 'السجل الطبي (EHR)' : 'Medical Record'}</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingRecords ? (
                  <div className="flex justify-center py-20"><span className="animate-spin h-8 w-8 border-4 border-emerald-500 rounded-full border-t-transparent"></span></div>
                ) : recordsTab === 'ehr' ? (
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div><h4 className="text-xs font-bold text-slate-400 mb-1 uppercase">{lang === 'ar' ? 'فصيلة الدم' : 'Blood Type'}</h4><p className="text-lg font-bold text-red-600 dark:text-red-400">{patientEHR?.blood_type || '---'}</p></div>
                      <div><h4 className="text-xs font-bold text-slate-400 mb-1 uppercase">{lang === 'ar' ? 'الحساسية' : 'Allergies'}</h4><p className="text-base font-medium text-slate-800 dark:text-slate-200">{patientEHR?.allergies || (lang==='ar'?'لا يوجد سجل':'None recorded')}</p></div>
                      <div className="md:col-span-2"><h4 className="text-xs font-bold text-slate-400 mb-1 uppercase">{lang === 'ar' ? 'الأمراض المزمنة' : 'Chronic Diseases'}</h4><p className="text-base font-medium text-slate-800 dark:text-slate-200">{patientEHR?.chronic_diseases || '---'}</p></div>
                      <div className="md:col-span-2"><h4 className="text-xs font-bold text-slate-400 mb-1 uppercase">{lang === 'ar' ? 'عمليات جراحية سابقة' : 'Past Surgeries'}</h4><p className="text-base font-medium text-slate-800 dark:text-slate-200">{patientEHR?.past_surgeries || '---'}</p></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {patientPrescriptions.length === 0 ? (
                      <div className="text-center py-16 text-slate-400">
                        <FileSignature size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="font-bold">{lang === 'ar' ? 'لا توجد وصفات طبية مسجلة لك بعد.' : 'No prescriptions recorded yet.'}</p>
                      </div>
                    ) : (
                      patientPrescriptions.map(rx => (
                        <div key={rx.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/20 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start">
                            <div>
                              <h3 className="font-bold text-slate-900 dark:text-white text-lg">د. {rx.doctor_name}</h3>
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">{rx.doctor_specialty}</span>
                            </div>
                            <span className="text-xs font-mono text-slate-500 bg-white dark:bg-slate-700 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600" dir="ltr">{new Date(rx.created_at).toLocaleDateString(lang==='ar'?'ar-EG':'en-US')}</span>
                          </div>
                          <div className="p-5 space-y-4">
                            <div>
                              <h4 className="text-xs font-bold text-slate-400 mb-1">{lang === 'ar' ? 'التشخيص الطبي' : 'Diagnosis'}</h4>
                              <p className="font-bold text-slate-800 dark:text-slate-200">{rx.diagnosis}</p>
                            </div>
                            <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                              <h4 className="text-xs font-bold text-slate-400 mb-3">{lang === 'ar' ? 'الأدوية الموصوفة' : 'Medicines'}</h4>
                              <div className="space-y-2">
                                {rx.medicines.map((med:any, idx:number) => (
                                  <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600">
                                    <div className="font-bold text-slate-800 dark:text-slate-200 text-sm" dir="ltr">{med.name}</div>
                                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 text-right">{med.dosage} - {med.frequency} <br/> <span className="text-[10px]">{med.duration}</span></div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <button onClick={() => handleDispenseClick(rx)} className="w-full mt-4 py-3 bg-emerald-500 text-white rounded-xl font-bold shadow-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
                              <Store size={18}/> {lang === 'ar' ? 'صرف الوصفة من صيدلية' : 'Dispense from Pharmacy'}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPharmacyPicker && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[110]">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-md relative">
              <button onClick={() => setShowPharmacyPicker(false)} className="absolute top-4 left-4 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><X size={20}/></button>
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"><Store size={32}/></div>
              <h3 className="text-xl font-black text-center text-slate-900 dark:text-white mb-2">{lang === 'ar' ? 'اختر صيدلية لصرف الوصفة' : 'Select Pharmacy'}</h3>
              
              <div className="max-h-64 overflow-y-auto space-y-3 pr-2 mb-6 mt-6">
                {availablePharmacies.map(pharmacy => (
                  <button key={pharmacy.id} onClick={() => confirmDispenseToPharmacy(pharmacy)} className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-all text-right group">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block text-base group-hover:text-emerald-700 dark:group-hover:text-emerald-400">{pharmacy.name}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1 mt-1"><MapPin size={12}/> {pharmacy.address}</span>
                    </div>
                    <ChevronRight size={20} className="text-slate-300 group-hover:text-emerald-500 rtl:rotate-180" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold dark:text-white">{lang === 'ar' ? 'الملف الشخصي' : 'Profile'}</h3>
                <button onClick={() => setShowProfileModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                  <X size={20} className="dark:text-slate-300"/>
                </button>
              </div>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                
                {/* 🟢 قسم الصورة الشخصية */}
                <div className="flex flex-col items-center mb-6">
                  <div className="relative group cursor-pointer">
                    {profileForm.profile_picture ? (
                      <img src={profileForm.profile_picture} className="w-24 h-24 rounded-full object-cover border-4 border-slate-50 dark:border-slate-700 shadow-md" />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 flex items-center justify-center text-3xl font-bold border-4 border-white dark:border-slate-800 shadow-md">
                        {profileForm.name?.charAt(0)}
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/50 text-white rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      {uploadingImage ? <span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span> : <Camera size={24} />}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage || isUpdatingProfile} />
                    </label>
                  </div>
                </div>

                {/* 🟢 حقل الاسم */}
                <div>
                  <label className="block text-sm font-bold mb-1 dark:text-slate-300 text-right">{lang === 'ar' ? 'الاسم' : 'Name'}</label>
                  <input required className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:border-blue-500 dark:bg-slate-700 dark:text-white transition-colors" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} disabled={isUpdatingProfile} />
                </div>

                {/* 🟢 حقل الإيميل */}
                <div>
                  <label className="block text-sm font-bold mb-1 dark:text-slate-300 text-right">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
                  <input required type="email" className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:border-blue-500 dark:bg-slate-700 dark:text-white text-left transition-colors" dir="ltr" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} disabled={isUpdatingProfile} />
                </div>

                {/* 🟢 زر التبديل لتغيير كلمة المرور */}
                <div className="border-t border-slate-100 dark:border-slate-700 pt-4 mt-2 text-right">
                  <button 
                    type="button" 
                    onClick={() => setShowPasswordChange(!showPasswordChange)} 
                    className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    {showPasswordChange ? (lang === 'ar' ? 'إلغاء تغيير كلمة المرور' : 'Cancel Password Change') : (lang === 'ar' ? 'تغيير كلمة المرور؟' : 'Change Password?')}
                  </button>
                </div>

                {/* 🟢 حقول كلمة المرور الجديدة (تظهر بلمسة أنيقة) */}
                {showPasswordChange && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl space-y-4 border border-slate-100 dark:border-slate-700">
                    
                    {/* كلمة المرور الحالية */}
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-600 dark:text-slate-400 text-right">
                        {lang === 'ar' ? 'كلمة المرور الحالية (لتأكيد التغيير)' : 'Current Password (required)'}
                      </label>
                      <div className="relative">
                        <input 
                          type={showCurrentPassword ? "text" : "password"} 
                          className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:border-blue-500 dark:bg-slate-800 dark:text-white text-left transition-colors" 
                          dir="ltr" 
                          value={currentPassword} 
                          onChange={(e) => setCurrentPassword(e.target.value)} 
                          disabled={isUpdatingProfile}
                        />
                        <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                          {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* كلمة المرور الجديدة */}
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-600 dark:text-slate-400 text-right">
                        {lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
                      </label>
                      <div className="relative">
                        <input 
                          type={showNewPassword ? "text" : "password"} 
                          className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:border-blue-500 dark:bg-slate-800 dark:text-white text-left transition-colors" 
                          dir="ltr" 
                          value={newPassword} 
                          onChange={(e) => setNewPassword(e.target.value)} 
                          disabled={isUpdatingProfile}
                        />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                  </motion.div>
                )}

                {/* 🟢 زر الحفظ */}
                <button type="submit" disabled={uploadingImage || isUpdatingProfile} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-blue-700 mt-4 flex items-center justify-center gap-2 transition-colors disabled:opacity-70">
                  {isUpdatingProfile ? <span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span> : (lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-slate-900 p-0 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10">
                <h3 className="text-xl font-bold dark:text-white flex items-center gap-2"><Settings className="text-blue-600"/> {lang === 'ar' ? 'الإعدادات' : 'Settings'}</h3>
                <button onClick={() => setShowSettingsModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} className="dark:text-slate-300"/></button>
              </div>

              <div className="flex border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900">
                <button onClick={() => setSettingsTab('addresses')} className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors border-b-2 ${settingsTab === 'addresses' ? 'border-blue-600 text-blue-600 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><MapPin size={18}/> {lang === 'ar' ? 'عناوين التوصيل' : 'Addresses'}</button>
                <button onClick={() => setSettingsTab('currency')} className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors border-b-2 ${settingsTab === 'currency' ? 'border-blue-600 text-blue-600 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><CreditCard size={18}/> {lang === 'ar' ? 'العملة والإشعارات' : 'General'}</button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {settingsTab === 'currency' ? (
                  <div className="space-y-8">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-md flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold flex items-center gap-2 mb-1"><Bell size={18}/> {lang === 'ar' ? 'الإشعارات المباشرة' : 'Push Notifications'}</h4>
                        <p className="text-xs text-blue-100">{lang === 'ar' ? 'تلقى تنبيهات فورية بحالة طلباتك ووصفاتك الطبية.' : 'Get instant alerts for your orders.'}</p>
                      </div>
                      <button onClick={enableNotifications} className="shrink-0 bg-white text-blue-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-50 active:scale-95 transition-all">
                        {lang === 'ar' ? 'تفعيل' : 'Enable'}
                      </button>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 dark:text-slate-200 mb-3">{lang === 'ar' ? 'اختر العملة المفضلة للعرض:' : 'Select Display Currency:'}</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => handleCurrencyChange('new')} className={`py-4 rounded-xl font-bold border-2 transition-all flex flex-col items-center gap-2 ${currency === 'new' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-slate-500'}`}>
                          <span className="text-2xl">💵</span> {lang === 'ar' ? 'ليرة سورية جديدة' : 'New L.S'}
                        </button>
                        <button onClick={() => handleCurrencyChange('old')} className={`py-4 rounded-xl font-bold border-2 transition-all flex flex-col items-center gap-2 ${currency === 'old' ? 'border-slate-800 dark:border-slate-400 bg-slate-800 dark:bg-slate-700 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'}`}>
                          <span className="text-2xl">💰</span> {lang === 'ar' ? 'ليرة سورية قديمة' : 'Old L.S'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'أضف عنوان توصيل جديد' : 'Add New Address'}</label>
                    <div className="flex gap-2 mb-6">
                      <input type="text" className="flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 bg-slate-50 dark:bg-slate-950 dark:text-white" placeholder={lang === 'ar' ? "مثال: دمشق، المزة، شارع 1..." : "e.g. Damascus, Mazzeh..."} value={newAddress} onChange={e => setNewAddress(e.target.value)} disabled={isAddingAddress} />
                      <button onClick={addAddress} disabled={isAddingAddress || !newAddress.trim()} className="bg-blue-600 text-white px-4 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"><Plus size={20}/></button>
                    </div>

                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3">{lang === 'ar' ? 'عناويني المحفوظة:' : 'Saved Addresses:'}</h4>
                    {addresses.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700"><MapPin className="mx-auto mb-2 opacity-50" size={32}/> {lang === 'ar' ? 'لا توجد عناوين محفوظة.' : 'No saved addresses.'}</div>
                    ) : (
                      <div className="space-y-3">
                        {addresses.map((addr, idx) => (
                          <div key={idx} className={`p-4 border-2 rounded-2xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${defaultAddress === addr ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'}`} onClick={() => { setDefaultAddress(addr); localStorage.setItem(`defAddr_${user?.id}`, addr); }}>
                            <div className="flex items-start gap-3 flex-1">
                              <div className={`mt-0.5 ${defaultAddress === addr ? 'text-emerald-500' : 'text-slate-400'}`}>{defaultAddress === addr ? <CheckCircle size={20}/> : <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600"></div>}</div>
                              <p className="font-medium text-slate-800 dark:text-slate-200 leading-snug">{addr}</p>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); removeAddress(addr); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"><Trash2 size={18}/></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <button onClick={() => setShowSettingsModal(false)} className="w-full py-4 bg-slate-800 dark:bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-md">{lang === 'ar' ? 'إغلاق الإعدادات' : 'Close Settings'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 💬 فقاعة خدمة العملاء العائمة المضافة هنا بشكل صحيح! */}
      <button
        onClick={() => {
          if (!user) {
            toast.error(
              lang === 'ar' 
                ? 'يرجى تسجيل الدخول أولاً للتواصل مع خدمة العملاء' 
                : 'Please login first to contact support'
            );
          } else {
            openChatWithUser(null); 
          }
        }}
        className="fixed bottom-6 right-6 z-[9999] flex items-center justify-center w-14 h-14 bg-green-600 text-white rounded-full shadow-2xl hover:bg-green-700 hover:scale-110 transition-all duration-300 group cursor-pointer"
        title={lang === 'ar' ? 'الدعم الفني' : 'Support'}
      >
        <MessageCircle size={28} className="group-hover:animate-pulse" />
        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
      </button>

      <SpeedInsights />
    </div>
  );
}