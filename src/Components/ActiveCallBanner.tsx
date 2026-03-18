import React, { useState, useEffect } from 'react';
import { Phone, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../api-client';

interface ActiveCallBannerProps {
  lang: string;
  user: any;
  currentView: string;
  onRejoin: (appt: any) => void;
}

export const ActiveCallBanner: React.FC<ActiveCallBannerProps> = ({ 
  lang, 
  user, 
  currentView,
  onRejoin 
}) => {
  const [activeCall, setActiveCall] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkActiveCall = async () => {
      try {
        const res = await api.get('/api/video-calls/current-active');
        if (res && res.id) {
          setActiveCall(res);
        } else {
          setActiveCall(null);
        }
      } catch (e) {
        console.error("Banner Polling Error:", e);
      }
    };

    checkActiveCall();
    const interval = setInterval(checkActiveCall, 5000); // Check every 5s
    return () => clearInterval(interval);
  }, [user]);

  // Don't show if no active call or if we are already in the clinic
  if (!activeCall || currentView === 'virtual-clinic') return null;

  const otherPartyName = user.role === 'patient' ? activeCall.doctor_name : activeCall.patient_name;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-[60] p-3 flex justify-center pointer-events-none"
      >
        <div className="bg-indigo-600 text-white rounded-full px-6 py-3 shadow-2xl flex items-center gap-4 pointer-events-auto border-2 border-white/20 backdrop-blur-md">
          <div className="relative">
            <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-20" />
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Phone size={20} className="animate-bounce" />
            </div>
          </div>
          
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-tight">
              {lang === 'ar' ? 'لديك مكالمة نشطة حالياً' : 'You have an active call'}
            </span>
            <span className="text-[10px] opacity-80 font-medium">
              {lang === 'ar' ? `مع: ${otherPartyName}` : `With: ${otherPartyName}`}
            </span>
          </div>

          <button
            onClick={() => onRejoin({
              id: activeCall.id,
              doctor_id: activeCall.doctor_id,
              patient_id: activeCall.patient_id,
              room_id: activeCall.room_id,
              status: 'in_progress',
              patient_name: activeCall.patient_name,
              doctor_name: activeCall.doctor_name
            })}
            className="bg-white text-indigo-600 px-4 py-1.5 rounded-full font-bold text-xs hover:bg-indigo-50 transition-colors flex items-center gap-1.5 shadow-sm group"
          >
            <span>{lang === 'ar' ? 'العودة للمكالمة' : 'Return to Call'}</span>
            <ArrowRight size={14} className={lang === 'ar' ? 'rotate-180 group-hover:-translate-x-0.5 transition-transform' : 'group-hover:translate-x-0.5 transition-transform'} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
