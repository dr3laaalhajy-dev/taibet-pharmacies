import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { SuccessModal } from './SuccessModal';
import { Plus, Edit2, Trash2, Calendar, MapPin, Phone, User, LogOut, Settings, Activity, Layout, UploadCloud, Package, FileText, Smile, Wallet, Banknote, Minus, Store, CheckCircle, Stethoscope, X, ShieldAlert, LayoutDashboard, Search, Clock, Users, AlertCircle, MessageSquare, FileSignature } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { UserType, Facility, WorkingHours, FooterSettings, SUPER_ADMINS, DAYS_OF_WEEK_AR, DAYS_OF_WEEK_EN, SPECIALTIES } from '../types';
import { api, uploadImageToImgBB } from '../api-client'; 
import { checkIsOpenNow } from '../helpers';
import { ProductsManager } from './ProductsManager';
import { OrdersManager } from './OrdersManager';
import { ServicesManager } from './ServicesManager';
import { WalletRequestsManager } from './WalletRequestsManager';
import { requestForToken, onMessageListener } from '../firebase';

const SAFE_DAYS_AR = DAYS_OF_WEEK_AR || ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const SAFE_DAYS_EN = DAYS_OF_WEEK_EN || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SAFE_SPECIALTIES = SPECIALTIES || ['عام', 'أطفال', 'أسنان', 'نسائية', 'قلبية', 'عظمية', 'باطنية', 'عينية', 'أذن أنف حنجرة'];

const MapClickHandler = ({ lat, lng, onChange }: { lat: number, lng: number, onChange: (lat: number, lng: number) => void }) => {
  const map = useMapEvents({ click(e) { onChange(e.latlng.lat, e.latlng.lng); map.flyTo(e.latlng, map.getZoom()); } });
  return <Marker position={[lat, lng]} />;
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, body, t }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, body: string, t: any }) => {
  if (!isOpen) return null;
  return ( <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"><motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl w-full max-w-md text-center max-h-[90vh] overflow-y-auto"><div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={32} /></div><h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3><p className="text-slate-500 dark:text-slate-400 mb-8">{body}</p><div className="flex gap-3"><button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">{t?.cancel || 'إلغاء'}</button><button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors">{t?.deleteBtn || 'حذف'}</button></div></motion.div></div> );
};

