import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { SuccessModal } from './SuccessModal';
import { Plus, Edit2, Trash2, Calendar, MapPin, Phone, User, LogOut, Settings, Activity, Layout, UploadCloud, Package, FileText, Smile, Wallet, Banknote, Minus, Store, CheckCircle, Stethoscope, X, ShieldAlert, LayoutDashboard, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { UserType, Facility, WorkingHours, FooterSettings, SUPER_ADMINS, DAYS_OF_WEEK_AR, DAYS_OF_WEEK_EN, SPECIALTIES } from '../types';
import { api, uploadImageToImgBB } from '../api-client'; 
import { checkIsOpenNow, LocationPicker, RecenterMap } from '../helpers';
import { ProductsManager } from './ProductsManager';
import { OrdersManager } from './OrdersManager';
import { ServicesManager } from './ServicesManager';
import { WalletRequestsManager } from './WalletRequestsManager';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, body, t }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, body: string, t: any }) => {
  if (!isOpen) return null;
  return ( <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"><motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md text-center max-h-[90vh] overflow-y-auto"><div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={32} /></div><h3 className="text-2xl font-bold text-slate-900 mb-2">{title}</h3><p className="text-slate-500 mb-8">{body}</p><div className="flex gap-3"><button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">{t.cancel}</button><button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors">{t.deleteBtn}</button></div></motion.div></div> );
};

