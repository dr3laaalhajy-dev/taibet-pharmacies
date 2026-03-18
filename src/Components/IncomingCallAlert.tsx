import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Video, User } from 'lucide-react';

interface IncomingCallAlertProps {
  isOpen: boolean;
  patientName: string;
  onAccept: () => void;
  onDecline: () => void;
  lang: 'ar' | 'en';
}

export const IncomingCallAlert: React.FC<IncomingCallAlertProps> = ({
  isOpen,
  patientName,
  onAccept,
  onDecline,
  lang
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800"
          >
            <div className="p-8 text-center">
              {/* Animated Ringing Icon */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                <div className="absolute inset-2 bg-blue-500/40 rounded-full animate-pulse" />
                <div className="relative w-full h-full bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                  <Video size={40} className="animate-bounce" />
                </div>
              </div>

              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                {lang === 'ar' ? 'مكالمة واردة' : 'Incoming Call'}
              </h2>
              
              <div className="flex items-center justify-center gap-2 mb-8 bg-slate-50 dark:bg-slate-800/50 py-3 px-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <User size={20} className="text-slate-400" />
                <span className="text-xl font-bold text-slate-700 dark:text-slate-200">
                  {patientName}
                </span>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={onDecline}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-all group"
                >
                  <PhoneOff size={20} className="group-hover:rotate-12 transition-transform" />
                  {lang === 'ar' ? 'رفض' : 'Decline'}
                </button>
                
                <button
                  onClick={onAccept}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/30 hover:shadow-xl transition-all group"
                >
                  <Phone size={20} className="group-hover:animate-shake transition-transform" />
                  {lang === 'ar' ? 'قبول' : 'Accept'}
                </button>
              </div>
            </div>
            
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-green-500 to-blue-500 animate-shimmer" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