// 🟢 مكون السجل الطبي والوصفة الطبية متوافق مع الدارك مود
const PatientRecordModal = ({ isOpen, onClose, patientId, appointmentId, patientName, lang }: { isOpen: boolean, onClose: () => void, patientId: number, appointmentId: number, patientName: string, lang: string }) => {
  const [activeTab, setActiveTab] = useState<'ehr' | 'prescription'>('prescription');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [ehr, setEhr] = useState({ blood_type: '', allergies: '', chronic_diseases: '', past_surgeries: '', notes: '' });
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [medicines, setMedicines] = useState([{ id: Date.now(), name: '', dosage: '', frequency: '', duration: '' }]);

  useEffect(() => {
    if (isOpen && patientId) {
      setLoading(true);
      api.get(`/api/medical-records/${patientId}`).then(res => {
        if(res && res.patient_id) setEhr(res);
      }).catch(() => {}).finally(() => setLoading(false));
    }
  }, [isOpen, patientId]);

  if (!isOpen) return null;

  const addMedicine = () => setMedicines([...medicines, { id: Date.now(), name: '', dosage: '', frequency: '', duration: '' }]);
  const updateMedicine = (id: number, field: string, value: string) => setMedicines(medicines.map(m => m.id === id ? { ...m, [field]: value } : m));
  const removeMedicine = (id: number) => setMedicines(medicines.filter(m => m.id !== id));

  const saveEHR = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try { await api.post('/api/medical-records', { patient_id: patientId, ...ehr }); toast.success(lang === 'ar' ? 'تم حفظ السجل الطبي بنجاح' : 'EHR saved successfully'); } 
    catch(err) { toast.error(lang === 'ar' ? 'فشل الحفظ' : 'Failed to save'); } finally { setSubmitting(false); }
  };

  const savePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (medicines.length === 0 || !medicines[0].name.trim()) return toast.error(lang === 'ar' ? 'يجب إضافة دواء واحد على الأقل' : 'Add at least one medicine');
    setSubmitting(true);
    try { await api.post('/api/prescriptions', { patient_id: patientId, appointment_id: appointmentId, diagnosis, medicines, notes }); toast.success(lang === 'ar' ? 'تم إصدار الوصفة الطبية بنجاح' : 'Prescription issued successfully'); onClose(); } 
    catch(err) { toast.error(lang === 'ar' ? 'فشل إصدار الوصفة' : 'Failed to issue'); } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[80]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50 dark:bg-slate-950 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-white dark:bg-slate-900 p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center z-10 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><User className="text-blue-600 dark:text-blue-400"/> {patientName}</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">#{patientId} {lang === 'ar' ? 'الملف الطبي للمريض' : 'Patient Medical File'}</span>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-500 hover:text-red-500 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="flex bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <button onClick={() => setActiveTab('prescription')} className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'prescription' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><FileText size={18}/> {lang === 'ar' ? 'كتابة وصفة طبية (روشتة)' : 'Write Prescription'}</button>
          <button onClick={() => setActiveTab('ehr')} className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'ehr' ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><Activity size={18}/> {lang === 'ar' ? 'السجل الطبي (EHR)' : 'Medical Record'}</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-20"><span className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></span></div>
          ) : activeTab === 'ehr' ? (
            <form id="ehrForm" onSubmit={saveEHR} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'فصيلة الدم' : 'Blood Type'}</label><select className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-slate-900 dark:text-white" value={ehr.blood_type} onChange={e => setEhr({...ehr, blood_type: e.target.value})}><option value="">{lang === 'ar'?'غير محدد':'Unknown'}</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option></select></div>
                <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'الحساسية (أدوية/أطعمة)' : 'Allergies'}</label><input className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600" placeholder={lang==='ar'?'مثال: بنسيلين، فراولة':'e.g. Penicillin'} value={ehr.allergies} onChange={e => setEhr({...ehr, allergies: e.target.value})} /></div>
                <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'الأمراض المزمنة' : 'Chronic Diseases'}</label><input className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600" placeholder={lang==='ar'?'مثال: سكري، ضغط':'e.g. Diabetes, Hypertension'} value={ehr.chronic_diseases} onChange={e => setEhr({...ehr, chronic_diseases: e.target.value})} /></div>
                <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'عمليات جراحية سابقة' : 'Past Surgeries'}</label><textarea rows={2} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600" value={ehr.past_surgeries} onChange={e => setEhr({...ehr, past_surgeries: e.target.value})} /></div>
                <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'ملاحظات الطبيب السرية' : 'Private Doctor Notes'}</label><textarea rows={3} className="w-full p-3 border border-yellow-200 dark:border-yellow-900/50 rounded-xl outline-none focus:border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10 dark:text-yellow-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder={lang==='ar'?'هذه الملاحظات تراها أنت فقط...':'Notes visible only to doctors...'} value={ehr.notes} onChange={e => setEhr({...ehr, notes: e.target.value})} /></div>
              </div>
            </form>
          ) : (
            <form id="prescriptionForm" onSubmit={savePrescription} className="space-y-6">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                <label className="block text-sm font-bold text-emerald-900 dark:text-emerald-400 mb-2 flex items-center gap-2"><Stethoscope size={16}/> {lang === 'ar' ? 'التشخيص الطبي' : 'Diagnosis'}</label>
                <input required className="w-full p-3 border border-emerald-200 dark:border-emerald-800 rounded-xl outline-none focus:border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10 dark:text-white" placeholder={lang==='ar'?'اكتب التشخيص هنا...':'Write diagnosis...'} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><Package size={18} className="text-blue-500"/> {lang === 'ar' ? 'الأدوية الموصوفة' : 'Prescribed Medicines'}</h3>
                  <button type="button" onClick={addMedicine} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-blue-100 dark:hover:bg-blue-900/50"><Plus size={14}/> {lang === 'ar' ? 'إضافة دواء' : 'Add'}</button>
                </div>
                
                <div className="space-y-3">
                  {medicines.map((med, index) => (
                    <div key={med.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row gap-3 relative group">
                      {medicines.length > 1 && <button type="button" onClick={() => removeMedicine(med.id)} className="absolute top-2 left-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 size={16}/></button>}
                      <div className="flex-1"><label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">{lang==='ar'?'اسم الدواء':'Medicine Name'}</label><input required className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 font-bold text-slate-800 dark:text-white dark:bg-slate-800" value={med.name} onChange={e => updateMedicine(med.id, 'name', e.target.value)} placeholder="Panadol 500mg" dir="ltr" /></div>
                      <div className="w-full md:w-32"><label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">{lang==='ar'?'الجرعة':'Dosage'}</label><input className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 dark:bg-slate-800 dark:text-white" value={med.dosage} onChange={e => updateMedicine(med.id, 'dosage', e.target.value)} placeholder={lang==='ar'?'حبة واحدة':'1 pill'} /></div>
                      <div className="w-full md:w-32"><label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">{lang==='ar'?'التكرار':'Frequency'}</label><input className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 dark:bg-slate-800 dark:text-white" value={med.frequency} onChange={e => updateMedicine(med.id, 'frequency', e.target.value)} placeholder={lang==='ar'?'مرتين يومياً':'Twice daily'} /></div>
                      <div className="w-full md:w-32"><label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">{lang==='ar'?'المدة':'Duration'}</label><input className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 dark:bg-slate-800 dark:text-white" value={med.duration} onChange={e => updateMedicine(med.id, 'duration', e.target.value)} placeholder={lang==='ar'?'5 أيام':'5 days'} /></div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'تعليمات إضافية للمريض' : 'Additional Instructions'}</label>
                <textarea rows={2} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-slate-900 dark:text-white" placeholder={lang==='ar'?'نصائح، وقت المراجعة القادمة...':'Advice, next visit...'} value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </form>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex gap-3">
          <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
          {activeTab === 'ehr' ? (
            <button type="submit" form="ehrForm" disabled={submitting} className="flex-1 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 flex justify-center items-center gap-2">{submitting ? <span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span> : null}{lang === 'ar' ? 'حفظ السجل الطبي' : 'Save EHR'}</button>
          ) : (
            <button type="submit" form="prescriptionForm" disabled={submitting} className="flex-1 py-3 rounded-xl font-bold bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-200 dark:shadow-none flex justify-center items-center gap-2">{submitting ? <span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span> : <FileText size={18}/>}{lang === 'ar' ? 'إصدار الوصفة (روشتة)' : 'Issue Prescription'}</button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export const Dashboard = ({ user, onLogout, onGoToPublic, lang, t, openChatWithUser }: { user: UserType, onLogout: () => void, onGoToPublic: () => void, lang: 'ar' | 'en', t: any, openChatWithUser?: (id: number) => void }) => {
 const [activeTab, setActiveTab] = useState<'facilities' | 'products' | 'orders' | 'services' | 'users' | 'profile' | 'settings' | 'wallet_requests' | 'super_settings' | 'doctor_profile' | 'appointments' | 'support'>(user.role === 'customer_service' ? 'support' : 'facilities');
  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [loadingSupport, setLoadingSupport] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]); 
  const [users, setUsers] = useState<any[]>([]);
  
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

  const isSuperAdmin = (SUPER_ADMINS || []).includes(user.email) || superAdmins.includes(user.email);

  const [targetDoctorId, setTargetDoctorId] = useState<number | null>(user.role === 'doctor' || user.role === 'dentist' ? user.id : null);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorForm, setDoctorForm] = useState({ specialty: '', consultation_price: 0, about: '', faqs: [] as any[], show_in_directory: true, daily_limit: 20 }); 

  const [appointments, setAppointments] = useState<any[]>([]);
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  const [patientRecordModal, setPatientRecordModal] = useState<{isOpen: boolean, patientId: number, appointmentId: number, patientName: string}>({isOpen: false, patientId: 0, appointmentId: 0, patientName: ''});

  useEffect(() => {
    if (targetDoctorId) {
      const targetDoc = users.find(u => u.id === targetDoctorId) || user;
      setDoctorForm({ 
        specialty: targetDoc.specialty || '', 
        consultation_price: targetDoc.consultation_price ? Number(targetDoc.consultation_price) / 100 : 0, 
        about: targetDoc.about || targetDoc.notes || '', 
        faqs: targetDoc.faqs || [],
        show_in_directory: targetDoc.show_in_directory !== false,
        daily_limit: targetDoc.daily_limit || 20
      });
    }
  }, [targetDoctorId, users, user]);

  const addFaq = () => setDoctorForm({ ...doctorForm, faqs: [...doctorForm.faqs, { id: Date.now().toString(), question: '', answer: '' }] });
  const updateFaq = (id: string, field: 'question' | 'answer', value: string) => setDoctorForm({ ...doctorForm, faqs: doctorForm.faqs.map(faq => faq.id === id ? { ...faq, [field]: value } : faq) });
  const removeFaq = (id: string) => setDoctorForm({ ...doctorForm, faqs: doctorForm.faqs.filter(faq => faq.id !== id) });

  const handleSaveDoctorProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDoctorId || isSubmittingDoctorProfile) return toast.error(lang === 'ar' ? 'الرجاء اختيار طبيب' : 'Select a doctor');
    setIsSubmittingDoctorProfile(true);
    const payloadToSave = { ...doctorForm, consultation_price: Number(doctorForm.consultation_price) * 100, user_id: targetDoctorId };

    try {
      await api.post('/api/doctor/update-profile', payloadToSave);
      toast.success(lang === 'ar' ? 'تم حفظ الملف الشخصي بنجاح' : 'Profile saved successfully');
      loadData(); 
    } catch (err: any) { toast.error(err.response?.data?.error || err.error || 'حدث خطأ.'); }
    finally { setIsSubmittingDoctorProfile(false); }
  };

  // 🔔 الاستماع للإشعارات فقط (التطبيق مفتوح)
  useEffect(() => {
    onMessageListener().then((payload: any) => {
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white dark:bg-slate-800 shadow-lg rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 p-4 border-l-4 border-blue-500`}>
          <div className="flex-1 w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white">{payload?.notification?.title}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{payload?.notification?.body}</p>
          </div>
        </div>
      ));
    }).catch(err => console.log('فشل استقبال الإشعار: ', err));
  }, []);

  // 🟢 دالة تفعيل الإشعارات يدوياً عند ضغط الزر
  const enableNotifications = async () => {
    const toastId = toast.loading(lang === 'ar' ? 'جاري تفعيل الإشعارات...' : 'Enabling notifications...');
    const token = await requestForToken();
    if (token) {
      try {
        await api.post('/api/auth/fcm-token', { fcm_token: token });
        toast.success(lang === 'ar' ? 'تم تفعيل الإشعارات بنجاح! 🔔' : 'Notifications Enabled! 🔔', { id: toastId });
      } catch (err) {
        toast.error(lang === 'ar' ? 'حدث خطأ في ربط هاتفك.' : 'Error linking device.', { id: toastId });
      }
    } else {
      toast.error(lang === 'ar' ? 'الرجاء السماح للإشعارات من إعدادات المتصفح.' : 'Please allow notifications in browser.', { id: toastId });
    }
  };

  useEffect(() => { api.get('/api/admin/super-admins').then(setSuperAdmins).catch(() => {}); }, []);

  const hasEcommerce = facilities.some(f => f.is_ecommerce_enabled);
  const dashboardTitle = (user.role === 'doctor' || user.role === 'dentist') ? (lang === 'ar' ? 'عياداتي' : 'My Clinics') : (user.role === 'pharmacist' ? (lang === 'ar' ? 'صيدلياتي' : 'My Pharmacies') : (lang === 'ar' ? 'إدارة المنشآت الطبية' : 'Manage Facilities'));
  const addButtonText = (user.role === 'doctor' || user.role === 'dentist') ? (lang === 'ar' ? 'إضافة عيادة' : 'Add Clinic') : (user.role === 'pharmacist' ? (lang === 'ar' ? 'إضافة صيدلية' : 'Add Pharmacy') : (lang === 'ar' ? 'إضافة منشأة' : 'Add Facility'));

  const [profileEmail, setProfileEmail] = useState(user.email); const [profileName, setProfileName] = useState(user.name); const [profilePhone, setProfilePhone] = useState(user.phone || ''); const [profileNotes, setProfileNotes] = useState(user.notes || ''); const [profileCurrentPassword, setProfileCurrentPassword] = useState(''); const [profileNewPassword, setProfileNewPassword] = useState('');
  const [footerForm, setFooterForm] = useState<FooterSettings>({ copyright: '', description: '', facebook: '', instagram: '', contact_phone: '', complaints_phone: '' });
  
  const defaultWorkingHours: Record<string, WorkingHours> = {}; 
  for(let i=0; i<7; i++) defaultWorkingHours[i.toString()] = { isOpen: true, start: "08:00", end: "22:00" };
  
  const [showModal, setShowModal] = useState(false); const [editingData, setEditingData] = useState<Facility | null>(null); 
  const [form, setForm] = useState<any>({ name: '', address: '', phone: '', type: user.role === 'dentist' ? 'dental_clinic' : (user.role === 'doctor' ? 'clinic' : 'pharmacy'), latitude: 35.25, longitude: 36.7, whatsapp_phone: '', pharmacist_name: '', specialty: '', services: '', consultation_fee: 0, waiting_time: '15 دقيقة', image_url: '', doctor_id: 0, working_hours: defaultWorkingHours });
  
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
    if (activeTab === 'support' && (user.role === 'customer_service' || user.role === 'admin')) {
      setLoadingSupport(true);
      api.get('/api/chat/support/pending').then(setSupportRequests).finally(() => setLoadingSupport(false));
    }
  };
  const acceptSupportRequest = async (conversationId: number) => {
    try {
      await api.post(`/api/chat/support/accept/${conversationId}`);
      toast.success(lang === 'ar' ? 'تم قبول الطلب وبدء المحادثة!' : 'Request accepted!');
      loadData(); // تحديث القائمة
      if (openChatWithUser) openChatWithUser(conversationId); // فتح الشات مع المريض
    } catch(err: any) {
      toast.error(err.response?.data?.error || err.error || 'حدث خطأ');
      loadData(); // ربما قبله شخص آخر، نحدث القائمة
    }
  };
  useEffect(() => { loadData(); }, [activeTab]);

  const fetchAppointments = async () => {
    setLoadingAppointments(true);
    try {
      const data = await api.get(`/api/appointments/doctor?date=${appointmentDate}`);
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) { 
      toast.error(lang === 'ar' ? 'فشل جلب المواعيد' : 'Failed to fetch appointments'); 
      setAppointments([]); 
    }
    setLoadingAppointments(false);
  };

  useEffect(() => { if (activeTab === 'appointments') fetchAppointments(); }, [activeTab, appointmentDate]);

  const handleAppointmentStatus = async (id: number, status: string) => {
    try {
      await api.patch(`/api/appointments/${id}/status`, { status });
      toast.success(lang === 'ar' ? 'تم تحديث حالة الموعد' : 'Appointment status updated');
      fetchAppointments();
    } catch (err) { toast.error(lang === 'ar' ? 'حدث خطأ' : 'Error occurred'); }
  };

  const fetchSuperAdmins = async () => {
    setLoadingSuperAdmins(true);
    try { const data = await api.get('/api/admin/super-admins'); setSuperAdmins(Array.isArray(data) ? data : []); } catch (err: any) { console.error(err); }
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
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row w-full overflow-hidden transition-colors">
      
      {/* 🟢 القائمة الجانبية (Sidebar) */}
      <div className="w-full md:w-64 bg-white dark:bg-slate-900 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 md:sticky md:top-0 md:h-screen z-20 transition-colors">
        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white hidden lg:flex items-center gap-2">Taiba Health</h1>
          <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
             <button onClick={onGoToPublic} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-sm border border-emerald-200 dark:border-emerald-800">
               <LayoutDashboard size={16} /> {lang === 'ar' ? 'الرئيسية' : 'Home'}
             </button>
             <button onClick={onLogout} className="md:hidden p-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"><LogOut size={18} /></button>
          </div>
        </div>
        
        <div className="mx-4 mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-800 dark:to-indigo-800 rounded-2xl p-4 text-white shadow-lg shadow-blue-200 dark:shadow-none relative overflow-hidden">
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
          
          {(user.role === 'doctor' || user.role === 'dentist') && (
            <button onClick={() => setActiveTab('appointments')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${activeTab === 'appointments' ? 'bg-indigo-600 text-white ring-2 ring-indigo-200 dark:ring-indigo-900' : 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'}`}>
              <Calendar size={18} /> {lang === 'ar' ? 'إدارة مواعيد العيادة' : 'Appointments'}
            </button>
          )}

          {user.role !== 'patient' && <button onClick={() => setActiveTab('facilities')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'facilities' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><MapPin size={18} /> {dashboardTitle}</button>}
          {(user.role === 'admin' || user.role === 'doctor' || user.role === 'dentist') && (<button onClick={() => setActiveTab('services')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'services' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><Activity size={18} /> {lang === 'ar' ? 'الخدمات التي أقدمها' : 'My Services'}</button>)}
          {(user?.role === 'doctor' || user?.role === 'dentist' || isSuperAdmin) && (
            <button onClick={() => setActiveTab('doctor_profile')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'doctor_profile' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <User size={18} /> {lang === 'ar' ? (isSuperAdmin ? 'إدارة ملفات الأطباء' : 'ملف الطبيب الشخصي') : 'Doctor Profiles'}
            </button>
          )}

          {(user.role === 'admin' || hasEcommerce) && (<><button onClick={() => setActiveTab('products')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'products' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><Package size={18} /> {lang === 'ar' ? 'إدارة المنتجات' : 'Products Manager'}</button><button onClick={() => setActiveTab('orders')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><FileText size={18} /> {lang === 'ar' ? 'طلبات الزبائن' : 'Customer Orders'}</button></>)}
          {user.role === 'admin' && <button onClick={() => setActiveTab('users')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><User size={18} /> {t?.userManagement || 'إدارة المستخدمين'}</button>}
          {(user.role === 'customer_service' || user.role === 'admin') && (
            <button onClick={() => setActiveTab('support')} className={`shrink-0 md:w-full flex items-center justify-between gap-2 px-4 py-2.5 md:py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${activeTab === 'support' ? 'bg-indigo-600 text-white ring-2 ring-indigo-200 dark:ring-indigo-900' : 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'}`}>
              <div className="flex items-center gap-2"><MessageSquare size={18} /> {lang === 'ar' ? 'طلبات الدعم الفني' : 'Support Tickets'}</div>
              {supportRequests.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">{supportRequests.length}</span>}
            </button>
          )}
          {isSuperAdmin && <button onClick={() => setActiveTab('wallet_requests')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'wallet_requests' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><Banknote size={18} /> {lang === 'ar' ? 'طلبات المحفظة' : 'Wallet Requests'}</button>}
          {isSuperAdmin && <button onClick={() => setActiveTab('settings')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><Layout size={18} /> {lang === 'ar' ? 'إعدادات الفوتر' : 'Footer Settings'}</button>}
          {isSuperAdmin && <button onClick={() => { setActiveTab('super_settings'); fetchSuperAdmins(); }} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'super_settings' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><ShieldAlert size={18} /> {lang === 'ar' ? 'غرفة السوبر آدمن' : 'Super Admins'}</button>}
          <button onClick={() => setActiveTab('profile')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><Settings size={18} /> {t?.profileSettings || 'الإعدادات الشخصية'}</button>
          
        </nav>
        <div className="hidden md:block p-4 border-t border-slate-100 dark:border-slate-800 mt-auto"><div className="flex items-center gap-3 px-4 py-3 mb-2"><div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold shrink-0">{user.name[0]}</div><div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</p><p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role === 'admin' ? (t?.admin || 'مدير') : (user.role === 'dentist' ? (lang === 'ar' ? 'طبيب أسنان' : 'Dentist') : (user.role === 'doctor' ? (t?.doctor || 'طبيب') : (user.role === 'pharmacist' ? (t?.pharmacist || 'صيدلي') : 'مريض')))}</p></div></div><button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"><LogOut size={18} /> {t?.logout || 'تسجيل الخروج'}</button></div>
      </div>

      {/* 🟢 محتوى الصفحة الرئيسي (بدون تجميد الحركات) */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 w-full relative">
        
        {/* 0. طلبات الدعم الفني (Customer Service) */}
          {activeTab === 'support' && (user.role === 'customer_service' || user.role === 'admin') && (
            <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <MessageSquare className="text-indigo-600 dark:text-indigo-400"/> {lang === 'ar' ? 'طلبات الدعم الفني المعلقة' : 'Pending Support Tickets'}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{lang === 'ar' ? 'المرضى الذين ينتظرون الرد. قم بقبول الطلب لفتح المحادثة.' : 'Patients waiting for a response.'}</p>
                </div>
                <button onClick={loadData} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><Activity size={20} /></button>
              </div>

              {loadingSupport ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600"></div></div>
              ) : supportRequests.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center border border-dashed border-slate-300 dark:border-slate-700">
                  <Smile size={64} className="mx-auto text-emerald-300 dark:text-emerald-600 mb-4" />
                  <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">{lang === 'ar' ? 'لا يوجد طلبات معلقة!' : 'No pending tickets!'}</h3>
                  <p className="text-slate-500">{lang === 'ar' ? 'عمل رائع، لقد قمت بالرد على الجميع.' : 'Great job, inbox zero.'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {supportRequests.map(req => (
                    <div key={req.conversation_id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-indigo-50 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-bl-full flex items-start justify-end p-2 z-0">
                        <span className="w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
                      </div>
                      <div className="flex items-center gap-4 mb-6 relative z-10">
                        <div className="w-14 h-14 bg-indigo-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold text-xl overflow-hidden shadow-sm">
                          {req.profile_picture ? <img src={req.profile_picture} className="w-full h-full object-cover" /> : req.patient_name[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-1">{req.patient_name}</h3>
                          <p className="text-xs text-slate-500 flex items-center gap-1"><Clock size={12}/> {new Date(req.created_at).toLocaleTimeString(lang==='ar'?'ar-EG':'en-US', {hour:'2-digit', minute:'2-digit'})}</p>
                        </div>
                      </div>
                      <button onClick={() => acceptSupportRequest(req.conversation_id)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-md">
                        <CheckCircle size={18} /> {lang === 'ar' ? 'قبول المحادثة' : 'Accept Chat'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* 1. المواعيد */}
          {activeTab === 'appointments' && (user.role === 'doctor' || user.role === 'dentist') && (
            <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="text-indigo-600 dark:text-indigo-400"/> {lang === 'ar' ? 'إدارة المواعيد' : 'Appointments Management'}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{lang === 'ar' ? 'قم بإدارة قائمة الانتظار للمرضى لليوم المحدد.' : 'Manage patients waiting list for the selected date.'}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center">
                  <input type="date" className="bg-transparent font-bold text-slate-700 dark:text-slate-300 outline-none px-2 dark:[color-scheme:dark]" value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center"><Users size={24}/></div>
                  <div><p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">{lang === 'ar' ? 'إجمالي الحجوزات' : 'Total Bookings'}</p><h4 className="text-2xl font-black text-slate-900 dark:text-white">{(appointments || []).length} / {user.daily_limit || 20}</h4></div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-orange-200 dark:border-orange-800 shadow-sm flex items-center gap-4 ring-1 ring-orange-50 dark:ring-orange-900/30">
                  <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400 rounded-full flex items-center justify-center relative">
                    <Clock size={24}/>
                    {(appointments || []).filter(a => a.status === 'waiting').length > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>}
                  </div>
                  <div><p className="text-xs text-orange-600 dark:text-orange-400 font-bold uppercase">{lang === 'ar' ? 'في الانتظار حالياً' : 'Waiting Now'}</p><h4 className="text-2xl font-black text-orange-600 dark:text-orange-400">{(appointments || []).filter(a => a.status === 'waiting').length}</h4></div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center"><CheckCircle size={24}/></div>
                  <div><p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">{lang === 'ar' ? 'تم الكشف' : 'Completed'}</p><h4 className="text-2xl font-black text-slate-900 dark:text-white">{(appointments || []).filter(a => a.status === 'completed').length}</h4></div>
                </div>
              </div>

              {loadingAppointments ? (
                  <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600"></div></div>
              ) : (!appointments || appointments.length === 0) ? (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700">
                    <Calendar size={64} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">{lang === 'ar' ? 'لا يوجد مواعيد لهذا اليوم' : 'No appointments for this date'}</h3>
                  </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right min-w-[800px]">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'رقم' : 'No.'}</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'اسم المريض' : 'Patient Name'}</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'رقم الهاتف' : 'Phone'}</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 text-center">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 text-center">{lang === 'ar' ? 'الإجراءات والوصفة' : 'Actions & Rx'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {appointments.map((appt, idx) => (
                          <tr key={appt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-slate-400">#{idx + 1}</td>
                            <td className="px-6 py-4">
                              <span className="font-bold text-slate-900 dark:text-white block mb-1">{appt.patient_name}</span>
                              <button onClick={() => setPatientRecordModal({isOpen: true, patientId: appt.patient_id, appointmentId: appt.id, patientName: appt.patient_name})} className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-md font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1 w-max">
                                <FileText size={12}/> {lang === 'ar' ? 'السجل والوصفة (روشتة)' : 'EHR & Rx'}
                              </button>
                            </td>
                            <td className="px-6 py-4 font-mono text-sm text-slate-600 dark:text-slate-400" dir="ltr">{appt.patient_phone || '---'}</td>
                            <td className="px-6 py-4 text-center">
                              {appt.status === 'pending' && <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-full">{lang === 'ar' ? 'تم الحجز' : 'Pending'}</span>}
                              {appt.status === 'waiting' && <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-bold rounded-full animate-pulse flex items-center justify-center gap-1 w-max mx-auto"><Clock size={12}/> {lang === 'ar' ? 'في الانتظار' : 'Waiting'}</span>}
                              {appt.status === 'completed' && <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full flex items-center justify-center gap-1 w-max mx-auto"><CheckCircle size={12}/> {lang === 'ar' ? 'تم الكشف' : 'Completed'}</span>}
                              {appt.status === 'cancelled' && <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold rounded-full">{lang === 'ar' ? 'إلغاء' : 'Cancelled'}</span>}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                {appt.status === 'pending' && (
                                  <>
                                    <button onClick={() => handleAppointmentStatus(appt.id, 'waiting')} className="px-3 py-1.5 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500 dark:hover:bg-orange-600 hover:text-white rounded-lg text-xs font-bold transition-colors">{lang === 'ar' ? 'وصل (للانتظار)' : 'Waiting'}</button>
                                    <button onClick={() => handleAppointmentStatus(appt.id, 'cancelled')} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title={lang === 'ar' ? 'إلغاء' : 'Cancel'}><X size={16}/></button>
                                  </>
                                )}
                                {appt.status === 'waiting' && (
                                  <button onClick={() => handleAppointmentStatus(appt.id, 'completed')} className="px-4 py-1.5 bg-emerald-500 dark:bg-emerald-600 text-white hover:bg-emerald-600 dark:hover:bg-emerald-700 rounded-lg text-xs font-bold transition-colors shadow-sm">{lang === 'ar' ? 'إنهاء الكشف' : 'Complete'}</button>
                                )}
                                {openChatWithUser && (
                                  <button onClick={() => openChatWithUser(appt.patient_id)} className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title={lang === 'ar' ? 'مراسلة المريض' : 'Chat Patient'}>
                                    <MessageSquare size={16}/>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. الإعدادات الشخصية */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto animate-in fade-in duration-300">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-8">{t?.profileSettings || 'إعدادات الحساب'}</h2>
              
              <div className="mb-8 p-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 transition-all hover:shadow-blue-200 dark:hover:shadow-none">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">🔔 {lang === 'ar' ? 'الإشعارات المباشرة' : 'Push Notifications'}</h3>
                  <p className="text-blue-100 text-sm mt-1">{lang === 'ar' ? 'فعل الإشعارات لتبقى على اطلاع بكل جديد فوراً.' : 'Enable notifications to stay updated instantly.'}</p>
                </div>
                <button onClick={enableNotifications} className="shrink-0 bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-sm active:scale-95">
                  {lang === 'ar' ? 'تفعيل الآن' : 'Enable Now'}
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t?.fullName || 'الاسم الكامل'}</label><input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" value={profileName} onChange={e => setProfileName(e.target.value)} disabled={isSubmittingProfile} /></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t?.email || 'البريد الإلكتروني'}</label><input type="email" required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} disabled={isSubmittingProfile} /></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t?.phone || 'رقم الهاتف'}</label><input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} disabled={isSubmittingProfile} /></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t?.notes || 'ملاحظات'}</label><textarea className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" rows={3} value={profileNotes} onChange={e => setProfileNotes(e.target.value)} disabled={isSubmittingProfile} /></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t?.newPassword || 'كلمة المرور الجديدة'}</label><input type="password" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={profileNewPassword} onChange={e => setProfileNewPassword(e.target.value)} disabled={isSubmittingProfile} /></div>
                <div className="pt-4 border-t dark:border-slate-800"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t?.currentPassword || 'كلمة المرور الحالية'}</label><input type="password" required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900 text-left" dir="ltr" value={profileCurrentPassword} onChange={e => setProfileCurrentPassword(e.target.value)} disabled={isSubmittingProfile} /></div>
                <button type="submit" disabled={isSubmittingProfile} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">{isSubmittingProfile ? <span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span> : null}{t?.saveChanges || 'حفظ التعديلات'}</button>
              </form>
            </div>
          )}

          {/* 3. إدارة المنشآت */}
          {activeTab === 'facilities' && user.role !== 'patient' && (
            <div className="animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{dashboardTitle}</h2>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  {user.role === 'admin' && <select className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={doctorFilter} onChange={e => setDoctorFilter(parseInt(e.target.value))}><option value="0">{t?.allDoctors || 'كل الأطباء'}</option>{users.filter(u => u.role !== 'admin' && u.role !== 'patient').map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>}
                  <button onClick={() => { setEditingData(null); setForm({ name: '', address: '', phone: '', type: user.role === 'dentist' ? 'dental_clinic' : (user.role === 'doctor' ? 'clinic' : 'pharmacy'), latitude: 35.25, longitude: 36.7, whatsapp_phone: '', pharmacist_name: '', specialty: '', services: '', consultation_fee: 0, waiting_time: '15 دقيقة', image_url: '', doctor_id: 0, working_hours: defaultWorkingHours }); setShowModal(true); }} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors"><Plus size={20} /> {addButtonText}</button>
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
                {facilities.filter(p => doctorFilter === 0 || p.doctor_id === doctorFilter).map(f => {
                  const isOpenNow = checkIsOpenNow(f);
                  return (
                    <div key={f.id} className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4 gap-2">
                        <div className="flex items-center gap-4">
                          {f.image_url ? <img src={f.image_url} className="w-14 h-14 rounded-xl object-cover border border-slate-100 dark:border-slate-700"/> : <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center"><Store size={24}/></div>}
                          <div><span className={`text-[10px] px-2 py-1 rounded-full font-bold inline-block mb-1 ${f.type === 'clinic' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : (f.type === 'dental_clinic' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400')}`}>{f.type === 'clinic' ? (lang === 'ar' ? 'عيادة طبية' : 'Clinic') : (f.type === 'dental_clinic' ? (lang === 'ar' ? 'عيادة أسنان' : 'Dental Clinic') : (lang === 'ar' ? 'صيدلية' : 'Pharmacy'))}</span><h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">{f.name}</h3></div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {isOpenNow ? <span className="bg-emerald-500 text-white text-xs px-3 py-1 rounded-lg font-bold animate-pulse">{lang === 'ar' ? 'مفتوح الآن' : 'Open'}</span> : <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs px-3 py-1 rounded-lg font-bold">{lang === 'ar' ? 'مغلق حالياً' : 'Closed'}</span>}
                          {isSuperAdmin && f.type === 'pharmacy' && (
                            <button onClick={() => toggleEcommerce(f.id, f.is_ecommerce_enabled || false)} className={`text-[10px] px-2 py-1 rounded-md font-bold mt-2 ${f.is_ecommerce_enabled ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>{lang === 'ar' ? 'المتجر: ' : 'Store: '}{f.is_ecommerce_enabled ? (lang === 'ar' ? 'مفعل' : 'ON') : (lang === 'ar' ? 'معطل' : 'OFF')}</button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 text-slate-600 dark:text-slate-400 mb-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        {(f.type === 'clinic' || f.type === 'dental_clinic') && f.specialty && <p className="flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-1"><Stethoscope size={14} className="shrink-0"/> <span className="truncate">{f.specialty}</span></p>}
                        <p className="flex items-center gap-2 text-sm"><MapPin size={14} className="shrink-0"/> <span className="truncate">{f.address}</span></p>
                        <p className="flex items-center gap-2 text-sm"><Phone size={14} className="shrink-0"/> <span className="truncate">{f.phone}</span></p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl mt-4 flex flex-col sm:flex-row items-center gap-2 border border-slate-100 dark:border-slate-700">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 sm:mb-0 sm:ml-2 w-full sm:w-auto text-center sm:text-right">{lang === 'ar' ? 'الدوام اليدوي:' : 'Manual Status:'}</span>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button onClick={() => setManualStatus(f.id, 'open')} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${f.manual_status==='open' ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-200 dark:ring-blue-900' : 'bg-white dark:bg-slate-900 border dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>{lang === 'ar' ? 'مفتوح دائماً' : 'Always Open'}</button>
                          <button onClick={() => setManualStatus(f.id, 'closed')} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${f.manual_status==='closed' ? 'bg-red-500 text-white shadow-sm ring-2 ring-red-200 dark:ring-red-900' : 'bg-white dark:bg-slate-900 border dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>{lang === 'ar' ? 'مغلق دائماً' : 'Always Closed'}</button>
                          <button onClick={() => setManualStatus(f.id, 'auto')} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!f.manual_status || f.manual_status==='auto' ? 'bg-indigo-500 text-white shadow-sm ring-2 ring-indigo-200 dark:ring-indigo-900' : 'bg-white dark:bg-slate-900 border dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>{lang === 'ar' ? 'حسب الجدول' : 'Auto'}</button>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                        <button onClick={() => { setEditingData(f); setForm({...f, working_hours: f.working_hours || defaultWorkingHours}); setShowModal(true); }} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><Edit2 size={14} /> {lang === 'ar' ? 'تعديل البيانات' : 'Edit'}</button>
                        <button onClick={() => openConfirm(t?.confirmTitle || 'تأكيد', t?.confirmBody || 'هل أنت متأكد؟', async () => { await api.delete(`/api/pharmacies/${f.id}`); loadData(); toast.success('تم الحذف بنجاح'); })} className="px-4 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. بقية التبويبات المساعدة */}
          {activeTab === 'services' && (<div className="animate-in fade-in duration-300"><ServicesManager user={user} facilities={facilities.filter(f => f.type === 'clinic' || f.type === 'dental_clinic')} lang={lang} /></div>)}
          {activeTab === 'products' && (<div className="animate-in fade-in duration-300"><ProductsManager user={user} facilities={facilities.filter(f => f.type === 'pharmacy')} lang={lang} /></div>)}
          {activeTab === 'orders' && (<div className="animate-in fade-in duration-300"><OrdersManager user={user} facilities={facilities.filter(f => f.type === 'pharmacy')} lang={lang} /></div>)}
          {activeTab === 'wallet_requests' && (<div className="animate-in fade-in duration-300"><WalletRequestsManager user={user} lang={lang} /></div>)}
          
          {activeTab === 'super_settings' && isSuperAdmin && (
            <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
              <div className="bg-gradient-to-r from-purple-900 to-indigo-800 rounded-3xl p-6 md:p-8 mb-8 text-white shadow-xl flex items-center gap-4">
                <ShieldAlert size={48} className="text-purple-300 opacity-80 hidden sm:block" />
                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold mb-2">{lang === 'ar' ? 'غرفة التحكم العليا' : 'Supreme Control Room'}</h2>
                  <p className="text-purple-200 text-sm">{lang === 'ar' ? 'انتبه: من تضيفه هنا سيملك تحكماً كاملاً ومطلقاً بالنظام وقواعد البيانات.' : 'Warning: Absolute power granted to members here.'}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                <form onSubmit={handleAddSuperAdmin} className="flex flex-col sm:flex-row gap-3 mb-8 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <input type="email" placeholder={lang === 'ar' ? "أدخل إيميل المدير الجديد (مثل: admin@mail.com)" : "New Super Admin Email..."} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-purple-500 text-left" dir="ltr" value={newSuperAdmin} onChange={e => setNewSuperAdmin(e.target.value)} required disabled={isSubmittingSuperAdmin} />
                  <button type="submit" disabled={isSubmittingSuperAdmin} className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    {isSubmittingSuperAdmin ? <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span> : <Plus size={20}/>} 
                    {lang === 'ar' ? 'ترقية لمدير خارق' : 'Promote'}
                  </button>
                </form>

                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg mb-4 flex items-center gap-2"><User size={20} className="text-purple-600 dark:text-purple-400"/> {lang === 'ar' ? 'المديرون الخارقون الحاليون' : 'Current Super Admins'}</h3>
                
                {loadingSuperAdmins ? (
                  <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-purple-600"></div></div>
                ) : (
                  <div className="space-y-3">
                    {superAdmins.map((email) => (
                      <div key={email} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl hover:border-purple-200 dark:hover:border-purple-800 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full flex items-center justify-center font-bold text-lg">{email[0].toUpperCase()}</div>
                          <span className="font-bold text-slate-700 dark:text-slate-200 text-base md:text-lg tracking-wide" dir="ltr">{email}</span>
                        </div>
                        <button onClick={() => handleRemoveSuperAdmin(email)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"><Trash2 size={20} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && user.role === 'admin' && (
            <div className="animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8"><div><h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{t?.userManagement || 'إدارة المستخدمين'}</h2></div><div className="flex flex-wrap gap-3 w-full sm:w-auto">{isSuperAdmin && <button onClick={generateActivationKey} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-6 py-3 rounded-xl font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">{lang === 'ar' ? 'توليد مفتاح تفعيل' : 'Generate Key'}</button>}<button onClick={() => { setEditingUser(null); setUserForm({ email: '', password: '', role: 'pharmacist', name: '', pharmacy_limit: 10, phone: '', notes: '', wallet_balance: 0, is_active: false }); setShowUserModal(true); }} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"><Plus size={20} /> {t?.createUser || 'إضافة مستخدم'}</button></div></div>
              
              {generatedKey && (
                <div className="mb-6 p-4 md:p-6 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in slide-in-from-top-4 duration-300">
                  <div>
                    <p className="text-sm text-emerald-800 dark:text-emerald-400 font-bold mb-1">{lang === 'ar' ? 'تم توليد المفتاح بنجاح! انسخه وأرسله للمستخدم:' : 'New Activation Key:'}</p>
                    <p className="text-xl md:text-2xl font-mono font-extrabold text-emerald-900 dark:text-emerald-300 select-all tracking-wider" dir="ltr">{generatedKey}</p>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(generatedKey); toast.success(lang === 'ar' ? 'تم نسخ المفتاح للحافظة' : 'Key copied to clipboard'); }} className="shrink-0 bg-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-md">
                    {lang === 'ar' ? 'نسخ المفتاح' : 'Copy Key'}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {users.map(u => {
                  const isTargetSuperAdmin = (SUPER_ADMINS || []).includes(u.email) || superAdmins.includes(u.email); const canEditTarget = !isTargetSuperAdmin || u.email === user.email; const canDeleteTarget = !isTargetSuperAdmin; 
                  return (
                    <div key={u.id} className={`p-5 md:p-6 rounded-2xl border shadow-sm flex flex-col gap-4 ${!u.is_active ? 'bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                      <div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-xl shrink-0">{u.name[0]}</div><div className="flex-1 min-w-0"><div className="flex justify-between items-start"><span className="font-bold text-slate-900 dark:text-white truncate text-left text-base md:text-lg">{u.name}</span>{!u.is_active && <span className="shrink-0 px-2 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full mr-2">Pending</span>}</div><p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 truncate mt-1" dir="ltr">{u.email}</p><div className="flex gap-2 mt-2 flex-wrap"><span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isTargetSuperAdmin ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{u.role}</span><span className="inline-block px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[10px] font-bold uppercase tracking-wider">{(parseFloat(u.wallet_balance || '0') / 100).toLocaleString()} ل.س جديدة </span></div></div></div>
                      <div className="flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-4 mt-auto">
                        {!u.is_active && <button onClick={() => approveUser(u.id)} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"><CheckCircle size={14} /> {lang === 'ar' ? 'تفعيل' : 'Approve'}</button>}
                        {isSuperAdmin && <button onClick={() => setAdminWalletModal({isOpen: true, userId: u.id})} className="flex-1 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1"><Banknote size={14} /> {lang === 'ar' ? 'الرصيد' : 'Balance'}</button>}
                        {u.is_active && canEditTarget && <button onClick={() => { 
                          setEditingUser(u); 
                          setUserForm({ email: u.email, password: '', role: u.role, name: u.name, phone: u.phone || '', notes: u.notes || '', wallet_balance: u.wallet_balance || 0, is_active: u.is_active || false, pharmacy_limit: 10 }); 
                          setShowUserModal(true); 
                        }} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center"><Edit2 size={16} /></button>}
                        {canDeleteTarget && <button onClick={() => openConfirm(t?.confirmTitle || 'تأكيد', t?.confirmBody || 'هل أنت متأكد؟', async () => { await api.delete(`/api/admin/users/${u.id}`); loadData(); toast.success('تم حذف المستخدم'); })} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400"><Trash2 size={16} /></button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'settings' && isSuperAdmin && (
            <div className="max-w-4xl mx-auto pb-12 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 mb-6"><Layout size={32} className="text-blue-600 dark:text-blue-400" /><div><h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{lang === 'ar' ? 'إعدادات الفوتر' : 'Footer Settings'}</h2><p className="text-sm text-slate-500 mt-1">{lang === 'ar' ? 'أي حقل تتركه فارغاً هنا، سيتم إخفاؤه تلقائياً من الفوتر في واجهة المستخدم.' : 'Leave any field empty to hide it from the public footer.'}</p></div></div>
              <form onSubmit={handleSaveFooter} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
                <div>
                  <h3 className="font-bold text-lg mb-4 text-blue-600 dark:text-blue-400 border-b dark:border-slate-800 pb-2">{lang === 'ar' ? 'الروابط الرئيسية' : 'Main Links'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold mb-1 text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'اسم التطبيق / الشعار' : 'App Name'}</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={footerForm.appName || ''} onChange={e => setFooterForm({...footerForm, appName: e.target.value})} placeholder="Taibet Health" /></div>
                    <div><label className="block text-xs font-bold mb-1 text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'رابط (من نحن)' : 'About Us'}</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.aboutLink || ''} onChange={e => setFooterForm({...footerForm, aboutLink: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold mb-1 text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'رابط (فريق العمل)' : 'Team'}</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.teamLink || ''} onChange={e => setFooterForm({...footerForm, teamLink: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold mb-1 text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'رابط (وظائف)' : 'Careers'}</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.careersLink || ''} onChange={e => setFooterForm({...footerForm, careersLink: e.target.value})} /></div>
                    <div className="md:col-span-2"><label className="block text-xs font-bold mb-1 text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'رابط (انضم إلى الأطباء)' : 'Join Doctors'}</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.doctorJoinLink || ''} onChange={e => setFooterForm({...footerForm, doctorJoinLink: e.target.value})} /></div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-4 text-blue-600 dark:text-blue-400 border-b dark:border-slate-800 pb-2">{lang === 'ar' ? 'روابط المساعدة والسياسات' : 'Help & Policies'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold mb-1 text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'رابط (مكتبة طبية)' : 'Medical Library'}</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.libraryLink || ''} onChange={e => setFooterForm({...footerForm, libraryLink: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold mb-1 text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'رابط (اتصل بنا)' : 'Contact Us'}</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.contactLink || ''} onChange={e => setFooterForm({...footerForm, contactLink: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold mb-1 text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'رابط (شروط الاستخدام)' : 'Terms of Use'}</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.termsLink || ''} onChange={e => setFooterForm({...footerForm, termsLink: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold mb-1 text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'رابط (اتفاقية الخصوصية)' : 'Privacy Policy'}</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.privacyLink || ''} onChange={e => setFooterForm({...footerForm, privacyLink: e.target.value})} /></div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-4 text-blue-600 dark:text-blue-400 border-b dark:border-slate-800 pb-2">{lang === 'ar' ? 'التطبيقات والسوشيال ميديا' : 'Apps & Social'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold mb-1 text-slate-500 dark:text-slate-400">Google Play Link</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.androidLink || ''} onChange={e => setFooterForm({...footerForm, androidLink: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold mb-1 text-slate-500 dark:text-slate-400">App Store Link</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.iosLink || ''} onChange={e => setFooterForm({...footerForm, iosLink: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold mb-1 text-slate-500 dark:text-slate-400">Facebook Link</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.facebook || ''} onChange={e => setFooterForm({...footerForm, facebook: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold mb-1 text-slate-500 dark:text-slate-400">Instagram Link</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.instagram || ''} onChange={e => setFooterForm({...footerForm, instagram: e.target.value})} /></div>
                    <div className="md:col-span-2"><label className="block text-xs font-bold mb-1 text-slate-500 dark:text-slate-400">X (Twitter) Link</label><input type="text" className="w-full p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={footerForm.twitter || ''} onChange={e => setFooterForm({...footerForm, twitter: e.target.value})} /></div>
                  </div>
                </div>
                <button type="submit" disabled={isSubmittingSettings} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg mt-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50">
                  {isSubmittingSettings ? <span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span> : null}
                  {lang === 'ar' ? 'حفظ إعدادات الفوتر والتطبيق' : 'Save All Settings'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'doctor_profile' && (user?.role === 'doctor' || user?.role === 'dentist' || isSuperAdmin) && (
            <div className="max-w-4xl mx-auto pb-12 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 mb-8">
                <Stethoscope size={32} className="text-blue-600 dark:text-blue-400" />
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{lang === 'ar' ? 'إدارة الملف الشخصي للطبيب' : 'Manage Doctor Profile'}</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{lang === 'ar' ? 'تعديل التخصص، سعر الكشف، الحد اليومي للمرضى، والأسئلة الشائعة.' : 'Update specialty, consultation fee, daily limit, and FAQs.'}</p>
                </div>
              </div>

              {isSuperAdmin && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
                   <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{lang === 'ar' ? 'البحث عن طبيب للتعديل عليه (صلاحيات الآدمن)' : 'Search Doctor to Edit'}</h3>
                   <div className="relative mb-4">
                     <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                     <input type="text" className="w-full pr-12 pl-4 py-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:border-blue-500" placeholder={lang === 'ar' ? 'ابحث عن اسم الطبيب...' : 'Search doctor name...'} value={doctorSearch} onChange={e => setDoctorSearch(e.target.value)} />
                   </div>
                   <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                     {users.filter(u => (u.role === 'doctor' || u.role === 'dentist') && u.name.includes(doctorSearch)).map(doc => (
                        <button key={doc.id} type="button" onClick={() => setTargetDoctorId(doc.id)} className={`w-full text-right p-3 rounded-xl border flex items-center gap-3 transition-colors ${targetDoctorId === doc.id ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 font-bold' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                           <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold">{doc.name[0]}</div>
                           <div><span className="block font-bold">{doc.name}</span><span className="text-xs font-normal text-slate-500 dark:text-slate-400">{doc.role === 'dentist' ? 'طبيب أسنان' : 'طبيب بشري'}</span></div>
                        </button>
                      ))}
                   </div>
                </div>
              )}

              {targetDoctorId ? (
                <form onSubmit={handleSaveDoctorProfile} className="space-y-8">
                  <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b dark:border-slate-800 pb-3">{lang === 'ar' ? 'البيانات الأساسية' : 'Basic Info'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold mb-2 dark:text-slate-300">{lang === 'ar' ? 'التخصص الطبي' : 'Specialty'}</label>
                        <select className="w-full p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:border-blue-500" value={doctorForm.specialty} onChange={e => setDoctorForm({...doctorForm, specialty: e.target.value})} disabled={isSubmittingDoctorProfile}>
                          <option value="">{lang === 'ar' ? 'اختر التخصص...' : 'Select Specialty...'}</option>
                          {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2 dark:text-slate-300">{lang === 'ar' ? 'سعر الكشفية (ل.س جديدة)' : 'Consultation Fee (New L.S)'}</label>
                        <input type="number" min="0" step="0.01" className="w-full p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:border-blue-500" value={doctorForm.consultation_price} onChange={e => setDoctorForm({...doctorForm, consultation_price: Number(e.target.value)})} disabled={isSubmittingDoctorProfile} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold mb-2 dark:text-slate-300">{lang === 'ar' ? 'الحد الأقصى للمرضى في اليوم (للحجوزات)' : 'Daily Appointments Limit'}</label>
                        <input type="number" min="1" max="100" className="w-full p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:border-blue-500" value={doctorForm.daily_limit} onChange={e => setDoctorForm({...doctorForm, daily_limit: Number(e.target.value)})} disabled={isSubmittingDoctorProfile} />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{lang === 'ar' ? 'بمجرد وصول عدد الحجوزات لهذا الرقم في يوم ما، سيتم إغلاق الحجز لذلك اليوم.' : 'Once reached, bookings will close for that day.'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold mb-2 dark:text-slate-300">{lang === 'ar' ? 'نبذة عن الطبيب' : 'About Doctor'}</label>
                        <textarea rows={4} className="w-full p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:border-blue-500 resize-none" placeholder={lang === 'ar' ? 'اكتب نبذة عن خبراتك وشهاداتك...' : 'Write about your experience...'} value={doctorForm.about} onChange={e => setDoctorForm({...doctorForm, about: e.target.value})} disabled={isSubmittingDoctorProfile} />
                      </div>
                      
                      <div className="md:col-span-2 flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 mt-2">
                        <input type="checkbox" id="showDirCheck" className="w-5 h-5 accent-blue-600 cursor-pointer" checked={doctorForm.show_in_directory} onChange={e => setDoctorForm({...doctorForm, show_in_directory: e.target.checked})} disabled={isSubmittingDoctorProfile} />
                        <label htmlFor="showDirCheck" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                          {lang === 'ar' ? 'إظهار هذا الطبيب في دليل الأطباء للمرضى' : 'Show this doctor in patients directory'}
                        </label>
                      </div>

                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b dark:border-slate-800 pb-3">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{lang === 'ar' ? 'الأسئلة الطبية الشائعة (FAQ)' : 'Medical FAQs'}</h3>
                      <button type="button" onClick={addFaq} disabled={isSubmittingDoctorProfile} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"><Plus size={16} /> {lang === 'ar' ? 'إضافة سؤال' : 'Add Question'}</button>
                    </div>
                    {doctorForm.faqs.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 font-medium">{lang === 'ar' ? 'لم تقم بإضافة أي أسئلة بعد.' : 'No FAQs added yet.'}</div>
                    ) : (
                      <div className="space-y-4">
                        {doctorForm.faqs.map((faq, index) => (
                          <div key={faq.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800/50 relative group">
                            <button type="button" onClick={() => removeFaq(faq.id)} disabled={isSubmittingDoctorProfile} className="absolute top-4 rtl:left-4 ltr:right-4 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded-lg transition-colors"><Trash2 size={18} /></button>
                            <div className="mb-3 pr-10">
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{lang === 'ar' ? `السؤال ${index + 1}` : `Question ${index + 1}`}</label>
                              <input type="text" className="w-full p-2.5 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-slate-900 dark:text-white" value={faq.question} onChange={e => updateFaq(faq.id, 'question', e.target.value)} required disabled={isSubmittingDoctorProfile} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{lang === 'ar' ? 'الإجابة' : 'Answer'}</label>
                              <textarea rows={2} className="w-full p-2.5 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:border-blue-500 bg-white dark:bg-slate-900 dark:text-white resize-none" value={faq.answer} onChange={e => updateFaq(faq.id, 'answer', e.target.value)} required disabled={isSubmittingDoctorProfile} />
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
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm"><User className="mx-auto mb-4 text-slate-300 dark:text-slate-600" size={48} /><p className="text-slate-500 dark:text-slate-400 font-bold">{lang === 'ar' ? 'الرجاء اختيار طبيب من القائمة أعلاه للبدء بالتعديل.' : 'Please select a doctor to edit.'}</p></div>
              )}
            </div>
          )}

      </div>

      {/* 🟢 النوافذ المنبثقة (Modals) */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[50]">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10"><h2 className="text-xl font-bold dark:text-white">{editingData ? 'تعديل المنشأة' : 'إضافة منشأة جديدة'}</h2><button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><X size={20} /></button></div>
              <div className="p-6 overflow-y-auto flex-1">
                <form id="facilityForm" onSubmit={handleSaveFacility} className="space-y-6">
                  <div className="flex flex-col items-center">
                    <div className="w-32 h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center relative overflow-hidden group">
                      {form.image_url ? <img src={form.image_url} className="w-full h-full object-cover" /> : <UploadCloud size={32} className="text-slate-400 group-hover:text-blue-500 transition-colors" />}
                      <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        {uploadingImage ? <span className="animate-spin h-6 w-6 border-2 border-white rounded-full border-t-transparent"></span> : <span className="text-white text-sm font-bold">رفع صورة</span>}
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage || isSubmittingFacility} />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold mb-1 dark:text-slate-300">اسم المنشأة</label><input required className="w-full p-3 border dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:border-blue-500" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} disabled={isSubmittingFacility} /></div>
                    {user.role === 'admin' && (<div><label className="block text-sm font-bold mb-1 dark:text-slate-300">النوع</label><select className="w-full p-3 border dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:border-blue-500" value={form.type || 'pharmacy'} onChange={e => setForm({...form, type: e.target.value as any})} disabled={isSubmittingFacility}><option value="pharmacy">{lang === 'ar' ? 'صيدلية' : 'Pharmacy'}</option><option value="clinic">{lang === 'ar' ? 'عيادة طبية' : 'Clinic'}</option><option value="dental_clinic">{lang === 'ar' ? 'عيادة أسنان' : 'Dental Clinic'}</option></select></div>)}
                    {user.role === 'admin' && (<div><label className="block text-sm font-bold mb-1 dark:text-slate-300">المالك</label><select className="w-full p-3 border dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:border-blue-500" value={form.doctor_id || 0} onChange={e => setForm({...form, doctor_id: parseInt(e.target.value)})} disabled={isSubmittingFacility}><option value="0">اختر...</option>{(users || []).filter(u => u.role !== 'admin' && u.role !== 'patient').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>)}
                    {(form.type === 'clinic' || form.type === 'dental_clinic') && (<div><label className="block text-sm font-bold mb-1 dark:text-slate-300">التخصص</label><select className="w-full p-3 border dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:border-blue-500" value={form.specialty || ''} onChange={e => setForm({...form, specialty: e.target.value})} disabled={isSubmittingFacility}><option value="">اختر...</option>{SAFE_SPECIALTIES.map((s: string) => <option key={s} value={s}>{s}</option>)}</select></div>)}
                    {form.type === 'pharmacy' && (<div><label className="block text-sm font-bold mb-1 dark:text-slate-300">اسم الصيدلي</label><input className="w-full p-3 border dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:border-blue-500" value={form.pharmacist_name || ''} onChange={e => setForm({...form, pharmacist_name: e.target.value})} disabled={isSubmittingFacility} /></div>)}
                    <div><label className="block text-sm font-bold mb-1 dark:text-slate-300">العنوان</label><input required className="w-full p-3 border dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:border-blue-500" value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} disabled={isSubmittingFacility} /></div>
                    <div><label className="block text-sm font-bold mb-1 dark:text-slate-300">الهاتف</label><input required className="w-full p-3 border dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:border-blue-500 text-left" dir="ltr" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} disabled={isSubmittingFacility} /></div>
                    <div><label className="block text-sm font-bold mb-1 dark:text-slate-300">رقم الواتساب</label><input className="w-full p-3 border dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:border-blue-500 text-left" dir="ltr" placeholder="مثال: +9639..." value={form.whatsapp_phone || ''} onChange={e => setForm({...form, whatsapp_phone: e.target.value})} disabled={isSubmittingFacility} /></div>
                  </div>

                  <div className="mt-6 border-t dark:border-slate-800 pt-4">
                    <h4 className="font-bold mb-2 text-slate-800 dark:text-slate-200">تحديد الموقع</h4>
                    <div className="h-[300px] w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 z-10 relative">
                      <MapContainer center={[form.latitude || 35.25, form.longitude || 36.7]} zoom={13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <MapClickHandler lat={form.latitude || 35.25} lng={form.longitude || 36.7} onChange={(lat: number, lng: number) => setForm({...form, latitude: lat, longitude: lng})} />
                      </MapContainer>
                    </div>
                  </div>

                  <div className="mt-6 border-t dark:border-slate-800 pt-4">
                    <h4 className="font-bold mb-4 text-slate-800 dark:text-slate-200">أوقات الدوام الأسبوعية</h4>
                    <div className="space-y-3">
                      {(lang === 'en' ? SAFE_DAYS_EN : SAFE_DAYS_AR).map((day: string, index: number) => {
                        const currentHours = form?.working_hours?.[index.toString()] || { isOpen: false, start: '08:00', end: '22:00' };
                        return (
                          <div key={index} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                            <label className="flex items-center gap-2 w-32 cursor-pointer">
                              <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={currentHours.isOpen} onChange={e => setForm({...form, working_hours: {...form.working_hours, [index.toString()]: {...currentHours, isOpen: e.target.checked}}})} disabled={isSubmittingFacility} />
                              <span className="font-bold text-sm dark:text-slate-200">{day}</span>
                            </label>
                            {currentHours.isOpen ? (
                              <div className="flex items-center gap-2 flex-1">
                                <input type="time" className="p-2 border dark:border-slate-600 dark:bg-slate-900 rounded-lg outline-none text-sm w-full dark:[color-scheme:dark]" value={currentHours.start} onChange={e => setForm({...form, working_hours: {...form.working_hours, [index.toString()]: {...currentHours, start: e.target.value}}})} disabled={isSubmittingFacility} />
                                <span className="text-slate-400">-</span>
                                <input type="time" className="p-2 border dark:border-slate-600 dark:bg-slate-900 rounded-lg outline-none text-sm w-full dark:[color-scheme:dark]" value={currentHours.end} onChange={e => setForm({...form, working_hours: {...form.working_hours, [index.toString()]: {...currentHours, end: e.target.value}}})} disabled={isSubmittingFacility} />
                              </div>
                            ) : (<div className="flex-1 text-slate-400 text-sm">مغلق</div>)}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                </form>
              </div>
              <div className="p-6 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <button type="submit" form="facilityForm" disabled={uploadingImage || isSubmittingFacility} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmittingFacility ? <span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span> : null} حفظ البيانات
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PatientRecordModal isOpen={patientRecordModal.isOpen} onClose={() => setPatientRecordModal({...patientRecordModal, isOpen: false})} patientId={patientRecordModal.patientId} appointmentId={patientRecordModal.appointmentId} patientName={patientRecordModal.patientName} lang={lang} />
      
      <AnimatePresence>
        {showWalletModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold dark:text-white">{walletActionType === 'withdrawal' ? (lang === 'ar' ? 'طلب سحب كاش' : 'Withdrawal') : (lang === 'ar' ? 'شحن المحفظة' : 'Deposit')}</h3>
                <button type="button" onClick={() => setShowWalletModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={20}/></button>
              </div>
              <form onSubmit={submitWalletRequest}>
                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 text-center">{lang === 'ar' ? 'أدخل المبلغ بـ (ل.س جديدة)' : 'Amount in (New L.S)'}</label>
                  <input type="number" min="1" step="0.01" required className="w-full px-4 py-4 border-2 border-blue-100 dark:border-blue-900/50 dark:bg-slate-800 rounded-2xl outline-none text-center text-3xl font-extrabold text-blue-600 dark:text-blue-400 focus:border-blue-500 transition-colors" placeholder="0" value={walletAmount} onChange={e => setWalletAmount(e.target.value)} disabled={isSubmittingWalletRequest} />
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-sm relative">
              <button onClick={() => setAdminWalletModal({isOpen: false, userId: null})} className="absolute top-4 left-4 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={20}/></button>
              <h3 className="text-xl font-bold mb-6 text-center dark:text-white">{lang === 'ar' ? 'تعديل رصيد المستخدم' : 'Manage User Balance'}</h3>
              
              <form onSubmit={submitAdminWallet}>
                <div className="flex gap-2 mb-6">
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer font-bold text-sm transition-colors ${adminWalletAction === 'deposit' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <input type="radio" className="hidden" checked={adminWalletAction === 'deposit'} onChange={() => setAdminWalletAction('deposit')} disabled={isSubmittingAdminWallet} />
                    <Plus size={16} /> {lang === 'ar' ? 'إيداع' : 'Deposit'}
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer font-bold text-sm transition-colors ${adminWalletAction === 'withdrawal' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <input type="radio" className="hidden" checked={adminWalletAction === 'withdrawal'} onChange={() => setAdminWalletAction('withdrawal')} disabled={isSubmittingAdminWallet} />
                    <Minus size={16} /> {lang === 'ar' ? 'سحب' : 'Withdraw'}
                  </label>
                </div>

                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 text-center">{lang === 'ar' ? 'المبلغ بـ (ل.س جديدة)' : 'Amount in New L.S'}</label>
                <input type="number" min="1" step="0.01" required className="w-full px-4 py-4 border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-2xl outline-none focus:border-blue-500 mb-6 text-center text-3xl font-extrabold text-slate-800 dark:text-white transition-colors" placeholder="0" value={adminWalletAmount} onChange={e => setAdminWalletAmount(e.target.value)} disabled={isSubmittingAdminWallet} />
                
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
        {showUserModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold dark:text-white">{editingUser ? (lang === 'ar' ? 'تعديل بيانات المستخدم' : 'Edit User') : (lang === 'ar' ? 'إضافة مستخدم جديد' : 'Add User')}</h3>
                <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={20}/></button>
              </div>
              
              <form onSubmit={handleSaveUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1 dark:text-slate-300">{lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}</label>
                    <input required className="w-full px-4 py-3 border dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} disabled={isSubmittingUser} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1 dark:text-slate-300">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
                    <input required type="email" className="w-full px-4 py-3 border dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-left" dir="ltr" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} disabled={isSubmittingUser} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1 dark:text-slate-300">{lang === 'ar' ? 'كلمة المرور' : 'Password'} {editingUser && <span className="text-xs text-slate-400">({lang === 'ar' ? 'اتركه فارغاً لعدم التغيير' : 'Leave blank to keep'})</span>}</label>
                    <input type={editingUser ? "password" : "text"} required={!editingUser} className="w-full px-4 py-3 border dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-left" dir="ltr" placeholder={editingUser ? "***" : ""} value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} disabled={isSubmittingUser} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1 dark:text-slate-300">{lang === 'ar' ? 'رقم الهاتف' : 'Phone'}</label>
                    <input className="w-full px-4 py-3 border dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-left" dir="ltr" value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})} disabled={isSubmittingUser} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1 dark:text-slate-300">{lang === 'ar' ? 'نوع الحساب (الصلاحية)' : 'Role'}</label>
                    <select className="w-full px-4 py-3 border dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as any})} disabled={isSubmittingUser}>
                      <option value="patient">{lang === 'ar' ? 'مريض / مستخدم عادي' : 'Patient'}</option>
                      <option value="pharmacist">{lang === 'ar' ? 'صيدلي' : 'Pharmacist'}</option>
                      <option value="doctor">{lang === 'ar' ? 'طبيب بشري' : 'Doctor'}</option>
                      <option value="dentist">{lang === 'ar' ? 'طبيب أسنان' : 'Dentist'}</option>
                      <option value="customer_service">{lang === 'ar' ? 'موظف خدمة عملاء' : 'Customer Service'}</option>
                      {isSuperAdmin && <option value="admin">{lang === 'ar' ? 'مدير (Admin)' : 'Admin'}</option>}
                    </select>
                  </div>
                  
                  {isSuperAdmin && (
                    <div>
                      <label className="block text-sm font-bold mb-1 dark:text-slate-300">{lang === 'ar' ? 'رصيد المحفظة (ل.س جديدة)' : 'Wallet Balance (New L.S)'}</label>
                      <input 
                        type="number" step="0.01" 
                        className="w-full px-4 py-3 border dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" 
                        value={userForm.wallet_balance ? (Number(userForm.wallet_balance) / 100) : ''} 
                        onChange={e => setUserForm({...userForm, wallet_balance: Number(e.target.value) * 100})} 
                        disabled={isSubmittingUser}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1 dark:text-slate-300">{lang === 'ar' ? 'ملاحظات / نبذة (تظهر في الملف الشخصي للطبيب)' : 'Notes / Bio'}</label>
                  <textarea rows={3} className="w-full px-4 py-3 border dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={userForm.notes} onChange={e => setUserForm({...userForm, notes: e.target.value})} disabled={isSubmittingUser}></textarea>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl mt-2">
                  <input type="checkbox" id="isActiveCheck" className="w-5 h-5 accent-emerald-500 cursor-pointer" checked={userForm.is_active} onChange={e => setUserForm({...userForm, is_active: e.target.checked})} disabled={isSubmittingUser} />
                  <label htmlFor="isActiveCheck" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    {lang === 'ar' ? 'الحساب مفعل (يمكنه الدخول واستخدام النظام)' : 'Account is Active'}
                  </label>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 py-4 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" disabled={isSubmittingUser}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
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