export const Dashboard = ({ user, onLogout, onGoToPublic, lang, t }: { user: UserType, onLogout: () => void, onGoToPublic: () => void, lang: 'ar' | 'en', t: any }) => {
  const [activeTab, setActiveTab] = useState<'facilities' | 'products' | 'orders' | 'services' | 'users' | 'profile' | 'settings' | 'wallet_requests' | 'super_settings' | 'doctor_profile'>('facilities');
  const [facilities, setFacilities] = useState<Facility[]>([]); 
  const [users, setUsers] = useState<any[]>([]);
  
  // 🟢 حالات التحميل لمنع Double Submit
  const [isSubmittingFacility, setIsSubmittingFacility] = useState(false);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [isSubmittingWalletRequest, setIsSubmittingWalletRequest] = useState(false);
  const [isSubmittingAdminWallet, setIsSubmittingAdminWallet] = useState(false);
  const [isSubmittingSuperAdmin, setIsSubmittingSuperAdmin] = useState(false);
  const [isSubmittingSettings, setIsSubmittingSettings] = useState(false);
  const [isSubmittingDoctorProfile, setIsSubmittingDoctorProfile] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  const [superAdmins, setSuperAdmins] = useState<string[]>([]);
  const [newSuperAdmin, setNewSuperAdmin] = useState('');
  const [loadingSuperAdmins, setLoadingSuperAdmins] = useState(false);

  const isSuperAdmin = SUPER_ADMINS.includes(user.email) || superAdmins.includes(user.email);

  const [targetDoctorId, setTargetDoctorId] = useState<number | null>(user.role === 'doctor' || user.role === 'dentist' ? user.id : null);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorForm, setDoctorForm] = useState({ specialty: '', consultation_price: 0, about: '', faqs: [] as any[] });

  useEffect(() => {
    if (targetDoctorId) {
      const targetDoc = users.find(u => u.id === targetDoctorId) || user;
      setDoctorForm({ specialty: targetDoc.specialty || '', consultation_price: targetDoc.consultation_price || 0, about: targetDoc.about || targetDoc.notes || '', faqs: targetDoc.faqs || [] });
    }
  }, [targetDoctorId, users, user]);

  const addFaq = () => setDoctorForm({ ...doctorForm, faqs: [...doctorForm.faqs, { id: Date.now().toString(), question: '', answer: '' }] });
  const updateFaq = (id: string, field: 'question' | 'answer', value: string) => setDoctorForm({ ...doctorForm, faqs: doctorForm.faqs.map(faq => faq.id === id ? { ...faq, [field]: value } : faq) });
  const removeFaq = (id: string) => setDoctorForm({ ...doctorForm, faqs: doctorForm.faqs.filter(faq => faq.id !== id) });

  const handleSaveDoctorProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDoctorId || isSubmittingDoctorProfile) return toast.error(lang === 'ar' ? 'الرجاء اختيار طبيب' : 'Select a doctor');
    setIsSubmittingDoctorProfile(true);
    try {
      if (isSuperAdmin && targetDoctorId !== user.id) await api.put(`/api/admin/users/${targetDoctorId}`, doctorForm);
      else await api.post('/api/doctor/update-profile', { ...doctorForm, user_id: targetDoctorId });
      toast.success(lang === 'ar' ? 'تم حفظ الملف الشخصي بنجاح' : 'Profile saved successfully');
      loadData(); 
    } catch (err: any) { toast.error(err.response?.data?.error || err.error || 'حدث خطأ.'); }
    finally { setIsSubmittingDoctorProfile(false); }
  };

  useEffect(() => { api.get('/api/admin/super-admins').then(setSuperAdmins).catch(() => {}); }, []);

  const hasEcommerce = facilities.some(f => f.is_ecommerce_enabled);
  const dashboardTitle = (user.role === 'doctor' || user.role === 'dentist') ? (lang === 'ar' ? 'عياداتي ومواعيدي' : 'My Clinics') : (user.role === 'pharmacist' ? (lang === 'ar' ? 'صيدلياتي ومواعيدي' : 'My Pharmacies') : (lang === 'ar' ? 'إدارة المنشآت الطبية' : 'Manage Facilities'));
  const addButtonText = (user.role === 'doctor' || user.role === 'dentist') ? (lang === 'ar' ? 'إضافة عيادة' : 'Add Clinic') : (user.role === 'pharmacist' ? (lang === 'ar' ? 'إضافة صيدلية' : 'Add Pharmacy') : (lang === 'ar' ? 'إضافة منشأة' : 'Add Facility'));

  const [profileEmail, setProfileEmail] = useState(user.email); const [profileName, setProfileName] = useState(user.name); const [profilePhone, setProfilePhone] = useState(user.phone || ''); const [profileNotes, setProfileNotes] = useState(user.notes || ''); const [profileCurrentPassword, setProfileCurrentPassword] = useState(''); const [profileNewPassword, setProfileNewPassword] = useState('');
  const [footerForm, setFooterForm] = useState<FooterSettings>({ copyright: '', description: '', facebook: '', instagram: '', contact_phone: '', complaints_phone: '' });
  const defaultWorkingHours: Record<string, WorkingHours> = {}; for(let i=0; i<7; i++) defaultWorkingHours[i.toString()] = { isOpen: true, start: "08:00", end: "22:00" };
  const [showModal, setShowModal] = useState(false); const [editingData, setEditingData] = useState<Facility | null>(null); const [form, setForm] = useState<any>({ name: '', address: '', phone: '', type: user.role === 'dentist' ? 'dental_clinic' : (user.role === 'doctor' ? 'clinic' : 'pharmacy'), latitude: 35.25, longitude: 36.7, whatsapp_phone: '', pharmacist_name: '', specialty: '', services: '', consultation_fee: 0, waiting_time: '15 دقيقة', image_url: '', doctor_id: 0, working_hours: defaultWorkingHours });
  const [showUserModal, setShowUserModal] = useState(false); const [editingUser, setEditingUser] = useState<UserType | null>(null); const [userForm, setUserForm] = useState({ email: '', password: '', role: 'pharmacist' as any, name: '', pharmacy_limit: 10, phone: '', notes: '', wallet_balance: 0, is_active: false });
  const [doctorFilter, setDoctorFilter] = useState<number>(0);
  const [confirmData, setConfirmData] = useState<{ isOpen: boolean, onConfirm: () => void, title: string, body: string }>({ isOpen: false, onConfirm: () => {}, title: '', body: '' });
  const openConfirm = (title: string, body: string, onConfirm: () => void) => setConfirmData({ isOpen: true, onConfirm, title, body });
  const [generatedKey, setGeneratedKey] = useState<string | null>(null); const [uploadingImage, setUploadingImage] = useState(false);
  
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState({ isOpen: false, title: '', message: '' });
  const [walletActionType, setWalletActionType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [walletAmount, setWalletAmount] = useState('');

  const [adminWalletModal, setAdminWalletModal] = useState<{isOpen: boolean, userId: number | null}>({isOpen: false, userId: null});
  const [adminWalletAmount, setAdminWalletAmount] = useState('');
  const [adminWalletAction, setAdminWalletAction] = useState<'deposit' | 'withdrawal'>('deposit');

  const loadData = async () => { 
    if (activeTab === 'facilities' || activeTab === 'services') api.get('/api/pharmacies').then(setFacilities); 
    if ((activeTab === 'users' || activeTab === 'doctor_profile') && (user.role === 'admin' || isSuperAdmin)) {
      api.get('/api/admin/users').then(setUsers); 
    }
    if (activeTab === 'settings' && isSuperAdmin) api.get('/api/public/settings').then(data => setFooterForm(data)); 
    if (activeTab === 'super_settings' && isSuperAdmin) fetchSuperAdmins();
  };
  
  useEffect(() => { loadData(); }, [activeTab]);

  const fetchSuperAdmins = async () => {
    setLoadingSuperAdmins(true);
    try { const data = await api.get('/api/admin/super-admins'); setSuperAdmins(data); } catch (err: any) { console.error(err); }
    setLoadingSuperAdmins(false);
  };

  const handleAddSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuperAdmin.trim() || !newSuperAdmin.includes('@') || isSubmittingSuperAdmin) return toast.error(lang === 'ar' ? 'إيميل غير صالح' : 'Invalid email');
    setIsSubmittingSuperAdmin(true);
    try { await api.post('/api/admin/super-admins', { email: newSuperAdmin.trim() }); toast.success(lang === 'ar' ? 'تمت الإضافة بنجاح' : 'Super Admin added'); setNewSuperAdmin(''); fetchSuperAdmins(); } 
    catch (err: any) { toast.error(err.error || 'حدث خطأ'); }
    finally { setIsSubmittingSuperAdmin(false); }
  };

  const handleRemoveSuperAdmin = async (emailToRemove: string) => {
    if(!confirm(lang === 'ar' ? `هل أنت متأكد من سحب الصلاحيات من ${emailToRemove}؟` : 'Are you sure?')) return;
    try { await api.delete(`/api/admin/super-admins/${emailToRemove}`); toast.success(lang === 'ar' ? 'تم سحب الصلاحيات بنجاح' : 'Privileges revoked'); fetchSuperAdmins(); } 
    catch (err: any) { toast.error(err.response?.data?.error || err.error || 'حدث خطأ'); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; setUploadingImage(true); try { const url = await uploadImageToImgBB(file); setForm({ ...form, image_url: url }); toast.success(lang === 'ar' ? 'تم رفع الصورة بنجاح' : 'Image uploaded'); } catch (err: any) { toast.error(err.message || (lang === 'ar' ? 'خطأ في الرفع' : 'Upload error')); } finally { setUploadingImage(false); } };
  
  const handleSaveFacility = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (isSubmittingFacility) return;
    setIsSubmittingFacility(true);
    const payload = { ...form }; if (user.role !== 'admin') delete payload.doctor_id; 
    try { if (editingData) await api.put(`/api/pharmacies/${editingData.id}`, payload); else await api.post('/api/pharmacies', payload); setShowModal(false); loadData(); toast.success(lang === 'ar' ? 'تم حفظ البيانات بنجاح' : 'Saved successfully'); } 
    catch (err: any) { toast.error(err.error || (lang === 'ar' ? 'خطأ في الحفظ!' : 'Save error!')); }
    finally { setIsSubmittingFacility(false); }
  };

  const setManualStatus = async (id: number, status: 'open' | 'closed' | 'auto') => { try { await api.patch(`/api/pharmacies/${id}/status`, { manual_status: status }); loadData(); toast.success(lang === 'ar' ? 'تم تحديث حالة الدوام' : 'Status updated'); } catch(err: any) { toast.error(lang === 'ar' ? 'حدث خطأ' : 'Error occurred'); } };
  const toggleEcommerce = async (id: number, currentStatus: boolean) => { try { await api.patch(`/api/pharmacies/${id}/ecommerce`, { is_ecommerce_enabled: !currentStatus }); loadData(); toast.success(lang === 'ar' ? 'تم تعديل حالة المتجر' : 'Store updated'); } catch(err: any) { toast.error(lang === 'ar' ? 'ممنوع' : 'Forbidden'); } };
  const generateActivationKey = async () => { setGeneratedKey(null); try { const res = await api.post('/api/admin/generate-key', {}); setTimeout(() => setGeneratedKey(res.key), 100); toast.success(lang === 'ar' ? 'تم توليد مفتاح جديد' : 'Key generated'); } catch (err: any) { toast.error(lang === 'ar' ? 'خطأ' : 'Error'); } };
  const approveUser = async (id: number) => { try { await api.patch(`/api/admin/users/${id}/approve`); setUsers(users.map(u => u.id === id ? { ...u, is_active: true } : u)); toast.success(lang === 'ar' ? 'تم تفعيل المستخدم' : 'User approved'); } catch (err) { toast.error(lang === 'ar' ? 'خطأ' : 'Error'); } };
  
  const handleSaveUser = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (isSubmittingUser) return;
    setIsSubmittingUser(true);
    try { if (editingUser) await api.put(`/api/admin/users/${editingUser.id}`, userForm); else await api.post('/api/admin/users', userForm); setShowUserModal(false); setEditingUser(null); loadData(); toast.success(lang === 'ar' ? 'تم حفظ بيانات المستخدم' : 'User saved'); } 
    catch (err: any) { toast.error(err.error); }
    finally { setIsSubmittingUser(false); }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (isSubmittingProfile) return;
    setIsSubmittingProfile(true);
    try { const res = await api.post('/api/auth/update-profile', { email: profileEmail, name: profileName, currentPassword: profileCurrentPassword, newPassword: profileNewPassword, phone: profilePhone, notes: profileNotes }); toast.success(res.verificationRequired ? t.verificationSent : t.profileUpdated); setProfileCurrentPassword(''); setProfileNewPassword(''); } 
    catch (err: any) { toast.error(err.error); }
    finally { setIsSubmittingProfile(false); }
  };

  const handleSaveFooter = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (isSubmittingSettings) return;
    setIsSubmittingSettings(true);
    try { await api.put('/api/admin/settings', footerForm); toast.success(lang === 'ar' ? 'تم حفظ إعدادات الفوتر بنجاح' : 'Footer settings saved'); } 
    catch(err: any) { toast.error(lang === 'ar' ? 'فشل الحفظ' : 'Save failed'); }
    finally { setIsSubmittingSettings(false); }
  };

  const submitAdminWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!adminWalletModal.userId || !adminWalletAmount || isSubmittingAdminWallet) return;
    setIsSubmittingAdminWallet(true);
    try { 
      const finalAmount = adminWalletAction === 'deposit' ? parseFloat(adminWalletAmount) * 100 : -parseFloat(adminWalletAmount) * 100;
      await api.post(`/api/admin/wallet/${adminWalletModal.userId}`, { amount: finalAmount }); 
      loadData(); 
      toast.success(lang === 'ar' ? 'تم تعديل الرصيد بنجاح!' : 'Balance updated!'); 
      setAdminWalletModal({isOpen: false, userId: null});
      setAdminWalletAmount('');
      setAdminWalletAction('deposit');
    } catch(err) { toast.error(lang === 'ar' ? 'خطأ في العملية' : 'Error'); }
    finally { setIsSubmittingAdminWallet(false); }
  };

  const submitWalletRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingWalletRequest) return;
    setIsSubmittingWalletRequest(true);
    try {
      await api.post('/api/wallet/request', { type: walletActionType, amount: parseFloat(walletAmount) * 100 });
      setSuccessModalData({ isOpen: true, title: lang === 'ar' ? 'تم إرسال طلبك للإدارة بنجاح.' : 'Request sent successfully.', message: lang === 'ar' ? 'شكراً لتواصلكم معنا.' : 'Thank you for contacting us.' });
      setShowWalletModal(false); setWalletAmount('');
    } catch(err: any) { 
      toast.error(err.response?.data?.error || err.error || (lang === 'ar' ? 'حدث خطأ' : 'Error occurred')); 
    } finally { setIsSubmittingWalletRequest(false); }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col md:flex-row w-full overflow-hidden">
     <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0 md:sticky md:top-0 md:h-screen z-20">
        <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900 hidden lg:flex items-center gap-2">Taiba Health</h1>
          <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
             <button onClick={onGoToPublic} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors shadow-sm border border-emerald-200">
               <LayoutDashboard size={16} /> {lang === 'ar' ? 'الرئيسية' : 'Home'}
             </button>
             <button onClick={onLogout} className="md:hidden p-2 rounded-lg bg-red-50 text-red-600"><LogOut size={18} /></button>
          </div>
        </div>
        
        <div className="mx-4 mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-200 relative overflow-hidden">
          <div className="flex justify-between items-center mb-1 relative z-10">
            <div className="flex items-center gap-2 text-blue-100"><Wallet size={16}/> <span className="text-xs font-bold">{lang === 'ar' ? 'رصيد المحفظة' : 'Wallet Balance'}</span></div>
            <div className="flex gap-1">
              <button onClick={() => {setWalletActionType('deposit'); setShowWalletModal(true);}} className="bg-white/20 hover:bg-white/30 text-white rounded p-1 transition-colors"><Plus size={16}/></button>
              {(user.role === 'doctor' || user.role === 'dentist' || user.role === 'pharmacist') && (
                <button onClick={() => {setWalletActionType('withdrawal'); setShowWalletModal(true);}} className="bg-white/20 hover:bg-white/30 text-white rounded p-1 transition-colors"><Minus size={16}/></button>
              )}
            </div>
          </div>
          <div className="text-xl font-extrabold relative z-10" dir="ltr">{(parseFloat(user.wallet_balance || '0') / 100).toLocaleString()} ل.س جديدة </div>
        </div>

        <nav className="flex-none md:flex-1 p-3 md:p-4 flex flex-row md:flex-col gap-2 overflow-x-auto whitespace-nowrap flex-nowrap scrollbar-hide mt-2">
          {user.role !== 'patient' && <button onClick={() => setActiveTab('facilities')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'facilities' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><MapPin size={18} /> {dashboardTitle}</button>}
          {(user.role === 'admin' || user.role === 'doctor' || user.role === 'dentist') && (<button onClick={() => setActiveTab('services')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'services' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><Activity size={18} /> {lang === 'ar' ? 'الخدمات التي أقدمها' : 'My Services'}</button>)}
          {(user?.role === 'doctor' || user?.role === 'dentist' || isSuperAdmin) && (
            <button onClick={() => setActiveTab('doctor_profile')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'doctor_profile' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}>
              <User size={18} />
              {lang === 'ar' ? (isSuperAdmin ? 'إدارة ملفات الأطباء' : 'ملف الطبيب الشخصي') : 'Doctor Profiles'}
            </button>
          )}

          {(user.role === 'admin' || hasEcommerce) && (<><button onClick={() => setActiveTab('products')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'products' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><Package size={18} /> {lang === 'ar' ? 'إدارة المنتجات' : 'Products Manager'}</button><button onClick={() => setActiveTab('orders')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><FileText size={18} /> {lang === 'ar' ? 'طلبات الزبائن' : 'Customer Orders'}</button></>)}
          {user.role === 'admin' && <button onClick={() => setActiveTab('users')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><User size={18} /> {t.userManagement}</button>}
          {isSuperAdmin && <button onClick={() => setActiveTab('wallet_requests')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'wallet_requests' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><Banknote size={18} /> {lang === 'ar' ? 'طلبات المحفظة' : 'Wallet Requests'}</button>}
          {isSuperAdmin && <button onClick={() => setActiveTab('settings')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><Layout size={18} /> {lang === 'ar' ? 'إعدادات الفوتر' : 'Footer Settings'}</button>}
          {isSuperAdmin && <button onClick={() => { setActiveTab('super_settings'); fetchSuperAdmins(); }} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'super_settings' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:bg-slate-50'}`}><ShieldAlert size={18} /> {lang === 'ar' ? 'غرفة السوبر آدمن' : 'Super Admins'}</button>}
          <button onClick={() => setActiveTab('profile')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><Settings size={18} /> {t.profileSettings}</button>
          
        </nav>
        <div className="hidden md:block p-4 border-t border-slate-100 mt-auto"><div className="flex items-center gap-3 px-4 py-3 mb-2"><div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold shrink-0">{user.name[0]}</div><div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-900 truncate">{user.name}</p><p className="text-xs text-slate-500 capitalize">{user.role === 'admin' ? t.admin : (user.role === 'dentist' ? (lang === 'ar' ? 'طبيب أسنان' : 'Dentist') : (user.role === 'doctor' ? t.doctor : (user.role === 'pharmacist' ? t.pharmacist : 'مريض')))}</p></div></div><button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"><LogOut size={18} /> {t.logout}</button></div>
      </div>

      <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'facilities' && user.role !== 'patient' && (
            <motion.div key="facilities" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
                <div><h2 className="text-2xl md:text-3xl font-bold text-slate-900">{dashboardTitle}</h2></div>
                <div className="flex flex-wrap gap-2 md:gap-4 w-full sm:w-auto">
                  {user.role === 'admin' && <select className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={doctorFilter} onChange={e => setDoctorFilter(parseInt(e.target.value))}><option value="0">{t.allDoctors}</option>{users.filter(u => u.role !== 'admin' && u.role !== 'patient').map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>}
                  <button onClick={() => { setEditingData(null); setForm({ name: '', address: '', phone: '', type: user.role === 'dentist' ? 'dental_clinic' : (user.role === 'doctor' ? 'clinic' : 'pharmacy'), latitude: 35.25, longitude: 36.7, whatsapp_phone: '', pharmacist_name: '', specialty: '', services: '', consultation_fee: 0, waiting_time: '15 دقيقة', image_url: '', doctor_id: 0, working_hours: defaultWorkingHours }); setShowModal(true); }} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"><Plus size={20} /> {addButtonText}</button>
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
                {facilities.filter(p => doctorFilter === 0 || p.doctor_id === doctorFilter).map(f => {
                  const isOpenNow = checkIsOpenNow(f);
                  return (
                    <div key={f.id} className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4 gap-2">
                        <div className="flex items-center gap-4">
                          {f.image_url ? <img src={f.image_url} className="w-14 h-14 rounded-xl object-cover border border-slate-100"/> : <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center"><Store size={24}/></div>}
                          <div><span className={`text-[10px] px-2 py-1 rounded-full font-bold inline-block mb-1 ${f.type === 'clinic' ? 'bg-indigo-100 text-indigo-700' : (f.type === 'dental_clinic' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700')}`}>{f.type === 'clinic' ? (lang === 'ar' ? 'عيادة طبية' : 'Clinic') : (f.type === 'dental_clinic' ? (lang === 'ar' ? 'عيادة أسنان' : 'Dental Clinic') : (lang === 'ar' ? 'صيدلية' : 'Pharmacy'))}</span><h3 className="text-lg font-bold text-slate-900 line-clamp-1">{f.name}</h3></div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {isOpenNow ? <span className="bg-emerald-500 text-white text-xs px-3 py-1 rounded-lg font-bold animate-pulse">{lang === 'ar' ? 'مفتوح الآن' : 'Open'}</span> : <span className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-lg font-bold">{lang === 'ar' ? 'مغلق حالياً' : 'Closed'}</span>}
                          {isSuperAdmin && f.type === 'pharmacy' && (
                            <button onClick={() => toggleEcommerce(f.id, f.is_ecommerce_enabled || false)} className={`text-[10px] px-2 py-1 rounded-md font-bold mt-2 ${f.is_ecommerce_enabled ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{lang === 'ar' ? 'المتجر: ' : 'Store: '}{f.is_ecommerce_enabled ? (lang === 'ar' ? 'مفعل' : 'ON') : (lang === 'ar' ? 'معطل' : 'OFF')}</button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 text-slate-600 mb-4 mt-4 pt-4 border-t border-slate-100">
                        {(f.type === 'clinic' || f.type === 'dental_clinic') && f.specialty && <p className="flex items-center gap-2 text-sm font-bold text-indigo-600 mb-1"><Stethoscope size={14} className="shrink-0"/> <span className="truncate">{f.specialty}</span></p>}
                        <p className="flex items-center gap-2 text-sm"><MapPin size={14} className="shrink-0"/> <span className="truncate">{f.address}</span></p>
                        <p className="flex items-center gap-2 text-sm"><Phone size={14} className="shrink-0"/> <span className="truncate">{f.phone}</span></p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl mt-4 flex flex-col sm:flex-row items-center gap-2 border border-slate-100">
                        <span className="text-xs font-bold text-slate-500 mb-2 sm:mb-0 sm:ml-2 w-full sm:w-auto text-center sm:text-right">{lang === 'ar' ? 'الدوام اليدوي:' : 'Manual Status:'}</span>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button onClick={() => setManualStatus(f.id, 'open')} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${f.manual_status==='open' ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-200' : 'bg-white border text-slate-600'}`}>{lang === 'ar' ? 'مفتوح دائماً' : 'Always Open'}</button>
                          <button onClick={() => setManualStatus(f.id, 'closed')} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${f.manual_status==='closed' ? 'bg-red-500 text-white shadow-sm ring-2 ring-red-200' : 'bg-white border text-slate-600'}`}>{lang === 'ar' ? 'مغلق دائماً' : 'Always Closed'}</button>
                          <button onClick={() => setManualStatus(f.id, 'auto')} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!f.manual_status || f.manual_status==='auto' ? 'bg-indigo-500 text-white shadow-sm ring-2 ring-indigo-200' : 'bg-white border text-slate-600'}`}>{lang === 'ar' ? 'حسب الجدول' : 'Auto'}</button>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-4 mt-4 border-t border-slate-100"><button onClick={() => { setEditingData(f); setForm({...f, working_hours: f.working_hours || defaultWorkingHours}); setShowModal(true); }} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"><Edit2 size={14} /> {lang === 'ar' ? 'تعديل البيانات' : 'Edit'}</button><button onClick={() => openConfirm(t.confirmTitle, t.confirmBody, async () => { await api.delete(`/api/pharmacies/${f.id}`); loadData(); toast.success('تم الحذف بنجاح'); })} className="px-4 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"><Trash2 size={14} /></button></div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'services' && (<motion.div key="services" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ServicesManager user={user} facilities={facilities.filter(f => f.type === 'clinic' || f.type === 'dental_clinic')} lang={lang} /></motion.div>)}
          {activeTab === 'products' && (<motion.div key="products" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ProductsManager user={user} facilities={facilities.filter(f => f.type === 'pharmacy')} lang={lang} /></motion.div>)}
          {activeTab === 'orders' && (<motion.div key="orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><OrdersManager user={user} facilities={facilities.filter(f => f.type === 'pharmacy')} lang={lang} /></motion.div>)}
          {activeTab === 'wallet_requests' && (<motion.div key="wallet_requests" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><WalletRequestsManager user={user} lang={lang} /></motion.div>)}
          
          {activeTab === 'super_settings' && isSuperAdmin && (
            <motion.div key="super_settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-r from-purple-900 to-indigo-800 rounded-3xl p-6 md:p-8 mb-8 text-white shadow-xl flex items-center gap-4">
                <ShieldAlert size={48} className="text-purple-300 opacity-80 hidden sm:block" />
                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold mb-2">{lang === 'ar' ? 'غرفة التحكم العليا' : 'Supreme Control Room'}</h2>
                  <p className="text-purple-200 text-sm">{lang === 'ar' ? 'انتبه: من تضيفه هنا سيملك تحكماً كاملاً ومطلقاً بالنظام وقواعد البيانات.' : 'Warning: Absolute power granted to members here.'}</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
                <form onSubmit={handleAddSuperAdmin} className="flex flex-col sm:flex-row gap-3 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <input type="email" placeholder={lang === 'ar' ? "أدخل إيميل المدير الجديد (مثل: admin@mail.com)" : "New Super Admin Email..."} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 text-left" dir="ltr" value={newSuperAdmin} onChange={e => setNewSuperAdmin(e.target.value)} required disabled={isSubmittingSuperAdmin} />
                  <button type="submit" disabled={isSubmittingSuperAdmin} className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    {isSubmittingSuperAdmin ? <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span> : <Plus size={20}/>} 
                    {lang === 'ar' ? 'ترقية لمدير خارق' : 'Promote'}
                  </button>
                </form>

                <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2"><User size={20} className="text-purple-600"/> {lang === 'ar' ? 'المديرون الخارقون الحاليون' : 'Current Super Admins'}</h3>
                
                {loadingSuperAdmins ? (
                  <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-purple-600"></div></div>
                ) : (
                  <div className="space-y-3">
                    {superAdmins.map((email) => (
                      <div key={email} className="flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-purple-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-lg">{email[0].toUpperCase()}</div>
                          <span className="font-bold text-slate-700 text-base md:text-lg tracking-wide" dir="ltr">{email}</span>
                        </div>
                        <button onClick={() => handleRemoveSuperAdmin(email)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={20} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && user.role === 'admin' && (
            <motion.div key="users" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8"><div><h2 className="text-2xl md:text-3xl font-bold text-slate-900">{t.userManagement}</h2></div><div className="flex flex-wrap gap-3 w-full sm:w-auto">{isSuperAdmin && <button onClick={generateActivationKey} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-indigo-50 text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-100 transition-colors">توليد مفتاح تفعيل</button>}<button onClick={() => { setEditingUser(null); setUserForm({ email: '', password: '', role: 'pharmacist', name: '', pharmacy_limit: 10, phone: '', notes: '', wallet_balance: 0, is_active: false }); setShowUserModal(true); }} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"><Plus size={20} /> {t.createUser}</button></div></div>
              
              {generatedKey && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 md:p-6 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                  <div>
                    <p className="text-sm text-emerald-800 font-bold mb-1">{lang === 'ar' ? 'تم توليد المفتاح بنجاح! انسخه وأرسله للمستخدم:' : 'New Activation Key:'}</p>
                    <p className="text-xl md:text-2xl font-mono font-extrabold text-emerald-900 select-all tracking-wider" dir="ltr">{generatedKey}</p>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(generatedKey); toast.success(lang === 'ar' ? 'تم نسخ المفتاح للحافظة' : 'Key copied to clipboard'); }} className="shrink-0 bg-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-md">
                    {lang === 'ar' ? 'نسخ المفتاح' : 'Copy Key'}
                  </button>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {users.map(u => {
                  const isTargetSuperAdmin = SUPER_ADMINS.includes(u.email) || superAdmins.includes(u.email); const canEditTarget = !isTargetSuperAdmin || u.email === user.email; const canDeleteTarget = !isTargetSuperAdmin; 
                  return (
                    <div key={u.id} className={`p-5 md:p-6 rounded-2xl border shadow-sm flex flex-col gap-4 ${!u.is_active ? 'bg-yellow-50/50 border-yellow-200' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 font-bold text-xl shrink-0">{u.name[0]}</div><div className="flex-1 min-w-0"><div className="flex justify-between items-start"><span className="font-bold text-slate-900 truncate text-left text-base md:text-lg">{u.name}</span>{!u.is_active && <span className="shrink-0 px-2 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full mr-2">Pending</span>}</div><p className="text-xs md:text-sm text-slate-500 truncate mt-1" dir="ltr">{u.email}</p><div className="flex gap-2 mt-2 flex-wrap"><span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isTargetSuperAdmin ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span><span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-wider">{(parseFloat(u.wallet_balance || '0') / 100).toLocaleString()} ل.س جديدة </span></div></div></div>
                      <div className="flex gap-2 border-t border-slate-100 pt-4 mt-auto">
                        {!u.is_active && <button onClick={() => approveUser(u.id)} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"><CheckCircle size={14} /> تفعيل</button>}
                        {isSuperAdmin && <button onClick={() => setAdminWalletModal({isOpen: true, userId: u.id})} className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1"><Banknote size={14} /> الرصيد</button>}
                        {u.is_active && canEditTarget && <button onClick={() => { 
                          setEditingUser(u); 
                          setUserForm({ email: u.email, password: '', role: u.role, name: u.name, phone: u.phone || '', notes: u.notes || '', wallet_balance: u.wallet_balance || 0, is_active: u.is_active || false, pharmacy_limit: 10 }); 
                          setShowUserModal(true); 
                        }} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center"><Edit2 size={16} /></button>}
                        {canDeleteTarget && <button onClick={() => openConfirm(t.confirmTitle, 'هل أنت متأكد؟', async () => { await api.delete(`/api/admin/users/${u.id}`); loadData(); toast.success('تم حذف المستخدم'); })} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
          
          {activeTab === 'settings' && isSuperAdmin && (
            <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto pb-12">
              <div className="flex items-center gap-3 mb-6"><Layout size={32} className="text-blue-600" /><div><h2 className="text-2xl md:text-3xl font-bold text-slate-900">{lang === 'ar' ? 'إعدادات الفوتر' : 'Footer Settings'}</h2><p className="text-sm text-slate-500 mt-1">{lang === 'ar' ? 'أي حقل تتركه فارغاً هنا، سيتم إخفاؤه تلقائياً من الفوتر في واجهة المستخدم.' : 'Leave any field empty to hide it from the public footer.'}</p></div></div>
              <form onSubmit={handleSaveFooter} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                <div>
                  <h3 className="font-bold text-lg mb-4 text-blue-600 border-b pb-2">{lang === 'ar' ? 'الروابط الرئيسية' : 'Main Links'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold mb-1 text-slate-500">{lang === 'ar' ? 'اسم التطبيق / الشعار' : 'App Name'}</label><input type="text" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={footerForm.appName || ''} onChange={e => setFooterForm({...footerForm, appName: e.target.value})} placeholder="Taibet Health" /></div>
                    <div><label className="block text-xs font-bold mb-1 text-slate-500">{lang === 'ar' ? 'رابط (من نحن)' : 'About Us'}</label><input type="text" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.aboutLink || ''} onChange={e => setFooterForm({...footerForm, aboutLink: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold mb-1 text-slate-500">{lang === 'ar' ? 'رابط (فريق العمل)' : 'Team'}</label><input type="text" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.teamLink || ''} onChange={e => setFooterForm({...footerForm, teamLink: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold mb-1 text-slate-500">{lang === 'ar' ? 'رابط (وظائف)' : 'Careers'}</label><input type="text" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.careersLink || ''} onChange={e => setFooterForm({...footerForm, careersLink: e.target.value})} /></div>
                    <div className="md:col-span-2"><label className="block text-xs font-bold mb-1 text-slate-500">{lang === 'ar' ? 'رابط (انضم إلى الأطباء)' : 'Join Doctors'}</label><input type="text" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.doctorJoinLink || ''} onChange={e => setFooterForm({...footerForm, doctorJoinLink: e.target.value})} /></div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-4 text-blue-600 border-b pb-2">{lang === 'ar' ? 'روابط المساعدة والسياسات' : 'Help & Policies'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold mb-1 text-slate-500">{lang === 'ar' ? 'رابط (مكتبة طبية)' : 'Medical Library'}</label><input type="text" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.libraryLink || ''} onChange={e => setFooterForm({...footerForm, libraryLink: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold mb-1 text-slate-500">{lang === 'ar' ? 'رابط (اتصل بنا)' : 'Contact Us'}</label><input type="text" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.contactLink || ''} onChange={e => setFooterForm({...footerForm, contactLink: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold mb-1 text-slate-500">{lang === 'ar' ? 'رابط (شروط الاستخدام)' : 'Terms of Use'}</label><input type="text" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.termsLink || ''} onChange={e => setFooterForm({...footerForm, termsLink: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold mb-1 text-slate-500">{lang === 'ar' ? 'رابط (اتفاقية الخصوصية)' : 'Privacy Policy'}</label><input type="text" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.privacyLink || ''} onChange={e => setFooterForm({...footerForm, privacyLink: e.target.value})} /></div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-4 text-blue-600 border-b pb-2">{lang === 'ar' ? 'التطبيقات والسوشيال ميديا' : 'Apps & Social'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold mb-1 text-slate-500">Google Play Link</label><input type="text" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.androidLink || ''} onChange={e => setFooterForm({...footerForm, androidLink: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold mb-1 text-slate-500">App Store Link</label><input type="text" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.iosLink || ''} onChange={e => setFooterForm({...footerForm, iosLink: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold mb-1 text-slate-500">Facebook Link</label><input type="text" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.facebook || ''} onChange={e => setFooterForm({...footerForm, facebook: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold mb-1 text-slate-500">Instagram Link</label><input type="text" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.instagram || ''} onChange={e => setFooterForm({...footerForm, instagram: e.target.value})} /></div>
                    <div className="md:col-span-2"><label className="block text-xs font-bold mb-1 text-slate-500">X (Twitter) Link</label><input type="text" className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.twitter || ''} onChange={e => setFooterForm({...footerForm, twitter: e.target.value})} /></div>
                  </div>
                </div>
                <button type="submit" disabled={isSubmittingSettings} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg mt-4 text-lg disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmittingSettings ? <span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span> : null}
                  {lang === 'ar' ? 'حفظ إعدادات الفوتر والتطبيق' : 'Save All Settings'}
                </button>
              </form>
            </motion.div>
          )}

          {activeTab === 'doctor_profile' && (user?.role === 'doctor' || user?.role === 'dentist' || isSuperAdmin) && (
            <motion.div key="doctor_profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto pb-12">
              <div className="flex items-center gap-3 mb-8">
                <Stethoscope size={32} className="text-blue-600" />
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{lang === 'ar' ? 'إدارة الملف الشخصي للطبيب' : 'Manage Doctor Profile'}</h2>
                  <p className="text-slate-500 text-sm mt-1">{lang === 'ar' ? 'تعديل التخصص، سعر الكشف، والأسئلة الشائعة للمرضى.' : 'Update specialty, consultation fee, and FAQs.'}</p>
                </div>
              </div>

              {isSuperAdmin && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-8">
                   <h3 className="font-bold text-slate-800 mb-4">{lang === 'ar' ? 'البحث عن طبيب للتعديل عليه (صلاحيات الآدمن)' : 'Search Doctor to Edit'}</h3>
                   <div className="relative mb-4">
                     <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                     <input type="text" className="w-full pr-12 pl-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500" placeholder={lang === 'ar' ? 'ابحث عن اسم الطبيب...' : 'Search doctor name...'} value={doctorSearch} onChange={e => setDoctorSearch(e.target.value)} />
                   </div>
                   <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                     {users.filter(u => (u.role === 'doctor' || u.role === 'dentist') && u.name.includes(doctorSearch)).map(doc => (
                        <button key={doc.id} type="button" onClick={() => setTargetDoctorId(doc.id)} className={`w-full text-right p-3 rounded-xl border flex items-center gap-3 transition-colors ${targetDoctorId === doc.id ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-700'}`}>
                           <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold">{doc.name[0]}</div>
                           <div><span className="block font-bold">{doc.name}</span><span className="text-xs font-normal text-slate-500">{doc.role === 'dentist' ? 'طبيب أسنان' : 'طبيب بشري'}</span></div>
                        </button>
                     ))}
                   </div>
                </div>
              )}

              {targetDoctorId ? (
                <form onSubmit={handleSaveDoctorProfile} className="space-y-8">
                  <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 border-b pb-3">{lang === 'ar' ? 'البيانات الأساسية' : 'Basic Info'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold mb-2">{lang === 'ar' ? 'التخصص الطبي' : 'Specialty'}</label>
                        <select className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500" value={doctorForm.specialty} onChange={e => setDoctorForm({...doctorForm, specialty: e.target.value})}>
                          <option value="">{lang === 'ar' ? 'اختر التخصص...' : 'Select Specialty...'}</option>
                          {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">{lang === 'ar' ? 'سعر الكشفية (ل.س)' : 'Consultation Fee'}</label>
                        <input type="number" min="0" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500" value={doctorForm.consultation_price} onChange={e => setDoctorForm({...doctorForm, consultation_price: Number(e.target.value)})} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold mb-2">{lang === 'ar' ? 'نبذة عن الطبيب' : 'About Doctor'}</label>
                        <textarea rows={4} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 resize-none" placeholder={lang === 'ar' ? 'اكتب نبذة عن خبراتك وشهاداتك...' : 'Write about your experience...'} value={doctorForm.about} onChange={e => setDoctorForm({...doctorForm, about: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b pb-3">
                      <h3 className="text-lg font-bold text-slate-800">{lang === 'ar' ? 'الأسئلة الطبية الشائعة (FAQ)' : 'Medical FAQs'}</h3>
                      <button type="button" onClick={addFaq} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors"><Plus size={16} /> {lang === 'ar' ? 'إضافة سؤال' : 'Add Question'}</button>
                    </div>
                    {doctorForm.faqs.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 font-medium">{lang === 'ar' ? 'لم تقم بإضافة أي أسئلة بعد.' : 'No FAQs added yet.'}</div>
                    ) : (
                      <div className="space-y-4">
                        {doctorForm.faqs.map((faq, index) => (
                          <div key={faq.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50 relative group">
                            <button type="button" onClick={() => removeFaq(faq.id)} className="absolute top-4 rtl:left-4 ltr:right-4 text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><Trash2 size={18} /></button>
                            <div className="mb-3 pr-10">
                              <label className="block text-xs font-bold text-slate-500 mb-1">{lang === 'ar' ? `السؤال ${index + 1}` : `Question ${index + 1}`}</label>
                              <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white" value={faq.question} onChange={e => updateFaq(faq.id, 'question', e.target.value)} required />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">{lang === 'ar' ? 'الإجابة' : 'Answer'}</label>
                              <textarea rows={2} className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white resize-none" value={faq.answer} onChange={e => updateFaq(faq.id, 'answer', e.target.value)} required />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="submit" disabled={isSubmittingDoctorProfile} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {isSubmittingDoctorProfile ? <span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span> : null}
                    {lang === 'ar' ? 'حفظ ونشر التعديلات' : 'Save & Publish Changes'}
                  </button>
                </form>
              ) : (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm"><User className="mx-auto mb-4 text-slate-300" size={48} /><p className="text-slate-500 font-bold">{lang === 'ar' ? 'الرجاء اختيار طبيب من القائمة أعلاه للبدء بالتعديل.' : 'Please select a doctor to edit.'}</p></div>
              )}
            </motion.div>
          )}

          {activeTab === 'profile' && (<motion.div key="profile" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="max-w-2xl"><h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8">{t.profileSettings}</h2><form onSubmit={handleUpdateProfile} className="bg-white p-5 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5 md:space-y-6"><div><label className="block text-sm font-medium text-slate-700 mb-2">{t.fullName}</label><input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" value={profileName} onChange={e => setProfileName(e.target.value)} disabled={isSubmittingProfile} /></div><div><label className="block text-sm font-medium text-slate-700 mb-2">{t.email}</label><input type="email" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} disabled={isSubmittingProfile} /></div><div><label className="block text-sm font-medium text-slate-700 mb-2">{t.phone}</label><input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} disabled={isSubmittingProfile} /></div><div><label className="block text-sm font-medium text-slate-700 mb-2">{t.notes}</label><textarea className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" rows={3} value={profileNotes} onChange={e => setProfileNotes(e.target.value)} disabled={isSubmittingProfile} /></div><div><label className="block text-sm font-medium text-slate-700 mb-2">{t.newPassword}</label><input type="password" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={profileNewPassword} onChange={e => setProfileNewPassword(e.target.value)} disabled={isSubmittingProfile} /></div><div className="pt-4 border-t border-slate-100"><label className="block text-sm font-medium text-slate-700 mb-2">{t.currentPassword}</label><input type="password" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 text-left" dir="ltr" value={profileCurrentPassword} onChange={e => setProfileCurrentPassword(e.target.value)} disabled={isSubmittingProfile} /></div><button type="submit" disabled={isSubmittingProfile} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">{isSubmittingProfile ? <span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span> : null}{t.saveChanges}</button></form></motion.div>)}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showWalletModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{walletActionType === 'withdrawal' ? (lang === 'ar' ? 'طلب سحب كاش' : 'Withdrawal') : (lang === 'ar' ? 'شحن المحفظة' : 'Deposit')}</h3>
                <button type="button" onClick={() => setShowWalletModal(false)} className="p-1 hover:bg-slate-100 rounded-full"><X size={20}/></button>
              </div>
              <form onSubmit={submitWalletRequest}>
                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-700 mb-2 text-center">{lang === 'ar' ? 'أدخل المبلغ بـ (ل.س جديدة)' : 'Amount in (New L.S)'}</label>
                  <input type="number" min="1" step="0.01" required className="w-full px-4 py-4 border-2 border-blue-100 rounded-2xl outline-none text-center text-3xl font-extrabold text-blue-600 focus:border-blue-500 transition-colors" placeholder="0" value={walletAmount} onChange={e => setWalletAmount(e.target.value)} disabled={isSubmittingWalletRequest} />
                  {walletAmount && !isNaN(Number(walletAmount)) && Number(walletAmount) > 0 && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                      <p className="text-xs text-slate-500 font-bold mb-1">{lang === 'ar' ? 'يعادل بالليرة السورية القديمة:' : 'Equals to old Syrian Lira:'}</p>
                      <p className="text-lg font-extrabold text-slate-800" dir="ltr">{(Number(walletAmount) * 100).toLocaleString()} {lang === 'ar' ? 'ل.س' : 'L.S'}</p>
                    </motion.div>
                  )}
                </div>
                <button type="submit" disabled={isSubmittingWalletRequest} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmittingWalletRequest ? <><span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span> {lang === 'ar' ? 'جاري الإرسال...' : 'Sending...'}</> : (lang === 'ar' ? 'إرسال الطلب' : 'Submit Request')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {adminWalletModal.isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-sm relative">
              <button onClick={() => setAdminWalletModal({isOpen: false, userId: null})} className="absolute top-4 left-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20}/></button>
              <h3 className="text-xl font-bold mb-6 text-center">{lang === 'ar' ? 'تعديل رصيد المستخدم' : 'Manage User Balance'}</h3>
              
              <form onSubmit={submitAdminWallet}>
                <div className="flex gap-2 mb-6">
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer font-bold text-sm transition-colors ${adminWalletAction === 'deposit' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                    <input type="radio" className="hidden" checked={adminWalletAction === 'deposit'} onChange={() => setAdminWalletAction('deposit')} disabled={isSubmittingAdminWallet} />
                    <Plus size={16} /> {lang === 'ar' ? 'إيداع' : 'Deposit'}
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer font-bold text-sm transition-colors ${adminWalletAction === 'withdrawal' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                    <input type="radio" className="hidden" checked={adminWalletAction === 'withdrawal'} onChange={() => setAdminWalletAction('withdrawal')} disabled={isSubmittingAdminWallet} />
                    <Minus size={16} /> {lang === 'ar' ? 'سحب' : 'Withdraw'}
                  </label>
                </div>

                <label className="block text-sm font-bold text-slate-700 mb-2 text-center">{lang === 'ar' ? 'المبلغ بـ (ل.س جديدة)' : 'Amount in New L.S'}</label>
                <input type="number" min="1" step="0.01" required className="w-full px-4 py-4 border-2 border-slate-200 rounded-2xl outline-none focus:border-blue-500 mb-6 text-center text-3xl font-extrabold text-slate-800 transition-colors" placeholder="0" value={adminWalletAmount} onChange={e => setAdminWalletAmount(e.target.value)} disabled={isSubmittingAdminWallet} />
                
                <button type="submit" disabled={isSubmittingAdminWallet} className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${adminWalletAction === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                  {isSubmittingAdminWallet ? <span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span> : null}
                  {lang === 'ar' ? 'تنفيذ العملية' : 'Execute'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl md:text-2xl font-bold">{editingData ? (lang === 'ar' ? 'تعديل البيانات' : 'Edit') : addButtonText}</h3>
                <button type="button" onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleSaveFacility} className="space-y-4">
                {user.role === 'admin' && (<div><label className="block text-sm font-bold mb-2">نوع المنشأة</label><select className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={form.type} onChange={e => setForm({...form, type: e.target.value})} disabled={isSubmittingFacility}><option value="pharmacy">صيدلية</option><option value="clinic">عيادة طبية</option><option value="dental_clinic">عيادة أسنان</option></select></div>)}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{lang === 'ar' ? 'الاسم' : 'Name'}</label><input required className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={form.name} onChange={e => setForm({...form, name: e.target.value})} disabled={isSubmittingFacility} /></div>
                  
                  {form.type === 'clinic' && (
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{lang === 'ar' ? 'تخصص العيادة' : 'Specialty'}</label>
                      <select className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 mb-2" value={form.specialty === '' ? '' : SPECIALTIES.includes(form.specialty) ? form.specialty : 'other'} onChange={e => { if (e.target.value === 'other') setForm({...form, specialty: 'تخصص آخر'}); else setForm({...form, specialty: e.target.value}); }} disabled={isSubmittingFacility}>
                        <option value="">{lang === 'ar' ? 'اختر التخصص...' : 'Select...'}</option>{SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}<option value="other">{lang === 'ar' ? 'أخرى (كتابة يدوية)' : 'Other'}</option>
                      </select>
                      {(form.specialty && !SPECIALTIES.includes(form.specialty)) && (
                         <input required placeholder={lang === 'ar' ? "اكتب التخصص هنا..." : "Type here..."} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={form.specialty === 'تخصص آخر' ? '' : form.specialty} onChange={e => setForm({...form, specialty: e.target.value})} disabled={isSubmittingFacility} />
                      )}
                    </div>
                  )}

                  {(form.type === 'clinic' || form.type === 'dental_clinic') && (
                    <>
                      <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{lang === 'ar' ? 'سعر الكشف (ل.س)' : 'Consultation Fee'}</label><input type="number" required className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={form.consultation_fee} onChange={e => setForm({...form, consultation_fee: e.target.value})} disabled={isSubmittingFacility} /></div>
                      <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{lang === 'ar' ? 'مدة الانتظار التقريبية' : 'Wait Time'}</label><input required placeholder="مثال: 15 دقيقة" className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={form.waiting_time} onChange={e => setForm({...form, waiting_time: e.target.value})} disabled={isSubmittingFacility} /></div>
                    </>
                  )}

                  <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{lang === 'ar' ? 'العنوان' : 'Address'}</label><input required className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={form.address} onChange={e => setForm({...form, address: e.target.value})} disabled={isSubmittingFacility} /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{lang === 'ar' ? 'الهاتف' : 'Phone'}</label><input required className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} disabled={isSubmittingFacility} /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{lang === 'ar' ? 'الواتساب (اختياري)' : 'WhatsApp'}</label><input className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={form.whatsapp_phone} onChange={e => setForm({...form, whatsapp_phone: e.target.value})} disabled={isSubmittingFacility} /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{lang === 'ar' ? 'اسم المسؤول' : 'In Charge'}</label><input className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={form.pharmacist_name} onChange={e => setForm({...form, pharmacist_name: e.target.value})} disabled={isSubmittingFacility} /></div>
                  
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{lang === 'ar' ? 'صورة/شعار' : 'Logo/Image'}</label>
                    <div className="flex items-center gap-3">
                      <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${uploadingImage ? 'bg-slate-50 border-slate-300 text-slate-400' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                        {uploadingImage ? <span className="animate-spin h-5 w-5 border-2 border-blue-600 rounded-full border-t-transparent"></span> : <UploadCloud size={20} />}
                        <span className="font-bold text-sm">{uploadingImage ? (lang === 'ar' ? 'جاري الرفع...' : 'Uploading...') : (lang === 'ar' ? 'اضغط لرفع صورة' : 'Click to Upload')}</span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage || isSubmittingFacility} />
                      </label>
                      {form.image_url && <img src={form.image_url} alt="preview" className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm" />}
                    </div>
                  </div>
                </div>

                <div className="h-[150px] md:h-[200px] rounded-2xl overflow-hidden border border-slate-200 z-0 relative mt-4">
                  <MapContainer center={[form.latitude || 35.25, form.longitude || 36.7]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationPicker onLocationSelect={(lat: number, lng: number) => setForm({...form, latitude: lat, longitude: lng})} initialPosition={form.latitude && form.longitude ? [form.latitude, form.longitude] : undefined} />
                    {editingData && <RecenterMap position={[form.latitude || 35.25, form.longitude || 36.7]} />}
                  </MapContainer>
                </div>
                
                <div className="border-t border-slate-200 pt-6 mt-6">
                  <h4 className="font-bold text-lg mb-4 flex items-center gap-2"><Calendar className="text-blue-500"/> أوقات الدوام الأسبوعي</h4>
                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    {(lang === 'en' ? DAYS_OF_WEEK_EN : DAYS_OF_WEEK_AR).map((day, idx) => { 
                      const dayHours = form.working_hours[idx.toString()] || { isOpen: false, start: '00:00', end: '00:00' }; 
                      return (
                        <div key={idx} className={`flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-xl border ${dayHours.isOpen ? 'border-blue-200 shadow-sm' : 'border-slate-200'} transition-all`}>
                          <div className="flex items-center gap-3 w-full sm:w-1/3">
                            <input type="checkbox" className="w-5 h-5 accent-blue-600 rounded cursor-pointer" checked={dayHours.isOpen} onChange={e => setForm({...form, working_hours: {...form.working_hours, [idx]: {...dayHours, isOpen: e.target.checked}}})} disabled={isSubmittingFacility} />
                            <span className={`font-bold w-20 ${dayHours.isOpen ? 'text-slate-900' : 'text-slate-400'}`}>{day}</span>
                          </div>
                          {dayHours.isOpen ? (
                            <div className="flex items-center gap-2 w-full sm:w-2/3" dir="ltr">
                              <span className="text-xs font-bold text-slate-400">{lang === 'ar' ? 'من' : 'From'}</span>
                              <input type="time" className="border border-slate-200 px-3 py-2 rounded-lg font-mono text-sm w-full outline-none focus:ring-2 focus:ring-blue-500" value={dayHours.start} onChange={e => setForm({...form, working_hours: {...form.working_hours, [idx]: {...dayHours, start: e.target.value}}})} disabled={isSubmittingFacility} />
                              <span className="text-xs font-bold text-slate-400 px-1">{lang === 'ar' ? 'إلى' : 'To'}</span>
                              <input type="time" className="border border-slate-200 px-3 py-2 rounded-lg font-mono text-sm w-full outline-none focus:ring-2 focus:ring-blue-500" value={dayHours.end} onChange={e => setForm({...form, working_hours: {...form.working_hours, [idx]: {...dayHours, end: e.target.value}}})} disabled={isSubmittingFacility} />
                            </div>
                          ) : (
                            <div className="w-full sm:w-2/3 text-red-500 font-bold px-4 flex items-center justify-center bg-red-50 py-2 rounded-lg">{lang === 'ar' ? 'عطلة - مغلق' : 'Day Off'}</div>
                          )}
                        </div>
                      ); 
                    })}
                  </div>
                </div>

                {user.role === 'admin' && (
                  <div className="pt-4 border-t border-slate-200">
                    <label className="block text-sm font-medium mb-1">ربط المنشأة بكادر طبي</label>
                    <select className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" value={form.doctor_id} onChange={e => setForm({...form, doctor_id: parseInt(e.target.value)})} disabled={isSubmittingFacility}> 
                      <option value="0">بدون مالك</option>
                      {users.filter(u => u.role !== 'admin' && u.role !== 'patient').map(d => <option key={d.id} value={d.id}>{d.name} ({d.role === 'dentist' ? 'طبيب أسنان' : (d.role === 'doctor' ? 'طبيب' : 'صيدلي')})</option>)}
                    </select>
                  </div>
                )}
                
                <div className="flex gap-3 pt-6 border-t border-slate-200">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors" disabled={isSubmittingFacility}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                  <button type="submit" disabled={uploadingImage || isSubmittingFacility} className="flex-1 py-4 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {isSubmittingFacility ? <span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span> : null}
                    {lang === 'ar' ? 'حفظ' : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUserModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{editingUser ? (lang === 'ar' ? 'تعديل بيانات المستخدم' : 'Edit User') : (lang === 'ar' ? 'إضافة مستخدم جديد' : 'Add User')}</h3>
                <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
              </div>
              
              <form onSubmit={handleSaveUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1">{lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}</label>
                    <input required className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} disabled={isSubmittingUser} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
                    <input required type="email" className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-left" dir="ltr" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} disabled={isSubmittingUser} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">{lang === 'ar' ? 'كلمة المرور' : 'Password'} {editingUser && <span className="text-xs text-slate-400">({lang === 'ar' ? 'اتركه فارغاً لعدم التغيير' : 'Leave blank to keep'})</span>}</label>
                    <input type={editingUser ? "password" : "text"} required={!editingUser} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-left" dir="ltr" placeholder={editingUser ? "***" : ""} value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} disabled={isSubmittingUser} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">{lang === 'ar' ? 'رقم الهاتف' : 'Phone'}</label>
                    <input className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-left" dir="ltr" value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})} disabled={isSubmittingUser} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">{lang === 'ar' ? 'نوع الحساب (الصلاحية)' : 'Role'}</label>
                    <select className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as any})} disabled={isSubmittingUser}>
                      <option value="patient">{lang === 'ar' ? 'مريض / مستخدم عادي' : 'Patient'}</option>
                      <option value="pharmacist">{lang === 'ar' ? 'صيدلي' : 'Pharmacist'}</option>
                      <option value="doctor">{lang === 'ar' ? 'طبيب بشري' : 'Doctor'}</option>
                      <option value="dentist">{lang === 'ar' ? 'طبيب أسنان' : 'Dentist'}</option>
                      {isSuperAdmin && <option value="admin">{lang === 'ar' ? 'مدير (Admin)' : 'Admin'}</option>}
                    </select>
                  </div>
                  
                  {isSuperAdmin && (
                    <div>
                      <label className="block text-sm font-bold mb-1">{lang === 'ar' ? 'رصيد المحفظة (ل.س جديدة)' : 'Wallet Balance (New L.S)'}</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" 
                        value={userForm.wallet_balance ? (Number(userForm.wallet_balance) / 100) : ''} 
                        onChange={e => setUserForm({...userForm, wallet_balance: Number(e.target.value) * 100})} 
                        disabled={isSubmittingUser}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1">{lang === 'ar' ? 'ملاحظات / نبذة (تظهر في الملف الشخصي للطبيب)' : 'Notes / Bio'}</label>
                  <textarea rows={3} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={userForm.notes} onChange={e => setUserForm({...userForm, notes: e.target.value})} disabled={isSubmittingUser}></textarea>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl mt-2">
                  <input type="checkbox" id="isActiveCheck" className="w-5 h-5 accent-emerald-500 cursor-pointer" checked={userForm.is_active} onChange={e => setUserForm({...userForm, is_active: e.target.checked})} disabled={isSubmittingUser} />
                  <label htmlFor="isActiveCheck" className="font-bold text-slate-700 cursor-pointer select-none">
                    {lang === 'ar' ? 'الحساب مفعل (يمكنه الدخول واستخدام النظام)' : 'Account is Active'}
                  </label>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 py-4 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors" disabled={isSubmittingUser}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                  <button type="submit" disabled={isSubmittingUser} className="flex-1 py-4 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {isSubmittingUser ? <span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span> : null}
                    {lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal isOpen={confirmData.isOpen} onClose={() => setConfirmData(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmData.onConfirm} title={confirmData.title} body={confirmData.body} t={t} />

      <SuccessModal 
        isOpen={successModalData.isOpen} 
        onClose={() => setSuccessModalData({ ...successModalData, isOpen: false })} 
        title={successModalData.title}
        message={successModalData.message}
      />
    </div>
  );
};