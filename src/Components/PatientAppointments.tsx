import React, { useState, useEffect } from 'react';
import { api } from '../api-client';
import { Calendar, Clock, MapPin, User, Stethoscope, ChevronRight, AlertCircle, CalendarClock, History, XCircle, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface Appointment {
  id: number;
  doctor_name: string;
  doctor_specialty: string;
  facility_name: string;
  appointment_date: string;
  status: string;
}

export const PatientAppointments = ({ lang }: { lang: 'ar' | 'en' }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await api.get('/api/appointments/me');
      setAppointments(data);
    } catch (err: any) {
      console.error("Failed to fetch appointments:", err);
      toast.error(lang === 'ar' ? 'فشل تحميل المواعيد' : 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcoming = appointments.filter(app => new Date(app.appointment_date) >= now && app.status !== 'cancelled' && app.status !== 'completed');
  const past = appointments.filter(app => new Date(app.appointment_date) < now || app.status === 'cancelled' || app.status === 'completed');

  const displayedAppointments = activeTab === 'upcoming' ? upcoming : past;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-slate-500 animate-pulse">{lang === 'ar' ? 'جاري تحميل المواعيد...' : 'Loading appointments...'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
            <Calendar size={28} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
              {lang === 'ar' ? 'مواعيدي' : 'My Appointments'}
            </h2>
            <p className="text-slate-500 text-sm font-medium">
              {lang === 'ar' ? 'إدارة وتنظيم مواعيدك الطبية' : 'Manage and organize your medical appointments'}
            </p>
          </div>
        </div>

        <button 
          onClick={fetchAppointments}
          className="p-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 font-bold text-sm"
        >
          <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
          {lang === 'ar' ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-[1.5rem] flex gap-2 w-fit mx-auto md:mx-0">
        <button 
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center gap-2 px-8 py-3 rounded-[1.2rem] font-bold text-sm transition-all ${activeTab === 'upcoming' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <CalendarClock size={18} />
          {lang === 'ar' ? 'المواعيد القادمة' : 'Upcoming'}
          {upcoming.length > 0 && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[10px]">{upcoming.length}</span>}
        </button>
        <button 
          onClick={() => setActiveTab('past')}
          className={`flex items-center gap-2 px-8 py-3 rounded-[1.2rem] font-bold text-sm transition-all ${activeTab === 'past' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <History size={18} />
          {lang === 'ar' ? 'المواعيد السابقة' : 'Past'}
        </button>
      </div>

      {/* List */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {displayedAppointments.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-slate-900 rounded-[2.5rem] p-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar size={40} className="text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">
                {lang === 'ar' ? 'لا توجد مواعيد هنا' : 'No appointments found'}
              </h3>
              <p className="text-slate-500 mt-2 max-w-xs mx-auto text-sm">
                {activeTab === 'upcoming' 
                  ? (lang === 'ar' ? 'لم تقم بحجز أي مواعيد قادمة بعد.' : "You haven't booked any upcoming appointments yet.")
                  : (lang === 'ar' ? 'سجلك التاريخي للمواعيد فارغ.' : "Your appointment history is currently empty.")
                }
              </p>
            </div>
          ) : (
            displayedAppointments.map((app) => (
              <div 
                key={app.id}
                className={`group relative bg-white dark:bg-slate-900 rounded-[2rem] p-6 border transition-all hover:shadow-2xl hover:shadow-blue-500/5 ${activeTab === 'upcoming' ? 'border-blue-100 dark:border-blue-900/30 hover:border-blue-300' : 'border-slate-100 dark:border-slate-800 opacity-80 grayscale-[0.3]'}`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner ${activeTab === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      {app.doctor_name[0]}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white text-lg group-hover:text-blue-600 transition-colors uppercase">
                        {app.doctor_name}
                      </h4>
                      <p className="text-xs font-bold text-blue-500 dark:text-blue-400 flex items-center gap-1">
                        <Stethoscope size={14} />
                        {app.doctor_specialty}
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    app.status === 'confirmed' ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' :
                    app.status === 'cancelled' ? 'bg-red-100 text-red-600 border border-red-200' :
                    'bg-amber-100 text-amber-600 border border-amber-200'
                  }`}>
                    {lang === 'ar' ? (app.status === 'pending' ? 'بانتظار التأكيد' : app.status === 'confirmed' ? 'مؤكد' : 'ملغي') : app.status}
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <Calendar size={18} className="text-slate-400" />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {new Date(app.appointment_date).toLocaleDateString(lang === 'ar' ? 'ar-SY' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <MapPin size={18} className="text-slate-400" />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">
                      {app.facility_name}
                    </span>
                  </div>
                </div>

                {activeTab === 'upcoming' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => toast.success(lang === 'ar' ? 'تم طلب إلغاء الموعد' : 'Cancellation requested')}
                      className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle size={16} />
                      {lang === 'ar' ? 'إلغاء الموعد' : 'Cancel'}
                    </button>
                    <button 
                      onClick={() => toast(lang === 'ar' ? 'التواصل مع العيادة لتعديل الموعد' : 'Contact clinic to reschedule')}
                      className="flex-1 py-3 px-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 border border-blue-100 dark:border-blue-900/50"
                    >
                      <Clock size={16} />
                      {lang === 'ar' ? 'تعديل' : 'Reschedule'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
