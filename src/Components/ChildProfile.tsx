import React, { useState, useEffect } from 'react';
import { ArrowRight, User, Activity, FileText, Calendar, ChevronLeft, HeartPulse, Stethoscope, Clock } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'records' | 'appointments'>('records');
  const [loading, setLoading] = useState(true);
  const [childDetails, setChildDetails] = useState<any>(null);

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
            {details.name[0]}
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
      <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 flex gap-2">
        <button 
          onClick={() => setActiveTab('records')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'records' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <HeartPulse size={20} />
          {lang === 'ar' ? 'السجل الطبي' : 'Medical Record'}
        </button>
        <button 
          onClick={() => setActiveTab('appointments')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'appointments' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <Clock size={20} />
          {lang === 'ar' ? 'المواعيد' : 'Appointments'}
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 md:p-12 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'records' ? (
            <motion.div 
              key="records"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col items-center justify-center h-full text-center space-y-4"
            >
              <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-full flex items-center justify-center">
                <Stethoscope size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {lang === 'ar' ? 'السجل الطبي للطفل' : "Child's Medical Records"}
              </h3>
              <p className="text-slate-500 max-w-md">
                {lang === 'ar' ? 'هذا القسم سيحتوي على التاريخ الطبي والتحاليل والوصفات الخاصة بالطفل.' : 'This section will contain the medical history, lab results, and prescriptions for the child.'}
              </p>
              <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl text-sm font-bold border border-slate-100 dark:border-slate-700 mt-4">
                {lang === 'ar' ? 'هذه الميزة تحت التطوير حالياً' : 'This feature is currently under development'}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="appointments"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center justify-center h-full text-center space-y-4"
            >
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center">
                <Calendar size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {lang === 'ar' ? 'مواعيد الطفل القادمة' : "Upcoming Child Appointments"}
              </h3>
              <p className="text-slate-500 max-w-md">
                {lang === 'ar' ? 'هنا ستظهر المواعيد التي حجزها الوالد لطفله.' : 'Appointments booked by the parent for this child will appear here.'}
              </p>
              <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl text-sm font-bold border border-slate-100 dark:border-slate-700 mt-4">
                {lang === 'ar' ? 'لا توجد مواعيد حالية' : 'No current appointments'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
