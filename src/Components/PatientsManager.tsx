import React, { useState } from 'react';
import { Search, UserPlus, Users, Phone, Mail, Calendar, ChevronRight, Activity, Filter, RefreshCw, Clock, PlusCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { api } from '../api-client';

interface Patient {
  id: number;
  name: string;
  phone: string;
  email: string;
  profile_picture?: string;
  age?: number;
  dob?: string;
  gender?: string;
  blood_type?: string;
  chronic_diseases?: string;
  allergies?: string;
}

interface PatientsManagerProps {
  patients: Patient[];
  loading: boolean;
  lang: 'ar' | 'en';
  t: any;
  onViewProfile: (patient: Patient) => void;
  onAddPatient: () => void;
  onRefresh: () => void;
  onQuickBook: (patient: Patient) => void;
  onRemove: (patient: Patient) => void;
}

export const PatientsManager: React.FC<PatientsManagerProps> = ({ 
  patients, 
  loading, 
  lang, 
  t,
  onViewProfile, 
  onAddPatient, 
  onRefresh,
  onQuickBook,
  onRemove
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'chronic' | 'emergency'>('all');

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.phone.includes(searchTerm)
  );

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="text-indigo-600 dark:text-indigo-400" /> 
            {t.myPatientsTitle}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {t.myPatientsSubtitle}
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <button 
            onClick={onRefresh} 
            className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title={t.refresh}
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={onAddPatient}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 dark:shadow-none active:scale-95"
          >
            <UserPlus size={18} />
            {t.addOfflinePatient}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 rtl:right-3 ltr:left-3 ltr:right-auto" size={18} />
          <input 
            type="text" 
            placeholder={t.searchPatientsPlaceholder} 
            className="w-full pr-10 pl-4 ltr:pl-10 ltr:pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${filter === 'all' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            {t.all}
          </button>
          <button 
            onClick={() => setFilter('chronic')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${filter === 'chronic' ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            {t.chronic}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600"></div></div>
      ) : filteredPatients.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center border border-dashed border-slate-300 dark:border-slate-700">
          <Users size={64} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">
            {t.noMatchingPatients}
          </h3>
          <p className="text-slate-500">
            {t.searchHint}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <motion.div 
              key={patient.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 dark:bg-indigo-900/10 rounded-bl-[100px] z-0 -mr-8 -mt-8 group-hover:bg-indigo-100 transition-colors"></div>
              
              <div className="flex items-start gap-4 mb-6 relative z-10">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-2xl text-indigo-600 dark:text-indigo-400 overflow-hidden shadow-inner shrink-0">
                  {patient.profile_picture ? (
                    <img src={patient.profile_picture} alt={patient.name} className="w-full h-full object-cover" />
                  ) : (
                    patient.name[0]
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-900 dark:text-white text-lg truncate group-hover:text-indigo-600 transition-colors">{patient.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-mono">{patient.phone}</p>
                  <div className="flex gap-2 mt-2">
                    {patient.chronic_diseases && (
                      <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[10px] font-bold rounded-md uppercase">{t.chronicLabel}</span>
                    )}
                    {patient.allergies && (
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-bold rounded-md uppercase">{t.allergyLabel}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-6 relative z-10">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t.age}</p>
                  <p className="text-sm font-black text-slate-700 dark:text-slate-300">{patient.dob ? `${new Date().getFullYear() - new Date(patient.dob).getFullYear()} ${t.yearsSuffix}` : '---'}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t.blood}</p>
                  <p className="text-sm font-black text-slate-700 dark:text-slate-300 text-red-600">{patient.blood_type || '---'}</p>
                </div>
              </div>

              <div className="flex gap-2 relative z-10">
                <button 
                  onClick={() => onViewProfile(patient)}
                  className="flex-1 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl font-bold text-sm hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 group/btn"
                >
                  <Activity size={16} />
                  {t.patientProfile}
                  <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform rtl:rotate-180" />
                </button>
                <button 
                  onClick={() => onQuickBook(patient)}
                  className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                  title={t.newAppointment}
                >
                  <PlusCircle size={20} />
                </button>
                <button 
                  onClick={() => onRemove(patient)}
                  className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                  title={t.delete || 'Remove'}
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
