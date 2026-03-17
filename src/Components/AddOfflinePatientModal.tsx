import React, { useState } from 'react';
import { X, UserPlus, Phone, User, Mail, Calendar, HeartPulse, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { api } from '../api-client';
import { PhoneContactInput } from './PhoneContactInput';

interface AddOfflinePatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ar' | 'en';
  onSuccess: () => void;
}

export const AddOfflinePatientModal: React.FC<AddOfflinePatientModalProps> = ({ 
  isOpen, 
  onClose, 
  lang, 
  onSuccess 
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: { phone: '', whatsapp: '', hasSeparateWhatsapp: false },
    gender: 'male',
    dob: '',
    blood_type: '',
    chronic_diseases: '',
    allergies: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone.phone) {
      toast.error(lang === 'ar' ? 'يرجى إدخال الاسم ورقم الهاتف' : 'Please enter name and phone');
      return;
    }

    setLoading(true);
    try {
      // Send the phone string to the backend as expected by the new route
      await api.post('/api/doctor/offline-patient', {
        ...formData,
        phone: formData.phone.phone
      });
      toast.success(lang === 'ar' ? 'تمت إضافة المريض بنجاح' : 'Patient added successfully');
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        name: '',
        phone: { phone: '', whatsapp: '', hasSeparateWhatsapp: false },
        gender: 'male',
        dob: '',
        blood_type: '',
        chronic_diseases: '',
        allergies: ''
      });
    } catch (err: any) {
      const msg = err.response?.data?.error || (lang === 'ar' ? 'فشل إضافة المريض' : 'Failed to add patient');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[120]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg">
              <UserPlus size={24} />
            </div>
            <h2 className="text-xl font-bold dark:text-white">
              {lang === 'ar' ? 'إضافة مريض جديد (يدوي)' : 'Add New Patient (Manual)'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={20} className="dark:text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl flex items-start gap-3">
            <AlertCircle className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" size={18} />
            <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed font-bold">
              {lang === 'ar' 
                ? 'استخدم هذا النموذج لتسجيل المرضى الذين ليس لديهم تطبيق أو حساب. سيتم إنشاء ملف طبي أساسي لهم وربطه بعيادتك مباشرة.' 
                : 'Use this form to register patients without an app account. A basic medical profile will be created and linked to your clinic.'}
            </p>
          </div>

          <form id="offlinePatientForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'اسم المريض الثلاثي' : 'Full Name'}</label>
              <div className="relative">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rtl:right-4 ltr:left-4 ltr:right-auto" size={18} />
                <input 
                  required
                  type="text"
                  className="w-full pr-12 pl-4 ltr:pl-12 ltr:pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                  placeholder={lang === 'ar' ? 'مثال: محمد أحمد العلي' : 'e.g. John Doe'}
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'رقم الهاتف (للتواصل)' : 'Phone Number'}</label>
              <PhoneContactInput 
                value={formData.phone}
                onChange={(val) => setFormData({...formData, phone: val})}
                lang={lang}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'الجنس' : 'Gender'}</label>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, gender: 'male'})}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 ${formData.gender === 'male' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 dark:border-slate-800 text-slate-500'}`}
                >
                  {lang === 'ar' ? 'ذكر' : 'Male'}
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, gender: 'female'})}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 ${formData.gender === 'female' ? 'border-pink-500 bg-pink-50 text-pink-500' : 'border-slate-100 dark:border-slate-800 text-slate-500'}`}
                >
                  {lang === 'ar' ? 'أنثى' : 'Female'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'تاريخ الميلاد' : 'Date of Birth'}</label>
              <input 
                type="date"
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.dob}
                onChange={(e) => setFormData({...formData, dob: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'زمرة الدم' : 'Blood Type'}</label>
              <select 
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.blood_type}
                onChange={(e) => setFormData({...formData, blood_type: e.target.value})}
              >
                <option value="">{lang === 'ar' ? 'غير معروف' : 'Unknown'}</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="md:col-span-2 mt-4 pt-4 border-t dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <HeartPulse size={18} className="text-red-500" />
                {lang === 'ar' ? 'المعلومات الطبية الأساسية' : 'Basic Medical Info'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">{lang === 'ar' ? 'الأمراض المزمنة (إن وجدت)' : 'Chronic Diseases (if any)'}</label>
                  <textarea 
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    rows={2}
                    placeholder={lang === 'ar' ? 'مثال: سكري، ضغط، ربو...' : 'e.g. Diabetes, Hypertension...'}
                    value={formData.chronic_diseases}
                    onChange={(e) => setFormData({...formData, chronic_diseases: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">{lang === 'ar' ? 'الحساسية (تجاه الأدوية أو الأغذية)' : 'Allergies'}</label>
                  <textarea 
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm"
                    rows={2}
                    placeholder={lang === 'ar' ? 'مثال: بنسلين، لاكتوز...' : 'e.g. Penicillin, Lactose...'}
                    value={formData.allergies}
                    onChange={(e) => setFormData({...formData, allergies: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-4 px-6 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-100 transition-colors border border-slate-200 dark:border-slate-800"
            disabled={loading}
          >
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          <button 
            type="submit"
            form="offlinePatientForm"
            className="flex-[2] py-4 px-6 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? <span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span> : null}
            {lang === 'ar' ? 'إضافة المريض وحفظ' : 'Add Patient & Save'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
