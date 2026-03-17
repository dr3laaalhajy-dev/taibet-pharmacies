import React, { useState, useEffect } from 'react';
import { ArrowRight, User, Activity, FileText, Calendar, ChevronLeft, HeartPulse, Stethoscope, Clock, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../api-client';
import toast from 'react-hot-toast';

interface ChildProfileProps {
  child: any;
  onBack: () => void;
  lang: 'ar' | 'en';
  t: any;
}

export const ChildProfile: React.FC<ChildProfileProps> = ({ child, onBack, lang, t }) => {
  const [activeTab, setActiveTab] = useState<'records' | 'appointments' | 'prescriptions'>('records');
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [childDetails, setChildDetails] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  useEffect(() => {
    const fetchChildDetails = async () => {
      try {
        setLoading(true);
        console.log(`[DEBUG] Fetching details for child ID: ${child.id}`);
        const data = await api.get(`/api/users/child/${child.id}`);
        console.log("✅ CHILD DETAILS RECEIVED:", data);
        setChildDetails(data);
      } catch (err: any) {
        console.error("❌ FAILED TO FETCH CHILD DETAILS:", err);
        toast.error(lang === 'ar' ? 'فشل تحميل بيانات الطفل' : 'Failed to load child details');
      } finally {
        setLoading(false);
      }
    };

    fetchChildDetails();
  }, [child.id]);

  useEffect(() => {
    if (activeTab === 'appointments') {
      fetchAppointments();
    } else if (activeTab === 'prescriptions') {
      fetchPrescriptions();
    }
  }, [activeTab, child.id]);

  const fetchAppointments = async () => {
    try {
      setLoadingData(true);
      const data = await api.get(`/api/appointments/patient/${child.id}`);
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل تحميل المواعيد' : 'Failed to load appointments');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchPrescriptions = async () => {
    try {
      setLoadingData(true);
      const data = await api.get(`/api/prescriptions/patient/${child.id}`);
      setPrescriptions(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل تحميل الوصفات الطبية' : 'Failed to load prescriptions');
    } finally {
      setLoadingData(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-slate-500 animate-pulse">
          {lang === 'ar' ? 'جاري تحميل ملف الطفل...' : 'Loading child profile...'}
        </p>
      </div>
    );
  }

  const details = childDetails || child;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold transition-colors group w-fit"
        >
          <ChevronLeft className={`transition-transform group-hover:-translate-x-1 ${lang === 'ar' ? 'rotate-180 group-hover:translate-x-1' : ''}`} />
          {lang === 'ar' ? 'العودة لقائمة العائلة' : 'Back to Family list'}
        </button>

        <div className="flex items-center gap-3">
           <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl text-xs font-black border border-blue-100 dark:border-blue-800">
             {lang === 'ar' ? 'حساب طفل مُدار' : 'Managed Child Account'}
           </div>
        </div>
      </div>

      {/* Child Hero Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/5 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[2rem] flex items-center justify-center text-4xl md:text-5xl font-black shadow-lg shadow-blue-200 dark:shadow-none">
            {details.name?.[0] || 'U'}
          </div>
          
          <div className="text-center md:text-right rtl:md:text-left flex-1">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-3">
              {details.name}
            </h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <Calendar size={18} className="text-blue-500" />
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {details.age ? `${details.age} ${lang === 'ar' ? 'سنة' : 'Years'}` : (lang === 'ar' ? 'العمر غير محدد' : 'Age N/A')}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <User size={18} className="text-emerald-500" />
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {details.gender || (lang === 'ar' ? 'الجنس غير محدد' : 'Gender N/A')}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <FileText size={18} className="text-indigo-500" />
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  {details.email}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2">
        <button 
          onClick={() => setActiveTab('records')}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'records' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <HeartPulse size={20} className="hidden sm:block" />
          {lang === 'ar' ? 'السجل' : 'Medical'}
        </button>
        <button 
          onClick={() => setActiveTab('appointments')}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'appointments' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <Clock size={20} className="hidden sm:block" />
          {lang === 'ar' ? 'المواعيد' : 'Appts'}
        </button>
        <button 
          onClick={() => setActiveTab('prescriptions')}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'prescriptions' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <FileText size={20} className="hidden sm:block" />
          {lang === 'ar' ? 'الروشتات' : 'Scripts'}
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'records' && (
            <motion.div 
              key="records"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-4"
            >
              <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-full flex items-center justify-center">
                <Stethoscope size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {lang === 'ar' ? 'السجل الطبي للطفل' : "Child's Medical Records"}
              </h3>
              <p className="text-slate-500 max-w-md">
                {lang === 'ar' ? 'هذا القسم يهدف لعرض التاريخ الطبي الشامل والحساسية للطفل.' : "This section displays the child's comprehensive medical history and allergies."}
              </p>
              <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl text-sm font-bold border border-slate-100 dark:border-slate-700 mt-4">
                {lang === 'ar' ? 'قيد التطوير - سيتم تفعيل المزامنة قريباً' : 'Under development - sync coming soon'}
              </div>
            </motion.div>
          )}

          {activeTab === 'appointments' && (
            <motion.div 
              key="appointments"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-4"
            >
              {loadingData ? (
                <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="font-bold text-slate-400">{lang === 'ar' ? 'جاري جلب المواعيد...' : 'Fetching appointments...'}</p>
                </div>
              ) : appointments.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {appointments.map((apt) => (
                    <div key={apt.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-all">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                          <Stethoscope size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white">{apt.doctor_name}</h4>
                          <p className="text-xs text-slate-500 font-bold">{apt.doctor_specialty}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                             <Calendar size={12} />
                             <span className="font-mono">{new Date(apt.appointment_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-black shadow-sm text-slate-600 dark:text-slate-300">
                         {apt.facility_name}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                   <ShieldAlert size={48} className="text-slate-200" />
                   <p className="font-bold text-slate-400">{lang === 'ar' ? 'لا توجد مواعيد مسجلة للطفل' : 'No recorded appointments for this child'}</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'prescriptions' && (
            <motion.div 
              key="prescriptions"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-4"
            >
              {loadingData ? (
                <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="font-bold text-slate-400">{lang === 'ar' ? 'جاري جلب الروشتات...' : 'Fetching prescriptions...'}</p>
                </div>
              ) : prescriptions.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                   {prescriptions.map((px) => (
                    <div key={px.id} className="p-6 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 font-mono text-[10px] font-bold rounded-bl-xl border-l border-b border-indigo-100 dark:border-indigo-800">
                        {px.short_code}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center font-black">
                           {px.doctor_name?.[0]}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 dark:text-white">{px.doctor_name}</h4>
                          <p className="text-xs text-slate-500 font-bold">{px.doctor_specialty}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                           <Activity size={14} />
                           {px.diagnosis}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(typeof px.medicines === 'string' ? JSON.parse(px.medicines) : px.medicines).map((med: any, idx: number) => (
                            <div key={idx} className="p-3 bg-indigo-50/30 dark:bg-indigo-900/10 border border-indigo-100/30 dark:border-indigo-800/30 rounded-xl flex justify-between items-center">
                              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300" dir="ltr">{med.name}</span>
                              <span className="text-[10px] font-black bg-white dark:bg-indigo-900/50 px-2 py-1 rounded-md text-indigo-500">{med.dosage}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="pt-2 flex justify-between items-center text-[10px] text-slate-400 font-bold border-t border-slate-50 dark:border-slate-800">
                         <span>{new Date(px.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                         <span className="text-indigo-500">{lang === 'ar' ? 'روشتة رقمية' : 'Digital Prescription'}</span>
                      </div>
                    </div>
                   ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                   <FileText size={48} className="text-slate-200" />
                   <p className="font-bold text-slate-400">{lang === 'ar' ? 'لا توجد روشتات مسجلة للطفل' : 'No recorded prescriptions for this child'}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
