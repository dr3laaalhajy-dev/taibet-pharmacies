import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, MapPin, Phone, User, LogOut, Settings, Activity, Layout, UploadCloud, Package, FileText, Smile, Wallet, Banknote, Minus, Store, CheckCircle, Stethoscope } from 'lucide-react';
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

export const Dashboard = ({ user, onLogout, lang, t }: { user: UserType, onLogout: () => void, lang: 'ar' | 'en', t: any }) => {
  const [activeTab, setActiveTab] = useState<'facilities' | 'products' | 'orders' | 'services' | 'users' | 'profile' | 'settings' | 'wallet_requests'>('facilities');
  const [facilities, setFacilities] = useState<Facility[]>([]); const [users, setUsers] = useState<any[]>([]);
  const isSuperAdmin = SUPER_ADMINS.includes(user.email);
  const hasEcommerce = facilities.some(f => f.is_ecommerce_enabled);
  
  const dashboardTitle = (user.role === 'doctor' || user.role === 'dentist') ? (lang === 'ar' ? 'عياداتي ومواعيدي' : 'My Clinics') : (user.role === 'pharmacist' ? (lang === 'ar' ? 'صيدلياتي ومواعيدي' : 'My Pharmacies') : (lang === 'ar' ? 'إدارة المنشآت الطبية' : 'Manage Facilities'));
  const addButtonText = (user.role === 'doctor' || user.role === 'dentist') ? (lang === 'ar' ? 'إضافة عيادة' : 'Add Clinic') : (user.role === 'pharmacist' ? (lang === 'ar' ? 'إضافة صيدلية' : 'Add Pharmacy') : (lang === 'ar' ? 'إضافة منشأة' : 'Add Facility'));

  const [profileEmail, setProfileEmail] = useState(user.email); const [profileName, setProfileName] = useState(user.name); const [profilePhone, setProfilePhone] = useState(user.phone || ''); const [profileNotes, setProfileNotes] = useState(user.notes || ''); const [profileCurrentPassword, setProfileCurrentPassword] = useState(''); const [profileNewPassword, setProfileNewPassword] = useState(''); const [profileMsg, setProfileMsg] = useState('');
  const [footerForm, setFooterForm] = useState<FooterSettings>({ copyright: '', description: '', facebook: '', instagram: '', contact_phone: '', complaints_phone: '' }); const [footerMsg, setFooterMsg] = useState('');
  const defaultWorkingHours: Record<string, WorkingHours> = {}; for(let i=0; i<7; i++) defaultWorkingHours[i.toString()] = { isOpen: true, start: "08:00", end: "22:00" };
  const [showModal, setShowModal] = useState(false); const [editingData, setEditingData] = useState<Facility | null>(null); const [form, setForm] = useState<any>({ name: '', address: '', phone: '', type: user.role === 'dentist' ? 'dental_clinic' : (user.role === 'doctor' ? 'clinic' : 'pharmacy'), latitude: 35.25, longitude: 36.7, whatsapp_phone: '', pharmacist_name: '', specialty: '', services: '', consultation_fee: 0, waiting_time: '15 دقيقة', image_url: '', doctor_id: 0, working_hours: defaultWorkingHours });
  const [showUserModal, setShowUserModal] = useState(false); const [editingUser, setEditingUser] = useState<UserType | null>(null); const [userForm, setUserForm] = useState({ email: '', password: '', role: 'pharmacist' as any, name: '', pharmacy_limit: 10, phone: '', notes: '' });
  const [doctorFilter, setDoctorFilter] = useState<number>(0);
  const [confirmData, setConfirmData] = useState<{ isOpen: boolean, onConfirm: () => void, title: string, body: string }>({ isOpen: false, onConfirm: () => {}, title: '', body: '' });
  const openConfirm = (title: string, body: string, onConfirm: () => void) => setConfirmData({ isOpen: true, onConfirm, title, body });
  const [generatedKey, setGeneratedKey] = useState<string | null>(null); const [uploadingImage, setUploadingImage] = useState(false);
  
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletActionType, setWalletActionType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [walletAmount, setWalletAmount] = useState('');

  const loadData = async () => { if (activeTab === 'facilities' || activeTab === 'services') api.get('/api/pharmacies').then(setFacilities); if (activeTab === 'users' && user.role === 'admin') api.get('/api/admin/users').then(setUsers); if (activeTab === 'settings' && isSuperAdmin) api.get('/api/public/settings').then(data => setFooterForm(data)); };
  useEffect(() => { loadData(); }, [activeTab]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; setUploadingImage(true); try { const url = await uploadImageToImgBB(file); setForm({ ...form, image_url: url }); } catch (err: any) { alert(err.message); } finally { setUploadingImage(false); } };
  const handleSaveFacility = async (e: React.FormEvent) => { e.preventDefault(); const payload = { ...form }; if (user.role !== 'admin') delete payload.doctor_id; try { if (editingData) await api.put(`/api/pharmacies/${editingData.id}`, payload); else await api.post('/api/pharmacies', payload); setShowModal(false); loadData(); } catch (err: any) { alert(err.error || 'خطأ في الحفظ!'); } };
  const setManualStatus = async (id: number, status: 'open' | 'closed' | 'auto') => { try { await api.patch(`/api/pharmacies/${id}/status`, { manual_status: status }); loadData(); } catch(err: any) { alert('حدث خطأ'); } };
  const toggleEcommerce = async (id: number, currentStatus: boolean) => { try { await api.patch(`/api/pharmacies/${id}/ecommerce`, { is_ecommerce_enabled: !currentStatus }); loadData(); } catch(err: any) { alert('ممنوع'); } };
  const generateActivationKey = async () => { try { const res = await api.post('/api/admin/generate-key', {}); setGeneratedKey(res.key); } catch (err: any) { alert('خطأ'); } };
  const approveUser = async (id: number) => { try { await api.patch(`/api/admin/users/${id}/approve`); setUsers(users.map(u => u.id === id ? { ...u, is_active: true } : u)); } catch (err) { alert('خطأ'); } };
  const handleSaveUser = async (e: React.FormEvent) => { e.preventDefault(); try { if (editingUser) await api.put(`/api/admin/users/${editingUser.id}`, userForm); else await api.post('/api/admin/users', userForm); setShowUserModal(false); setEditingUser(null); loadData(); } catch (err: any) { alert(err.error); } };
  const handleUpdateProfile = async (e: React.FormEvent) => { e.preventDefault(); try { const res = await api.post('/api/auth/update-profile', { email: profileEmail, name: profileName, currentPassword: profileCurrentPassword, newPassword: profileNewPassword, phone: profilePhone, notes: profileNotes }); setProfileMsg(res.verificationRequired ? t.verificationSent : t.profileUpdated); setProfileCurrentPassword(''); setProfileNewPassword(''); } catch (err: any) { setProfileMsg(err.error); } };
  const handleSaveFooter = async (e: React.FormEvent) => { e.preventDefault(); try { await api.put('/api/admin/settings', footerForm); setFooterMsg('تم الحفظ بنجاح'); } catch(err: any) { setFooterMsg('فشل الحفظ'); } };

  const handleManageWalletBalance = async (userId: number) => {
    const amount = prompt('أدخل المبلغ (أدخل قيمة سالبة للخصم، مثلاً -500):');
    if(!amount || isNaN(Number(amount))) return;
    try { await api.post(`/api/admin/wallet/${userId}`, { amount: parseFloat(amount) }); loadData(); alert('تم بنجاح!'); } catch(err) { alert('خطأ في العملية'); }
  };

  const submitWalletRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/wallet/request', { type: walletActionType, amount: parseFloat(walletAmount) });
      alert('تم إرسال طلبك للإدارة بنجاح.');
      setShowWalletModal(false); setWalletAmount('');
    } catch(err: any) { alert(err.error || 'حدث خطأ'); }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col md:flex-row w-full overflow-hidden">
      <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0 md:sticky md:top-0 md:h-screen z-20">
        <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center"><h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">Taibet Health</h1><button onClick={onLogout} className="md:hidden p-2 rounded-lg bg-red-50 text-red-600"><LogOut size={18} /></button></div>
        
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
          <div className="text-xl font-extrabold relative z-10" dir="ltr">{user.wallet_balance || '0.00'} ل.س</div>
        </div>

        <nav className="flex-none md:flex-1 p-3 md:p-4 flex flex-row md:flex-col gap-2 overflow-x-auto whitespace-nowrap flex-nowrap scrollbar-hide mt-2">
          {user.role !== 'patient' && <button onClick={() => setActiveTab('facilities')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'facilities' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><MapPin size={18} /> {dashboardTitle}</button>}
          {(user.role === 'admin' || user.role === 'doctor' || user.role === 'dentist') && (<button onClick={() => setActiveTab('services')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'services' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><Activity size={18} /> {lang === 'ar' ? 'الخدمات التي أقدمها' : 'My Services'}</button>)}
          {(user.role === 'admin' || hasEcommerce) && (<><button onClick={() => setActiveTab('products')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'products' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><Package size={18} /> {lang === 'ar' ? 'إدارة المنتجات' : 'Products Manager'}</button><button onClick={() => setActiveTab('orders')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><FileText size={18} /> {lang === 'ar' ? 'طلبات الزبائن' : 'Customer Orders'}</button></>)}
          {user.role === 'admin' && <button onClick={() => setActiveTab('users')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><User size={18} /> {t.userManagement}</button>}
          {isSuperAdmin && <button onClick={() => setActiveTab('wallet_requests')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'wallet_requests' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><Banknote size={18} /> {lang === 'ar' ? 'طلبات المحفظة' : 'Wallet Requests'}</button>}
          {isSuperAdmin && <button onClick={() => setActiveTab('settings')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><Layout size={18} /> {lang === 'ar' ? 'إعدادات الفوتر' : 'Footer Settings'}</button>}
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
                            <button onClick={() => toggleEcommerce(f.id, f.is_ecommerce_enabled || false)} className={`text-[10px] px-2 py-1 rounded-md font-bold ${f.is_ecommerce_enabled ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{lang === 'ar' ? 'المتجر: ' : 'Store: '}{f.is_ecommerce_enabled ? (lang === 'ar' ? 'مفعل' : 'ON') : (lang === 'ar' ? 'معطل' : 'OFF')}</button>
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
                      <div className="flex gap-2 pt-4 mt-4 border-t border-slate-100"><button onClick={() => { setEditingData(f); setForm({...f, working_hours: f.working_hours || defaultWorkingHours}); setShowModal(true); }} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"><Edit2 size={14} /> {lang === 'ar' ? 'تعديل البيانات' : 'Edit'}</button><button onClick={() => openConfirm(t.confirmTitle, t.confirmBody, async () => { await api.delete(`/api/pharmacies/${f.id}`); loadData(); })} className="px-4 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"><Trash2 size={14} /></button></div>
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
          
          {activeTab === 'users' && user.role === 'admin' && (
            <motion.div key="users" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8"><div><h2 className="text-2xl md:text-3xl font-bold text-slate-900">{t.userManagement}</h2></div><div className="flex flex-wrap gap-3 w-full sm:w-auto">{isSuperAdmin && <button onClick={generateActivationKey} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-indigo-50 text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-100 transition-colors">توليد مفتاح تفعيل</button>}<button onClick={() => { setEditingUser(null); setUserForm({ email: '', password: '', role: 'pharmacist', name: '', pharmacy_limit: 10, phone: '', notes: '' }); setShowUserModal(true); }} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"><Plus size={20} /> {t.createUser}</button></div></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {users.map(u => {
                  const isTargetSuperAdmin = SUPER_ADMINS.includes(u.email); const canEditTarget = !isTargetSuperAdmin || u.email === user.email; const canDeleteTarget = !isTargetSuperAdmin; 
                  return (
                    <div key={u.id} className={`p-5 md:p-6 rounded-2xl border shadow-sm flex flex-col gap-4 ${!u.is_active ? 'bg-yellow-50/50 border-yellow-200' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 font-bold text-xl shrink-0">{u.name[0]}</div><div className="flex-1 min-w-0"><div className="flex justify-between items-start"><span className="font-bold text-slate-900 truncate text-left text-base md:text-lg">{u.name}</span>{!u.is_active && <span className="shrink-0 px-2 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full mr-2">Pending</span>}</div><p className="text-xs md:text-sm text-slate-500 truncate mt-1" dir="ltr">{u.email}</p><div className="flex gap-2 mt-2 flex-wrap"><span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isTargetSuperAdmin ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span><span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-wider">{u.wallet_balance} ل.س</span></div></div></div>
                      <div className="flex gap-2 border-t border-slate-100 pt-4 mt-auto">
                        {!u.is_active && <button onClick={() => approveUser(u.id)} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"><CheckCircle size={14} /> تفعيل</button>}
                        {isSuperAdmin && <button onClick={() => handleManageWalletBalance(u.id)} className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1"><Banknote size={14} /> الرصيد +/-</button>}
                        {u.is_active && canEditTarget && <button onClick={() => { setEditingUser(u); setUserForm({ email: u.email, password: '', role: u.role, name: u.name, pharmacy_limit: u.pharmacy_limit || 10, phone: u.phone || '', notes: u.notes || '' }); setShowUserModal(true); }} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>}
                        {canDeleteTarget && <button onClick={() => openConfirm(t.confirmTitle, 'هل أنت متأكد؟', async () => { await api.delete(`/api/admin/users/${u.id}`); loadData(); })} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (<motion.div key="profile" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="max-w-2xl"><h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8">{t.profileSettings}</h2><form onSubmit={handleUpdateProfile} className="bg-white p-5 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5 md:space-y-6">{profileMsg && <div className={`p-4 rounded-xl text-sm font-bold ${profileMsg.includes('تم') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{profileMsg}</div>}<div><label className="block text-sm font-medium text-slate-700 mb-2">{t.fullName}</label><input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" value={profileName} onChange={e => setProfileName(e.target.value)} /></div><div><label className="block text-sm font-medium text-slate-700 mb-2">{t.email}</label><input type="email" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} /></div><div><label className="block text-sm font-medium text-slate-700 mb-2">{t.phone}</label><input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} /></div><div><label className="block text-sm font-medium text-slate-700 mb-2">{t.notes}</label><textarea className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" rows={3} value={profileNotes} onChange={e => setProfileNotes(e.target.value)} /></div><div><label className="block text-sm font-medium text-slate-700 mb-2">{t.newPassword}</label><input type="password" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={profileNewPassword} onChange={e => setProfileNewPassword(e.target.value)} /></div><div className="pt-4 border-t border-slate-100"><label className="block text-sm font-medium text-slate-700 mb-2">{t.currentPassword}</label><input type="password" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 text-left" dir="ltr" value={profileCurrentPassword} onChange={e => setProfileCurrentPassword(e.target.value)} /></div><button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors">{t.saveChanges}</button></form></motion.div>)}
        </AnimatePresence>
      </div>

      {/* Wallet Modal */}
      <AnimatePresence>
        {showWalletModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-sm">
              <h3 className="text-xl font-bold mb-4">{walletActionType === 'deposit' ? 'طلب إيداع' : 'طلب سحب كاش'}</h3>
              <form onSubmit={submitWalletRequest}>
                <input type="number" min="1" required className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 mb-6 text-center text-xl font-bold" value={walletAmount} onChange={e => setWalletAmount(e.target.value)} />
                <div className="flex gap-3"><button type="button" onClick={() => setShowWalletModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100">إلغاء</button><button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600">إرسال الطلب</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal isOpen={confirmData.isOpen} onClose={() => setConfirmData(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmData.onConfirm} title={confirmData.title} body={confirmData.body} t={t} />
    </div>
  );
};