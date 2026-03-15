import React, { useState, useEffect, useRef } from 'react';
import { api, uploadImageToImgBB } from '../api-client';
import { toast } from 'react-hot-toast';
import { HeartPulse, FileText, Pill, Stethoscope, FilePlus, ExternalLink, Calendar, Syringe, Beaker, QrCode, X, ImagePlus, Trash2, Loader2, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';


interface PatientMedicalRecordProps {
  user: any;
  lang: 'ar' | 'en';
}

export const PatientMedicalRecord = ({ user, lang }: PatientMedicalRecordProps) => {
  const [activeTab, setActiveTab] = useState<'ehr' | 'prescriptions'>('ehr');
  const [loading, setLoading] = useState(true);
  const [ehr, setEhr] = useState<any>({});
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [showQrModal, setShowQrModal] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // 🟢 X-Ray & Prescription image upload
  const [xrayUrls, setXrayUrls] = useState<string[]>([]);
  const [uploadingXray, setUploadingXray] = useState(false);
  const [savingXrays, setSavingXrays] = useState(false);
  const xrayInputRef = useRef<HTMLInputElement>(null);

  const handleXrayUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingXray(true);
    try {
      const url = await uploadImageToImgBB(file);
      const updated = [...xrayUrls, url];
      setXrayUrls(updated);
      // Auto-save to database immediately
      await api.patch(`/api/medical-records/${user.id}`, { xray_urls: updated });
      toast.success(lang === 'ar' ? 'تم رفع الصورة وحفظها بنجاح ✓' : 'Image uploaded and saved ✓');
    } catch (err: any) {
      toast.error(lang === 'ar' ? 'فشل رفع الصورة' : 'Upload failed');
    } finally {
      setUploadingXray(false);
      if (xrayInputRef.current) xrayInputRef.current.value = '';
    }
  };

  const removeXrayUrl = async (idx: number) => {
    const updated = xrayUrls.filter((_, i) => i !== idx);
    setXrayUrls(updated);
    try {
      await api.patch(`/api/medical-records/${user.id}`, { xray_urls: updated });
      toast.success(lang === 'ar' ? 'تم الحذف' : 'Removed');
    } catch { }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ehrData, pxData] = await Promise.all([
        api.get(`/api/medical-records/${user.id}?t=${Date.now()}`),
        api.get(`/api/prescriptions/patient/${user.id}`)
      ]);
      setEhr(ehrData || {});
      setPrescriptions(Array.isArray(pxData) ? pxData : []);
      // Load saved xray URLs
      const savedXrays = ehrData?.xray_urls;
      if (savedXrays) {
        setXrayUrls(typeof savedXrays === 'string' ? JSON.parse(savedXrays) : savedXrays);
      }
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل جلب الملف الطبي' : 'Failed to fetch medical records');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dob: string, fallbackAge: number) => {
    if (!dob) return fallbackAge ? `${fallbackAge} ${lang === 'ar' ? 'سنة' : 'Yrs'}` : (lang === 'ar' ? 'غير محدد' : 'N/A');
    const bDate = new Date(dob);
    const diff = Date.now() - bDate.getTime();
    const ageDate = new Date(diff); 
    const years = Math.abs(ageDate.getUTCFullYear() - 1970);
    if (years === 0) {
      const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
      return months === 0 ? (lang === 'ar' ? 'حديث الولادة' : 'Newborn') : `${months} ${lang === 'ar' ? 'شهر' : 'Months'}`;
    }
    return `${years} ${lang === 'ar' ? 'سنة' : 'Yrs'}`;
  };

  if (loading) {
    return <div className="flex justify-center py-20"><span className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></span></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* 🟢 Personal Info Header */}
      <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -ml-20 -mb-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 bg-white/10 rounded-2xl border-2 border-white/20 flex items-center justify-center text-4xl shadow-inner shrink-0">
            {user.gender === 'female' ? '👩' : '👨'}
          </div>
          <div className="text-center md:text-start flex-1">
            <h2 className="text-3xl font-black mb-2">{user.name}</h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-blue-100 font-medium">
              <span className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">{lang === 'ar' ? 'العمر:' : 'Age:'} {calculateAge(ehr.dob, ehr.age)}</span>
              <span className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 capitalize flex items-center gap-1"><HeartPulse size={16}/> {ehr.blood_type || (lang === 'ar' ? 'فصيلة الدم غير محددة' : 'Blood Type N/A')}</span>
              <span className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">{user.phone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🟢 Tabs */}
      <div className="flex bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-slate-800">
        <button onClick={() => setActiveTab('ehr')} className={`flex-1 py-3 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'ehr' ? 'bg-indigo-600 shadow-md text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
          <FileText size={18} /> {lang === 'ar' ? 'سجلي الطبي' : 'Medical Record'}
        </button>
        <button onClick={() => setActiveTab('prescriptions')} className={`flex-1 py-3 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'prescriptions' ? 'bg-indigo-600 shadow-md text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
          <Pill size={18} /> {lang === 'ar' ? 'وصفاتي السابقة' : 'Prescriptions'}
        </button>
      </div>

      {/* 🟢 Tab Content: EHR */}
      {activeTab === 'ehr' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {!ehr.id ? (
             <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center shadow-sm border border-slate-200 dark:border-slate-800">
              <FilePlus size={64} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'لا يوجد سجل طبي' : 'No Medical Record'}</h3>
              <p className="text-slate-500">{lang === 'ar' ? 'سيقوم طبيبك بإنشاء سجلك الطبي عند أول زيارة لك.' : 'Your doctor will create your medical record on your first visit.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Vital Information */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2 dark:text-white"><Stethoscope className="text-blue-500"/> {lang === 'ar' ? 'المعلومات الحيوية' : 'Vital Info'}</h3>
                <div className="space-y-4">
                  <div className="flex justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                    <span className="text-red-800 dark:text-red-400 font-bold text-sm">{lang === 'ar' ? 'الحساسية الدوائية' : 'Allergies'}</span>
                    <span className="font-medium text-red-900 dark:text-red-200">{ehr.allergies || (lang === 'ar' ? 'لا يوجد' : 'None')}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-900/30">
                    <span className="text-orange-800 dark:text-orange-400 font-bold text-sm">{lang === 'ar' ? 'الأمراض المزمنة' : 'Chronic Diseases'}</span>
                    <span className="font-medium text-orange-900 dark:text-orange-200">{ehr.chronic_diseases || (lang === 'ar' ? 'لا يوجد' : 'None')}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400 font-bold text-sm">{lang === 'ar' ? 'العمليات الجراحية' : 'Surgeries'}</span>
                    <span className="font-medium dark:text-slate-300">{ehr.past_surgeries || (lang === 'ar' ? 'لا يوجد' : 'None')}</span>
                  </div>
                   <div className="flex justify-between p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                    <span className="text-indigo-800 dark:text-indigo-400 font-bold text-sm">{lang === 'ar' ? 'الأدوية الحالية' : 'Regular Meds'}</span>
                    <span className="font-medium text-indigo-900 dark:text-indigo-200">{ehr.regular_medications || (lang === 'ar' ? 'لا يوجد' : 'None')}</span>
                  </div>
                </div>
              </div>

              {/* Lifestyle & History */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2 dark:text-white"><HeartPulse className="text-emerald-500"/> {lang === 'ar' ? 'نمط الحياة وتاريخ العائلة' : 'Lifestyle & Family'}</h3>
                <div className="space-y-4">
                  <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400 font-bold text-sm">{lang === 'ar' ? 'التدخين' : 'Smoking'}</span>
                    <span className="font-medium dark:text-slate-300">{lang === 'ar' ? (ehr.smoking_status === 'current_smoker' ? 'مدخن' : ehr.smoking_status === 'former_smoker' ? 'مدخن سابق' : 'غير مدخن') : ehr.smoking_status}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400 font-bold text-sm">{lang === 'ar' ? 'الكحوليات' : 'Alcohol'}</span>
                    <span className="font-medium dark:text-slate-300">{lang === 'ar' ? (ehr.alcohol_status === 'frequent' ? 'كثيراً' : ehr.alcohol_status === 'occasional' ? 'أحياناً' : 'الامتناع التام') : ehr.alcohol_status}</span>
                  </div>
                  <div className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400 font-bold text-sm">{lang === 'ar' ? 'الأمراض الوراثية / العائلية' : 'Family History'}</span>
                    <p className="font-medium text-sm dark:text-slate-300">{ehr.family_history || (lang === 'ar' ? 'غير مسجل' : 'Not recorded')}</p>
                  </div>
                </div>
              </div>

              {/* 🟢 Attachments from Doctor (Read-only) */}
              {ehr.attachments && (typeof ehr.attachments === 'string' ? JSON.parse(ehr.attachments) : ehr.attachments).length > 0 && (
                <div className="md:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="font-bold text-lg flex items-center gap-2 dark:text-white mb-4"><FileText className="text-indigo-500"/> {lang === 'ar' ? 'مرفقات الطبيب' : 'Doctor Attachments'}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {(typeof ehr.attachments === 'string' ? JSON.parse(ehr.attachments) : ehr.attachments).map((url: string, idx: number) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer" className="relative group block aspect-square rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-colors bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        {url.match(/\.(jpeg|jpg|gif|png)$/i) ? <img src={url} alt={`Doc ${idx}`} className="w-full h-full object-cover" /> : <FileText size={32} className="text-slate-400" />}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><ExternalLink className="text-white" size={24} /></div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* 🟢 Patient X-Ray Upload Section */}
              <div className="md:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2 dark:text-white">
                    <ImagePlus className="text-violet-500"/> {lang === 'ar' ? 'صور الأشعة والوصفات (تحميلك أنت)' : 'My X-Rays & Prescriptions'}
                  </h3>
                  <label className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                    uploadingXray ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-200 dark:shadow-none'
                  }`}>
                    {uploadingXray ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                    {uploadingXray ? (lang === 'ar' ? 'جاري الرفع...' : 'Uploading...') : (lang === 'ar' ? 'رفع صورة' : 'Upload Image')}
                    <input ref={xrayInputRef} type="file" accept="image/*" className="hidden" disabled={uploadingXray} onChange={handleXrayUpload} />
                  </label>
                </div>

                {xrayUrls.length === 0 && !uploadingXray ? (
                  <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 cursor-pointer" onClick={() => xrayInputRef.current?.click()}>
                    <ImagePlus size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{lang === 'ar' ? 'اضغط لرفع صورة أشعة أو وصفة طبية' : 'Click to upload an X-ray or prescription image'}</p>
                    <p className="text-xs text-slate-400 mt-1">{lang === 'ar' ? 'PNG, JPG, WEBP — محفوظة في سجلك الطبي' : 'PNG, JPG, WEBP — saved to your medical record'}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {xrayUrls.map((url, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-violet-200 dark:border-violet-800 bg-slate-100 dark:bg-slate-800">
                        <img src={url} alt={`X-ray ${idx + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <a href={url} target="_blank" rel="noreferrer" className="p-2 bg-white/20 hover:bg-white/30 rounded-full"><ExternalLink size={18} className="text-white" /></a>
                          <button onClick={() => removeXrayUrl(idx)} className="p-2 bg-red-500/80 hover:bg-red-600 rounded-full"><Trash2 size={18} className="text-white" /></button>
                        </div>
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md font-bold">{idx + 1}</div>
                      </div>
                    ))}
                    {/* Loading spinner for new upload */}
                    {uploadingXray && (
                      <div className="aspect-square rounded-2xl border-2 border-dashed border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20 flex flex-col items-center justify-center gap-2">
                        <Loader2 size={28} className="text-violet-500 animate-spin" />
                        <span className="text-xs text-violet-600 dark:text-violet-400 font-bold">{lang === 'ar' ? 'جاري الرفع...' : 'Uploading...'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* 🟢 Tab Content: Prescriptions */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {prescriptions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center shadow-sm border border-slate-200 dark:border-slate-800">
              <Pill size={64} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'لا يوجد وصفات سابقة' : 'No Prescriptions'}</h3>
              <p className="text-slate-500">{lang === 'ar' ? 'لم يتم إصدار أي وصفة طبية لك بعد.' : 'No prescriptions have been issued to you yet.'}</p>
            </div>
          ) : (
            prescriptions.map((px) => {
              const meds = typeof px.medicines === 'string' ? JSON.parse(px.medicines) : px.medicines;
              return (
                <div key={px.id} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b dark:border-slate-800 pb-4">
                    <div>
                      <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Stethoscope size={20} className="text-blue-500"/> {px.doctor_name}</h3>
                      <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">{px.doctor_specialty}</p>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-2 flex items-center gap-2"><Calendar size={14}/> {new Date(px.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</p>
                    </div>
                    <button onClick={() => setShowQrModal(px)} className="shrink-0 w-full md:w-auto px-6 py-3 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 border border-indigo-200 dark:border-indigo-800">
                      <QrCode size={20}/> {lang === 'ar' ? 'عرض QR للصيدلي' : 'Show QR to Pharmacist'}
                    </button>
                  </div>

                  <div className="space-y-4">
                    {px.diagnosis && (
                      <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                        <span className="text-xs font-bold text-blue-800 dark:text-blue-400 block mb-1">{lang === 'ar' ? 'التشخيص المدون' : 'Diagnosis'}</span>
                        <p className="font-medium text-sm dark:text-slate-300">{px.diagnosis}</p>
                      </div>
                    )}
                    
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">{lang === 'ar' ? 'الأدوية الموصوفة' : 'Prescribed Medicines'}</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Array.isArray(meds) && meds.map((med: any, idx: number) => (
                          <div key={idx} className="flex gap-3 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <Pill size={18}/>
                            </div>
                            <div>
                              <p className="font-bold text-sm text-slate-800 dark:text-slate-200" dir="ltr">{med.name}</p>
                              <div className="flex gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {med.dosage && <span>{med.dosage}</span>}
                                {med.frequency && <span>• {med.frequency}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 🟢 QR Modal for Prescriptions */}
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl w-full max-w-sm relative text-center">
              <button onClick={() => setShowQrModal(null)} className="absolute top-4 left-4 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20}/></button>
              
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <QrCode size={32} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">{lang === 'ar' ? 'رمز الوصفة الذكية' : 'Smart Prescription QR'}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium">
                {lang === 'ar' ? 'أعط هاتفك للصيدلي ليقوم بمسح هذا الرمز وسحب الأدوية لك فوراً وبدون كتابة.' : 'Show this QR to the pharmacist to instantly dispense your medications.'}
              </p>
              
              <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 inline-block shadow-inner mx-auto">
                <QRCodeSVG 
                  value={JSON.stringify({
                    id: showQrModal.id,
                    pid: user.name,
                    meds: (typeof showQrModal.medicines === 'string' ? JSON.parse(showQrModal.medicines) : showQrModal.medicines).map((m: any) => m.name)
                  })} 
                  size={200} 
                  level="L" 
                  includeMargin={false} 
                />
              </div>

              {showQrModal.short_code && (
                <div className="mt-8">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{lang === 'ar' ? 'أو استخدم الكود اليدوي' : 'Or use manual code'}</p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="bg-slate-100 dark:bg-slate-800 px-6 py-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                      <span className="text-2xl font-black tracking-[0.2em] text-indigo-600 dark:text-indigo-400 font-mono">{showQrModal.short_code}</span>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(showQrModal.short_code);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                        toast.success(lang === 'ar' ? 'تم نسخ الكود' : 'Code copied');
                      }}
                      className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                    >
                      {copied ? <Check size={20} /> : <Copy size={20} />}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
};
