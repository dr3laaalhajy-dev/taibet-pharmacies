import React, { useState, useEffect } from 'react';
import { Users, Calendar, Activity, Clock, ChevronRight, MoreHorizontal, LayoutDashboard, UserPlus, Check } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { api } from '../api-client';

interface Stats {
  totalPatients: number;
  todayAppointments: number;
  totalAppointments: number;
}

interface Appointment {
  id: number;
  patient_name: string;
  family_member_name?: string;
  appointment_date: string;
  patient_id: number;
  family_member_id?: number;
  status: string;
  created_at: string;
  patient_phone?: string;
}

export const DoctorOverviewDashboard: React.FC<{ lang: 'ar' | 'en', t: any }> = ({ lang, t }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedPatients, setAddedPatients] = useState<number[]>([]);

  const handleQuickAdd = async (e: React.MouseEvent, patientId: number) => {
    e.stopPropagation();
    try {
      await api.post('/api/doctor/patients/add-from-appointment', { patientId });
      setAddedPatients(prev => [...prev, patientId]);
      toast.success(t.added);
      if (stats) setStats({ ...stats, totalPatients: stats.totalPatients + 1 });
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل الإضافة' : 'Failed to add');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const [statsData, scheduleData] = await Promise.all([
          api.get('/api/doctor/dashboard-stats'),
          api.get(`/api/appointments/doctor?date=${today}`)
        ]);
        setStats(statsData);
        setTodaySchedule(Array.isArray(scheduleData) ? scheduleData : []);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-pulse p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-800"></div>
          ))}
        </div>
        <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-800"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: t.totalPatients,
      value: stats?.totalPatients || 0,
      icon: <Users className="text-emerald-500" size={24} />,
      trend: "+4%",
      color: "bg-emerald-50 dark:bg-emerald-900/20"
    },
    {
      title: t.todayAppointments,
      value: stats?.todayAppointments || 0,
      icon: <Calendar className="text-blue-500" size={24} />,
      trend: null,
      color: "bg-blue-50 dark:bg-blue-900/20"
    },
    {
      title: t.allAppointments,
      value: stats?.totalAppointments || 0,
      icon: <Activity className="text-purple-500" size={24} />,
      trend: null,
      color: "bg-purple-50 dark:bg-purple-900/20"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-6 bg-slate-50/50 dark:bg-transparent rounded-3xl" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <LayoutDashboard className="text-blue-600" />
            {t.dashboardOverview}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">
            {new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 ${card.color} rounded-full -mr-12 -mt-12 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity`}></div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${card.color}`}>
                  {card.icon}
                </div>
                {card.trend && (
                  <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-black px-2 py-1 rounded-full">
                    {card.trend}
                  </span>
                )}
              </div>
              
              <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-1">{card.title}</h3>
              <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                {card.value.toLocaleString()}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Today's Schedule Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden"
      >
        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-none">
              <Clock size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">{t.todaysSchedule}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{todaySchedule.length} {t.waitingPatients}</p>
            </div>
          </div>
          <button className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
            <MoreHorizontal size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-4 md:p-8">
          {todaySchedule.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Calendar size={40} className="text-slate-300" />
              </div>
              <p className="text-slate-400 font-bold">{t.noAppointmentsToday}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todaySchedule.map((app, idx) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, x: lang === 'ar' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group flex flex-col md:flex-row md:items-center justify-between p-5 rounded-3xl border border-transparent hover:border-slate-100 dark:hover:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative">
                      <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-slate-400 text-xl border-2 border-white dark:border-slate-900 shadow-sm">
                        {app.patient_name.charAt(0)}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                        {app.patient_name}
                        {app.family_member_name && <span className="text-xs text-slate-400 font-medium mr-2 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full inline-block mt-1 md:mt-0">({app.family_member_name})</span>}
                      </h4>
                      <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mt-0.5">{app.patient_phone || '---'}</p>
                    </div>
                    
                    <button
                      onClick={(e) => handleQuickAdd(e, app.patient_id)}
                      disabled={addedPatients.includes(app.patient_id)}
                      className={`mr-4 px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1.5 transition-all ${
                        addedPatients.includes(app.patient_id)
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'border border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-slate-700 dark:text-blue-400'
                      }`}
                    >
                      {addedPatients.includes(app.patient_id) ? <Check size={14} /> : <UserPlus size={14} />}
                      {addedPatients.includes(app.patient_id) ? t.added : t.addToMyPatients}
                    </button>
                  </div>

                  <div className="flex items-center gap-8 mt-4 md:mt-0">
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t.time}</span>
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black">
                        <Clock size={16} className="text-blue-500" />
                        {app.created_at ? new Date(app.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : '---'}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end min-w-[100px]">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t.status}</span>
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black ${
                        app.status === 'completed' 
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                        : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {app.status === 'completed' ? t.completed : t.scheduled}
                      </span>
                    </div>

                    <div className="hidden md:flex p-2 bg-slate-100 dark:bg-slate-800 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight size={20} className={`text-slate-400 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
