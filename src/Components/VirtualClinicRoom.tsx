import React, { useState, useEffect } from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { X, Layout, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PatientClinicalActions } from './PatientClinicalActions';
import { api } from '../api-client';

interface VirtualClinicRoomProps {
  appointment: any;
  user: any;
  lang: 'ar' | 'en';
  t: any;
  onClose: () => void;
}

export const VirtualClinicRoom: React.FC<VirtualClinicRoomProps> = ({ 
  appointment, 
  user,
  lang, 
  t,
  onClose 
}) => {
  const [showSidePanel, setShowSidePanel] = useState(window.innerWidth > 1024);
  const [facility, setFacility] = useState<any>(null);

  useEffect(() => {
    // Fetch facility info for prescription template
    api.get('/api/pharmacies').then(res => {
      const docFacility = res.find((f: any) => f.doctor_id === user?.id) || res[0] || {};
      setFacility(docFacility);
    }).catch(console.error);
  }, [user]);

  // 🟢 Synchronized Hangup Polling
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/api/video-calls/status/${appointment.id}`);
        if (['ended', 'completed', 'cancelled', 'declined'].includes(res.status)) {
          clearInterval(interval);
          onClose(); // Force exit
        }
      } catch (e) {
        console.error("Hangup Polling Error:", e);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [appointment.id, onClose]);

  const handleEndCall = async () => {
    try {
      await api.put(`/api/video-calls/${appointment.id}/end`, {});
    } catch (e) {}
    onClose();
  };

  const domain = "meet.jit.si";
  const roomName = 'TaibaHealth-Room-' + appointment.id;

  const patientId = appointment.patient_id;
  const familyMemberId = appointment.family_member_id;
  const patientName = appointment.patient_name || appointment.user_name || 'Patient';
  const familyMemberName = appointment.family_member_name;

  return (
    <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
            <Video size={20} />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm md:text-base leading-tight">
              {t.virtualClinicTitle || (lang === 'ar' ? 'عيادة افتراضية' : 'Virtual Clinic')}
            </h1>
            <p className="text-slate-400 text-[10px] md:text-xs">
              {t.consultationWith || (lang === 'ar' ? 'استشارة مع' : 'Consultation with')}: {familyMemberName || patientName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSidePanel(!showSidePanel)}
            className={`p-2.5 rounded-xl transition-all flex items-center gap-2 font-bold text-xs ${showSidePanel ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            <Layout size={18} />
            <span className="hidden sm:inline">
              {showSidePanel ? (lang === 'ar' ? 'إخفاء اللوحة' : 'Hide Panel') : (lang === 'ar' ? 'الإجراءات الطبية' : 'Clinical Actions')}
            </span>
          </button>
          
          <div className="w-px h-6 bg-slate-800 mx-1"></div>

          <button 
            onClick={handleEndCall}
            className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all flex items-center gap-2 font-bold text-xs"
          >
            <X size={18} />
            <span className="hidden sm:inline">{t.endCall || (lang === 'ar' ? 'إنهاء المكالمة' : 'End Call')}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="w-full h-[calc(100vh-64px)] transition-all duration-300 ease-in-out">
          <JitsiMeeting
            domain={domain}
            roomName={roomName}
            configOverwrite={{
              prejoinPageEnabled: false, // THIS DISABLES THE LOBBY SCREEN
              startWithAudioMuted: false,
              startWithVideoMuted: false,
              disableDeepLinking: true,
            }}
            interfaceConfigOverwrite={{
              DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            }}
            userInfo={{
              displayName: user.name,
              email: user.email || '',
            }}
            onReadyToClose={handleEndCall}
            getIFrameRef={(iframeRef: any) => {
              iframeRef.style.height = '100%';
              iframeRef.style.width = '100%';
              // Aggressively force permissions for production (HTTPS)
              iframeRef.allow = 'camera; microphone; fullscreen; display-capture; autoplay';
              iframeRef.setAttribute('allow', 'camera; microphone; fullscreen; display-capture; autoplay');
            }}
          />
        </div>

        {/* Clinical Actions Side Panel */}
        <AnimatePresence mode="wait">
          {showSidePanel && (
            <motion.div
              initial={{ x: lang === 'ar' ? -500 : 500, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: lang === 'ar' ? -500 : 500, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`w-full md:w-[450px] lg:w-[500px] bg-white dark:bg-slate-950 border-slate-800 flex flex-col shadow-2xl z-10 ${lang === 'ar' ? 'border-r' : 'border-l'}`}
            >
              <PatientClinicalActions
                patientId={patientId}
                familyMemberId={familyMemberId}
                appointmentId={appointment.id}
                patientName={patientName}
                familyMemberName={familyMemberName}
                lang={lang}
                user={user}
                facility={facility}
                t={t}
                isPanel={true}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Toggle Button (when panel is closed) */}
        {!showSidePanel && (
          <button 
            onClick={() => setShowSidePanel(true)}
            className="absolute bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all md:hidden z-30"
          >
            <Layout size={24} />
          </button>
        )}
      </div>
    </div>
  );
};
