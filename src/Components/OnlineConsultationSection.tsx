import React, { useState, useEffect } from 'react';
import { User, Video, Info, PhoneCall } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../api-client';
import { UserType } from '../types';
import toast from 'react-hot-toast';

interface OnlineConsultationSectionProps {
  lang: string;
  t: any;
  currentUser: UserType | null;
  onCallInitiated: (doctorId: number, doctorName: string) => void;
}

export const OnlineConsultationSection = ({ lang, t, currentUser, onCallInitiated }: OnlineConsultationSectionProps) => {
  const [onlineDoctors, setOnlineDoctors] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOnlineDoctors = async () => {
    try {
      const doctors = await api.get('/api/public/online-doctors');
      setOnlineDoctors(Array.isArray(doctors) ? doctors : []);
    } catch (err) {
      console.error('Failed to fetch online doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnlineDoctors();
    const interval = setInterval(fetchOnlineDoctors, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading && onlineDoctors.length === 0) return null;
  if (!loading && onlineDoctors.length === 0) return null;

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 text-sm font-bold uppercase tracking-wider">
              {lang === 'ar' ? 'مباشر الآن' : 'Live Now'}
            </span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">
            {lang === 'ar' ? 'استشارة مرئية فورية' : 'Instant Video Consultation'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            {lang === 'ar' ? 'تحدث مع طبيب متاح حالياً ودون انتظار' : 'Talk to an available doctor right now, no waiting needed.'}
          </p>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory">
        {onlineDoctors.map((doctor) => (
          <motion.div
            key={doctor.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-shrink-0 w-72 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-xl transition-all snap-center relative overflow-hidden group"
          >
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg group-hover:scale-105 transition-transform">
                  {doctor.profile_picture ? (
                    <img src={doctor.profile_picture} alt={doctor.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-3xl">
                      {doctor.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 border-4 border-white dark:border-slate-900 rounded-full" title="Online" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {lang === 'ar' ? 'د.' : 'Dr.'} {doctor.name}
              </h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">
                {doctor.specialty ? (t[doctor.specialty] || doctor.specialty) : (lang === 'ar' ? 'طبيب ممارس' : 'General Practitioner')}
              </p>

              <button
                onClick={() => onCallInitiated(doctor.id, doctor.name)}
                className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/20 group/btn"
              >
                <Video size={18} className="group-hover/btn:animate-pulse" />
                <span>{lang === 'ar' ? 'اتصال الآن' : 'Call Now'}</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
