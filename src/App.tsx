import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Calendar, MapPin, Phone, 
  User, LogOut, Shield, Settings, Activity,
  Search, Clock, MessageCircle, CheckCircle, Stethoscope, BriefcaseMedical, Layout, UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore
import { translations } from './translations';

import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- Types ---
interface UserType { id: number; email: string; role: 'admin' | 'doctor' | 'pharmacist'; name: string; phone?: string; notes?: string; pharmacy_limit?: number; is_active?: boolean; }
interface WorkingHours { isOpen: boolean; start: string; end: string; }
interface Facility { id: number; name: string; type: 'pharmacy' | 'clinic'; address: string; phone: string; latitude: number; longitude: number; doctor_id?: number; pharmacist_name?: string; whatsapp_phone?: string; image_url?: string; specialty?: string; working_hours: Record<string, WorkingHours>; manual_status?: 'open' | 'closed' | 'auto'; }
interface FooterSettings { copyright: string; description: string; facebook: string; instagram: string; contact_phone: string; complaints_phone: string; }

const SUPER_ADMINS = ['admin@pharmaduty.com', 'alaa@taiba.pharma.sy'];
const DAYS_OF_WEEK = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const SPECIALTIES = [
  "أمراض الجهاز الهضمي والكبد", "أمراض الكلى", "أمراض الغدد الصماء والسكري",
  "طب الأطفال وحديثي الولادة", "أمراض القلب والأوعية الدموية", "الأمراض الجلدية والتناسلية",
  "الأمراض الصدرية والجهاز التنفسي", "طب الأعصاب والنفسية", "أمراض الدم والأورام",
  "العلاج الطبيعي والتأهيل", "الجراحة العامة", "جراحة العظام والكسور",
  "جراحة المسالك البولية", "جراحة المخ والأعصاب", "جراحة الأنف والأذن والحنجرة",
  "جراحة التجميل والحروق", "جراحة القلب والصدر", "طب وجراحة العيون", "النساء والتوليد"
];

const checkIsOpenNow = (f: Facility) => {
  if (f.manual_status === 'open') return true;
  if (f.manual_status === 'closed') return false;
  if (!f.working_hours) return false;
  const now = new Date();
  const dayIndex = now.getDay().toString();
  const todaySchedule = f.working_hours[dayIndex];
  if (!todaySchedule || !todaySchedule.isOpen) return false;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = todaySchedule.start.split(':').map(Number);
  const [endH, endM] = todaySchedule.end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  if (endMinutes < startMinutes) return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

const formatTime12h = (time24: string) => {
  if (!time24) return '';
  const [h, m] = time24.split(':');
  const d = new Date(); d.setHours(parseInt(h), parseInt(m));
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return (R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(1);
};

const api = {
  get: (url: string) => fetch(url, { credentials: 'include' }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
  post: (url: string, body: any) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
  put: (url: string, body: any) => fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
  patch: (url: string, body?: any) => fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: body ? JSON.stringify(body) : undefined }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
  delete: (url: string) => fetch(url, { method: 'DELETE', credentials: 'include' }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
};

const LocationPicker = ({ onLocationSelect, initialPosition }: { onLocationSelect: (lat: number, lng: number) => void, initialPosition?: [number, number] }) => {
  const [position, setPosition] = useState<[number, number] | null>(initialPosition || null);
  useMapEvents({ click(e) { setPosition([e.latlng.lat, e.latlng.lng]); onLocationSelect(e.latlng.lat, e.latlng.lng); } });
  return position ? <Marker position={position} /> : null;
};
const RecenterMap = ({ position }: { position: [number, number] }) => {
  const map = useMap(); useEffect(() => { map.setView(position, map.getZoom()); }, [position, map]); return null;
};

// --- Components ---
const PublicView = ({ onLogin, lang, t }: { onLogin: () => void, lang: string, t: any }) => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pharmacy' | 'clinic'>('pharmacy');
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [openNowPage, setOpenNowPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    setLoading(true);
    api.get('/api/public/facilities').then(data => setFacilities(data)).finally(() => setLoading(false));
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log("الموقع غير مفعل")
      );
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setOpenNowPage(1);
  }, [activeTab, searchQuery]);

  const processedFacilities = facilities
    .filter(f => f.type === activeTab && (f.name.includes(searchQuery) || f.address.includes(searchQuery)))
    .map(f => ({
      ...f,
      isOpenNow: checkIsOpenNow(f),
      distance: userLocation ? parseFloat(getDistanceKm(userLocation.lat, userLocation.lng, f.latitude, f.longitude)) : null
    }))
    .sort((a, b) => {
      if (a.isOpenNow && !b.isOpenNow) return -1;
      if (!a.isOpenNow && b.isOpenNow) return 1;
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
      return 0;
    });

  const currentlyOpen = processedFacilities.filter(f => f.isOpenNow);
  
  const totalOpenPages = Math.ceil(currentlyOpen.length / itemsPerPage);
  const paginatedOpen = currentlyOpen.slice((openNowPage - 1) * itemsPerPage, openNowPage * itemsPerPage);

  const totalPages = Math.ceil(processedFacilities.length / itemsPerPage);
  const paginatedFacilities = processedFacilities.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full overflow-x-hidden min-h-[80vh]">
      <header className="mb-16 text-center">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest text-emerald-600 uppercase bg-emerald-50 rounded-full">
          {t.communityHealth}
        </motion.div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
          {lang === 'ar' ? <>صيدليات ومراكز <span className="text-emerald-500">طيبة الإمام</span> الصحية</> : <><span className="text-emerald-500">Taibet El-Imam</span> Pharmacies and Health Centers</>}
        </h1>
        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto font-light leading-relaxed mb-8">{t.searchPlaceholder}</p>
        
        <div className="max-w-xl mx-auto relative group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
          <input type="text" placeholder={t.searchPlaceholder} className="w-full pr-12 pl-4 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>

        <div className="flex justify-center gap-4 mt-10 flex-wrap">
          <button onClick={() => setActiveTab('pharmacy')} className={`px-8 py-3.5 rounded-2xl font-bold transition-all shadow-sm flex items-center gap-2 ${activeTab === 'pharmacy' ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
            <BriefcaseMedical size={18} /> {lang === 'ar' ? 'الصيدليات' : 'Pharmacies'}
          </button>
          <button onClick={() => setActiveTab('clinic')} className={`px-8 py-3.5 rounded-2xl font-bold transition-all shadow-sm flex items-center gap-2 ${activeTab === 'clinic' ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
            <Stethoscope size={18} /> {lang === 'ar' ? 'العيادات' : 'Clinics'}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {selectedDoctorId && <DoctorProfileModal doctorId={selectedDoctorId} onClose={() => setSelectedDoctorId(null)} t={t} lang={lang} />}
      </AnimatePresence>

      <div className="flex flex-col gap-12 md:gap-16 mb-16">
        
        <div className="w-full">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            {activeTab === 'pharmacy' ? (lang === 'ar' ? 'صيدليات مناوبة الآن' : 'Pharmacies On Call Now') : (lang === 'ar' ? 'عيادات مناوبة الآن' : 'Clinics Open Now')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedOpen.length > 0 ? paginatedOpen.map(f => (
              <div key={`open-${f.id}`} className="bg-white p-6 rounded-3xl border-2 border-emerald-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-4 left-4 bg-emerald-50 text-emerald-600 text-[10px] font-bold px-3 py-1 rounded-full animate-pulse">{lang === 'ar' ? 'مفتوح الآن' : 'Open Now'}</div>
                <div className="flex items-center gap-4 mb-4 mt-2">
                  {f.image_url ? (
                    <img src={f.image_url} alt={f.name} className="w-14 h-14 object-cover rounded-xl shrink-0 shadow-sm border border-slate-100" />
                  ) : (
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-emerald-100">
                      {f.type === 'clinic' ? <Stethoscope size={24} /> : <Activity size={24} />}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 line-clamp-1">{f.name}</h3>
                    {f.type === 'clinic' && f.specialty && <span className="text-[11px] font-bold text-indigo-600 block mt-0.5">{f.specialty}</span>}
                    {f.pharmacist_name && <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-1"><User size={12} /> {f.pharmacist_name}</span>}
                    {f.distance !== null && <span className="text-[11px] font-bold text-slate-500 mt-1.5 block">{lang === 'ar' ? `تبعد عنك: ${f.distance} كم` : `${f.distance} km away`} 📍</span>}
                  </div>
                </div>
                <p className="text-slate-500 text-sm flex items-center gap-2 mb-4"><MapPin size={16} className="shrink-0"/> <span className="truncate">{f.address}</span></p>
                <div className="flex gap-2">
                  <a href={`tel:${f.phone}`} className="flex-1 bg-slate-900 text-white text-center py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-1"><Phone size={14} /> {lang === 'ar' ? 'اتصال' : 'Call'}</a>
                  {f.whatsapp_phone && <a href={`https://wa.me/${f.whatsapp_phone}`} target="_blank" className="flex-1 bg-emerald-500 text-white text-center py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1"><MessageCircle size={14} /> {lang === 'ar' ? 'واتساب' : 'WhatsApp'}</a>}
                </div>
              </div>
            )) : (
              <div className="col-span-full text-center py-12 bg-slate-50 rounded-3xl border border-slate-100 text-slate-500">
                <Clock className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-500 font-medium">{lang === 'ar' ? `لا يوجد ${activeTab === 'pharmacy' ? 'صيدليات' : 'عيادات'} مناوبة في هذا الوقت.` : 'No facilities open at this time.'}</p>
              </div>
            )}
          </div>
          
          {totalOpenPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button disabled={openNowPage === 1} onClick={() => setOpenNowPage(prev => prev - 1)} className="px-6 py-2.5 rounded-xl font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">{lang === 'ar' ? 'السابق' : 'Prev'}</button>
              <span className="font-bold text-slate-500 text-sm" dir="ltr">{openNowPage} / {totalOpenPages}</span>
              <button disabled={openNowPage === totalOpenPages} onClick={() => setOpenNowPage(prev => prev + 1)} className="px-6 py-2.5 rounded-xl font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">{lang === 'ar' ? 'التالي' : 'Next'}</button>
            </div>
          )}
        </div>

        <div className="w-full">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
            <Calendar className="text-indigo-500" /> {lang === 'ar' ? 'الجدول الأسبوعي للدوام' : 'Weekly Schedule'}
          </h2>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-right min-w-[800px]">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{activeTab === 'pharmacy' ? (lang === 'ar'?'الصيدلية':'Pharmacy') : (lang === 'ar'?'العيادة':'Clinic')}</th>
                    {DAYS_OF_WEEK.map((day, idx) => (
                      <th key={idx} className={`px-2 py-4 text-[10px] font-bold text-center uppercase tracking-widest ${new Date().getDay() === idx ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-400'}`}>{day}</th>
                    ))}
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">{lang === 'ar' ? 'التفاصيل' : 'Details'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedFacilities.map((f, idx) => {
                    const isOpenNow = f.isOpenNow;
                    return (
                      <motion.tr key={`schedule-${f.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-base">{f.name}</span>
                            {f.type === 'clinic' && f.specialty && <span className="text-[10px] font-bold text-indigo-500 mt-0.5">{f.specialty}</span>}
                            <span className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin size={10}/> {f.address}</span>
                            {f.distance !== null && <span className="text-[10px] font-bold text-slate-400 mt-1 block">{lang === 'ar' ? 'يبعد' : 'Dist'}: {f.distance} {lang === 'ar' ? 'كم' : 'km'} 📍</span>}
                            <div className="mt-2">
                              {isOpenNow ? <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full">{lang === 'ar' ? 'مفتوح الآن' : 'Open'}</span> : <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-full">{lang === 'ar' ? 'مغلق' : 'Closed'}</span>}
                            </div>
                          </div>
                        </td>
                        
                        {DAYS_OF_WEEK.map((day, dIdx) => {
                          const daySchedule = f.working_hours && f.working_hours[dIdx.toString()];
                          const isToday = new Date().getDay() === dIdx;
                          return (
                            <td key={dIdx} className={`px-2 py-4 text-center border-x border-slate-50/50 ${isToday ? 'bg-indigo-50/30' : ''}`}>
                              {daySchedule?.isOpen ? (
                                <div className="flex flex-col items-center justify-center">
                                  <span className={`text-[10px] font-mono font-bold ${isToday ? 'text-indigo-700' : 'text-slate-700'}`} dir="ltr">{formatTime12h(daySchedule.start)}</span>
                                  <span className="text-[8px] text-slate-400 my-0.5">{lang === 'ar' ? 'إلى' : 'to'}</span>
                                  <span className={`text-[10px] font-mono font-bold ${isToday ? 'text-indigo-700' : 'text-slate-700'}`} dir="ltr">{formatTime12h(daySchedule.end)}</span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-red-400 font-bold">{lang === 'ar' ? 'عطلة' : 'Off'}</span>
                              )}
                            </td>
                          );
                        })}
                        
                        <td className="px-6 py-4 text-center">
                          {f.doctor_id ? (
                            <button onClick={() => setSelectedDoctorId(f.doctor_id!)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-1 mx-auto">
                              <User size={12} /> {lang === 'ar' ? 'كادر طبي' : 'Staff'}
                            </button>
                          ) : (
                            <span className="text-slate-300 text-xs">---</span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 p-6 border-t border-slate-100 bg-slate-50">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="px-6 py-2.5 rounded-xl font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">{lang === 'ar' ? 'السابق' : 'Prev'}</button>
                <span className="font-bold text-slate-500 text-sm" dir="ltr">{currentPage} / {totalPages}</span>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="px-6 py-2.5 rounded-xl font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">{lang === 'ar' ? 'التالي' : 'Next'}</button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
            <MapPin className="text-emerald-500" /> {lang === 'ar' ? `مواقع ${activeTab === 'pharmacy' ? 'الصيدليات' : 'العيادات'}` : 'Locations Map'}
          </h2>
          <div className="h-[400px] rounded-3xl overflow-hidden shadow-lg border border-slate-200 z-0 relative">
            <MapContainer center={[35.25, 36.7]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {processedFacilities.map(f => {
                const isOpenNow = f.isOpenNow;
                return (
                  <Marker key={`map-${f.id}`} position={[f.latitude || 35.25, f.longitude || 36.7]}>
                    <Popup className="custom-popup">
                      <div className="text-right min-w-[200px]" dir="rtl">
                        <h3 className={`font-bold text-lg ${isOpenNow ? 'text-emerald-600' : 'text-slate-900'}`}>{f.name}</h3>
                        {f.type === 'clinic' && f.specialty && <p className="text-[10px] font-bold text-indigo-500 mt-1">{f.specialty}</p>}
                        <p className="text-xs text-slate-500 mt-1">{f.address}</p>
                        <p className="text-xs font-bold mt-2">{isOpenNow ? '🟢 مفتوح الآن' : '🔴 مغلق حالياً'}</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

const LoginAndRegister = ({ onLogin, t, lang }: { onLogin: (user: any) => void, t: any, lang: string }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState(''); 
  const [emailPrefix, setEmailPrefix] = useState(''); 
  const [password, setPassword] = useState(''); 
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(''); 
  const [activationKey, setActivationKey] = useState('');
  const [isActivatedByKey, setIsActivatedByKey] = useState(false); 
  const [role, setRole] = useState('pharmacist');
  const [error, setError] = useState(''); 
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setError(''); 
    setSuccessMsg(''); 
    setLoading(true);
    try {
      if (isLogin) {
        const data = await api.post('/api/auth/login', { email, password });
        onLogin(data.user);
      } else {
        const domain = role === 'doctor' ? '@taiba.Health.sy' : '@taiba.pharma.sy';
        const fullEmail = `${emailPrefix}${domain}`;
        
        const res = await api.post('/api/auth/register', { email: fullEmail, password, name, phone, role, activationKey });
        
        if (res.isActive) {
          setSuccessMsg('تم إنشاء الحساب وتفعيله بنجاح بواسطة المفتاح! يمكنك تسجيل الدخول الآن.');
          setIsActivatedByKey(true);
        } else {
          setSuccessMsg('تم إنشاء الحساب بنجاح! يرجى التواصل مع الإدارة لتفعيل حسابك.');
          setIsActivatedByKey(false);
        }
        
        setIsLogin(true); 
        setPassword(''); 
        setEmailPrefix(''); 
        setActivationKey('');
      }
    } catch (err: any) { 
      setError(err.error || (isLogin ? t.loginFailed : 'فشل التسجيل.')); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 w-full">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield size={32} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900">{isLogin ? t.loginTitle : (lang === 'ar' ? 'إنشاء حساب جديد' : 'Create Account')}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>}
          
          {successMsg && (
            <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm flex flex-col gap-3 text-center border border-emerald-100">
              <span className="font-bold">{successMsg}</span>
              {!isActivatedByKey && successMsg.includes('التواصل') && (
                <a href="https://wa.me/963000000000" target="_blank" rel="noreferrer" className="bg-emerald-500 text-white py-2 rounded-lg font-bold flex justify-center items-center gap-2 hover:bg-emerald-600 transition-colors">
                  <MessageCircle size={16} /> تواصل عبر واتساب للتفعيل
                </a>
              )}
            </div>
          )}

          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.fullName}</label>
                <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.role}</label>
                  <select className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" value={role} onChange={e => setRole(e.target.value)}>
                    <option value="pharmacist">{t.pharmacist}</option>
                    <option value="doctor">{t.doctor}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.phone}</label>
                  <input className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>
              
              <div className="pt-2 border-t border-slate-100 mt-2">
                <p className="text-xs text-slate-500 mb-2 font-medium leading-relaxed">
                  يمكنك تفعيل الحساب فوراً دون الحاجة للتواصل مع الإدارة عن طريق إدخال مفتاح تفعيل (اختياري):
                </p>
                <input placeholder="مفتاح التفعيل (إن وجد)" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-center tracking-widest uppercase" value={activationKey} onChange={e => setActivationKey(e.target.value.toUpperCase())} />
              </div>
            </>
          )}

          {isLogin ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.email}</label>
              <input type="email" required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-left" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} />
              <div className="flex gap-2 mt-2 justify-end" dir="ltr">
                <button type="button" onClick={() => setEmail(email.split('@')[0] + '@taiba.pharma.sy')} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-mono rounded-lg hover:bg-slate-200 transition-colors">@taiba.pharma.sy</button>
                <button type="button" onClick={() => setEmail(email.split('@')[0] + '@taiba.Health.sy')} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-mono rounded-lg hover:bg-slate-200 transition-colors">@taiba.Health.sy</button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.email}</label>
              <div className="flex" dir="ltr">
                <input type="text" required placeholder="username" className="flex-1 px-4 py-3 rounded-l-xl border border-r-0 border-slate-200 outline-none text-left focus:ring-2 focus:ring-emerald-500" value={emailPrefix} onChange={e => setEmailPrefix(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ''))} />
                <div className="px-3 py-3 bg-slate-50 border border-slate-200 rounded-r-xl text-slate-500 font-mono text-sm flex items-center select-none">
                  {role === 'doctor' ? '@taiba.Health.sy' : '@taiba.pharma.sy'}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.password}</label>
            <input type="password" required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-left" dir="ltr" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-colors mt-6">
            {loading ? '...' : (isLogin ? t.signIn : (lang === 'ar' ? 'تسجيل حساب' : 'Sign Up'))}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-100 pt-6">
          <p className="text-sm text-slate-600">
            {isLogin ? (lang === 'ar' ? 'ليس لديك حساب؟' : "Don't have an account?") : (lang === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?')}
            <button type="button" onClick={() => {setIsLogin(!isLogin); setError(''); setSuccessMsg('');}} className="text-emerald-600 font-bold hover:underline mx-2">
              {isLogin ? (lang === 'ar' ? 'إنشاء حساب' : 'Sign Up') : (lang === 'ar' ? 'تسجيل الدخول' : 'Login')}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, body, t }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, body: string, t: any }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md text-center max-h-[90vh] overflow-y-auto">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={32} /></div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">{title}</h3><p className="text-slate-500 mb-8">{body}</p>
        <div className="flex gap-3"><button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">{t.cancel}</button><button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors">{t.deleteBtn}</button></div>
      </motion.div>
    </div>
  );
};

const DoctorProfileModal = ({ doctorId, onClose, t, lang }: { doctorId: number, onClose: () => void, t: any, lang: string }) => {
  const [doctor, setDoctor] = useState<(UserType & { facilities: Facility[] }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/public/doctors/${doctorId}`)
      .then(data => setDoctor(data)).catch(err => console.error(err)).finally(() => setLoading(false));
  }, [doctorId]);

  if (!doctorId) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">{loading ? '...' : doctor?.name}</h3>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold uppercase tracking-wider">{doctor?.role === 'doctor' ? t.doctor : t.pharmacist}</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0"><Plus className="rotate-45 text-slate-400" size={24} /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div></div>
        ) : doctor ? (
          <div className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="p-6 bg-slate-50 rounded-2xl"><div className="flex items-center gap-3 text-slate-400 mb-2"><Phone size={18} /><span className="text-xs font-bold uppercase tracking-wider">{t.phone}</span></div><p className="text-lg font-mono text-slate-900 truncate">{doctor.phone || '---'}</p></div>
              <div className="p-6 bg-slate-50 rounded-2xl"><div className="flex items-center gap-3 text-slate-400 mb-2"><Calendar size={18} /><span className="text-xs font-bold uppercase tracking-wider">{t.email}</span></div><p className="text-lg text-slate-900 truncate">{doctor.email}</p></div>
            </div>
            {doctor.notes && (<div className="p-6 bg-emerald-50/50 rounded-2xl"><h4 className="text-sm font-bold text-emerald-900 uppercase tracking-wider mb-3">{t.doctorNotes || 'الاختصاص والملاحظات'}</h4><p className="text-emerald-800 leading-relaxed text-sm md:text-base">{doctor.notes}</p></div>)}
            <div>
              <h4 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3"><Activity className="text-emerald-500" size={24} /> {lang==='ar'?'المنشآت التابعة للكادر الطبي':'Associated Facilities'}</h4>
              <div className="grid grid-cols-1 gap-4">
                {doctor.facilities && doctor.facilities.map(p => (
                  <div key={p.id} className="p-4 border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 hover:bg-slate-50 transition-colors">
                    <div>
                      <h5 className="font-bold text-slate-900 flex items-center gap-2">{p.type === 'clinic' ? <Stethoscope size={14} className="text-indigo-500"/> : <BriefcaseMedical size={14} className="text-emerald-500"/>}{p.name}</h5>
                      <p className="text-xs text-slate-500 mt-1">{p.address}</p>
                    </div>
                    <div className="sm:text-right"><p className="text-sm font-mono text-slate-600">{p.phone}</p></div>
                  </div>
                ))}
                {(!doctor.facilities || doctor.facilities.length === 0) && <p className="text-center py-8 text-slate-400 italic">{lang==='ar'?'لا توجد منشآت مرتبطة بهذا الحساب حالياً.':'No associated facilities yet.'}</p>}
              </div>
            </div>
          </div>
        ) : (<p className="text-center py-12 text-slate-500">حدث خطأ في تحميل البيانات.</p>)}
      </motion.div>
    </div>
  );
};

const Dashboard = ({ user, onLogout, lang, t }: { user: UserType, onLogout: () => void, lang: 'ar' | 'en', t: any }) => {
  const [activeTab, setActiveTab] = useState<'facilities' | 'users' | 'profile' | 'settings'>('facilities');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const isSuperAdmin = SUPER_ADMINS.includes(user.email);
  const dashboardTitle = user.role === 'doctor' ? 'عياداتي ومواعيدي' : (user.role === 'pharmacist' ? 'صيدلياتي ومواعيدي' : 'إدارة المنشآت الطبية');
  const addButtonText = user.role === 'doctor' ? 'إضافة عيادة' : (user.role === 'pharmacist' ? 'إضافة صيدلية' : 'إضافة منشأة');

  const [profileEmail, setProfileEmail] = useState(user.email); const [profileName, setProfileName] = useState(user.name); const [profilePhone, setProfilePhone] = useState(user.phone || ''); const [profileNotes, setProfileNotes] = useState(user.notes || ''); const [profileCurrentPassword, setProfileCurrentPassword] = useState(''); const [profileNewPassword, setProfileNewPassword] = useState(''); const [profileMsg, setProfileMsg] = useState('');

  const [footerForm, setFooterForm] = useState<FooterSettings>({ copyright: '', description: '', facebook: '', instagram: '', contact_phone: '', complaints_phone: '' });
  const [footerMsg, setFooterMsg] = useState('');

  const defaultWorkingHours: Record<string, WorkingHours> = {};
  for(let i=0; i<7; i++) defaultWorkingHours[i.toString()] = { isOpen: true, start: "08:00", end: "22:00" };

  const [showModal, setShowModal] = useState(false); const [editingData, setEditingData] = useState<Facility | null>(null); const [form, setForm] = useState<any>({ name: '', address: '', phone: '', type: user.role === 'doctor' ? 'clinic' : 'pharmacy', latitude: 35.25, longitude: 36.7, whatsapp_phone: '', pharmacist_name: '', image_url: '', specialty: '', doctor_id: 0, working_hours: defaultWorkingHours });
  const [showUserModal, setShowUserModal] = useState(false); const [editingUser, setEditingUser] = useState<UserType | null>(null); const [userForm, setUserForm] = useState({ email: '', password: '', role: 'pharmacist' as any, name: '', pharmacy_limit: 10, phone: '', notes: '' });

  const [doctorFilter, setDoctorFilter] = useState<number>(0);
  const [confirmData, setConfirmData] = useState<{ isOpen: boolean, onConfirm: () => void, title: string, body: string }>({ isOpen: false, onConfirm: () => {}, title: '', body: '' });
  const openConfirm = (title: string, body: string, onConfirm: () => void) => setConfirmData({ isOpen: true, onConfirm, title, body });

  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  
  // حالة لرفع الصورة
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadData = async () => { 
    if (activeTab === 'facilities') api.get('/api/pharmacies').then(setFacilities); 
    if (activeTab === 'users' && user.role === 'admin') api.get('/api/admin/users').then(setUsers); 
    if (activeTab === 'settings' && isSuperAdmin) api.get('/api/public/settings').then(data => setFooterForm(data));
  };
  useEffect(() => { loadData(); }, [activeTab]);

  const handleSaveFacility = async (e: React.FormEvent) => {
    e.preventDefault(); const payload = { ...form }; if (user.role !== 'admin') delete payload.doctor_id;
    try {
      if (editingData) await api.put(`/api/pharmacies/${editingData.id}`, payload);
      else await api.post('/api/pharmacies', payload);
      setShowModal(false); loadData();
    } catch (err: any) { alert(err.error || 'خطأ في الحفظ، قد تكون وصلت للحد الأقصى المسموح لك!'); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      // استخدام مفتاح ImgBB عام لرفع الصور بسهولة ومجاناً
      const res = await fetch('https://api.imgbb.com/1/upload?key=6c2a41bd40fa2cde82b95b871c26b527', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setForm({ ...form, image_url: data.data.url });
      } else {
        alert('فشل رفع الصورة.');
      }
    } catch (err) {
      alert('حدث خطأ أثناء رفع الصورة.');
    } finally {
      setUploadingImage(false);
    }
  };

  const setManualStatus = async (id: number, status: 'open' | 'closed' | 'auto') => {
    try { await api.patch(`/api/pharmacies/${id}/status`, { manual_status: status }); loadData(); } catch(err: any) { alert('حدث خطأ'); }
  };

  const generateActivationKey = async () => {
    try {
      const res = await api.post('/api/admin/generate-key', {});
      setGeneratedKey(res.key);
    } catch (err: any) { alert('حدث خطأ أثناء التوليد'); }
  };

  const approveUser = async (id: number) => { try { await api.patch(`/api/admin/users/${id}/approve`); setUsers(users.map(u => u.id === id ? { ...u, is_active: true } : u)); } catch (err) { alert('فشل التفعيل'); } };
  const handleSaveUser = async (e: React.FormEvent) => { e.preventDefault(); try { if (editingUser) await api.put(`/api/admin/users/${editingUser.id}`, userForm); else await api.post('/api/admin/users', userForm); setShowUserModal(false); setEditingUser(null); loadData(); } catch (err: any) { alert(err.error || 'فشل الحفظ'); } };
  const handleUpdateProfile = async (e: React.FormEvent) => { e.preventDefault(); try { const res = await api.post('/api/auth/update-profile', { email: profileEmail, name: profileName, currentPassword: profileCurrentPassword, newPassword: profileNewPassword, phone: profilePhone, notes: profileNotes }); setProfileMsg(res.verificationRequired ? t.verificationSent : t.profileUpdated); setProfileCurrentPassword(''); setProfileNewPassword(''); } catch (err: any) { setProfileMsg(err.error || 'فشل التحديث'); } };

  const handleSaveFooter = async (e: React.FormEvent) => { e.preventDefault(); try { await api.put('/api/admin/settings', footerForm); setFooterMsg('تم حفظ إعدادات الفوتر بنجاح'); } catch(err: any) { setFooterMsg('فشل الحفظ'); } };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col md:flex-row w-full overflow-hidden">
      <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0 md:sticky md:top-0 md:h-screen z-20">
        <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center"><h1 className="text-xl font-bold text-slate-900 flex items-center gap-2"><img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" /> {lang === 'ar' ? 'طيبة الامام الصحية' : 'Taibet Health'}</h1><button onClick={onLogout} className="md:hidden flex items-center justify-center p-2 rounded-lg bg-red-50 text-red-600"><LogOut size={18} /></button></div>
        <nav className="flex-none md:flex-1 p-3 md:p-4 flex flex-row md:flex-col gap-2 overflow-x-auto whitespace-nowrap flex-nowrap scrollbar-hide">
          <button onClick={() => setActiveTab('facilities')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'facilities' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}><MapPin size={18} /> {dashboardTitle}</button>
          {user.role === 'admin' && <button onClick={() => setActiveTab('users')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}><User size={18} /> {t.userManagement}</button>}
          {isSuperAdmin && <button onClick={() => setActiveTab('settings')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}><Layout size={18} /> إعدادات الفوتر</button>}
          <button onClick={() => setActiveTab('profile')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}><Settings size={18} /> {t.profileSettings}</button>
        </nav>
        <div className="hidden md:block p-4 border-t border-slate-100 mt-auto"><div className="flex items-center gap-3 px-4 py-3 mb-2"><div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold shrink-0">{user.name[0]}</div><div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-900 truncate">{user.name}</p><p className="text-xs text-slate-500 capitalize">{user.role === 'admin' ? t.admin : user.role === 'doctor' ? t.doctor : t.pharmacist}</p></div></div><button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"><LogOut size={18} /> {t.logout}</button></div>
      </div>

      <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'facilities' && (
            <motion.div key="facilities" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
                <div><h2 className="text-2xl md:text-3xl font-bold text-slate-900">{dashboardTitle}</h2><p className="text-sm md:text-base text-slate-500">إدارة الجداول الأسبوعية وتغيير حالة الدوام يدوياً</p></div>
                <div className="flex flex-wrap gap-2 md:gap-4 w-full sm:w-auto">
                  {user.role === 'admin' && <select className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500" value={doctorFilter} onChange={e => setDoctorFilter(parseInt(e.target.value))}><option value="0">{t.allDoctors}</option>{users.filter(u => u.role === 'doctor' || u.role === 'pharmacist').map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>}
                  <button onClick={() => { setEditingData(null); setForm({ name: '', address: '', phone: '', type: user.role === 'doctor' ? 'clinic' : 'pharmacy', latitude: 35.25, longitude: 36.7, whatsapp_phone: '', pharmacist_name: '', specialty: '', image_url: '', doctor_id: 0, working_hours: defaultWorkingHours }); setShowModal(true); }} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-slate-900 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors"><Plus size={20} /> {addButtonText}</button>
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
                {facilities.filter(p => doctorFilter === 0 || p.doctor_id === doctorFilter).map(f => {
                  const isOpenNow = checkIsOpenNow(f);
                  return (
                    <div key={f.id} className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4 gap-2"><div><span className={`text-[10px] px-2 py-1 rounded-full font-bold inline-block mb-2 ${f.type === 'clinic' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>{f.type === 'clinic' ? 'عيادة طبية' : 'صيدلية'}</span><h3 className="text-lg md:text-xl font-bold text-slate-900 line-clamp-1">{f.name}</h3></div>{isOpenNow ? <span className="bg-emerald-500 text-white text-xs px-3 py-1 rounded-lg font-bold animate-pulse">مفتوح الآن</span> : <span className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-lg font-bold">مغلق حالياً</span>}</div>
                      <div className="space-y-2 text-slate-600 mb-6">
                        {f.type === 'clinic' && f.specialty && <p className="flex items-center gap-2 text-sm font-bold text-indigo-600 mb-1"><Stethoscope size={14} className="shrink-0"/> <span className="truncate">{f.specialty}</span></p>}
                        <p className="flex items-center gap-2 text-sm"><MapPin size={14} className="shrink-0"/> <span className="truncate">{f.address}</span></p>
                        <p className="flex items-center gap-2 text-sm"><Phone size={14} className="shrink-0"/> <span className="truncate">{f.phone}</span></p>
                      </div>
                      
                      <div className="bg-slate-50 p-3 rounded-xl mt-4 flex flex-col sm:flex-row items-center gap-2 border border-slate-100">
                        <span className="text-xs font-bold text-slate-500 mb-2 sm:mb-0 sm:ml-2 w-full sm:w-auto text-center sm:text-right">تجاوز الجدول يدوياً:</span>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button onClick={() => setManualStatus(f.id, 'open')} className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${f.manual_status==='open' ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-200' : 'bg-white border text-slate-600 hover:bg-slate-100'}`}>مفتوح دائماً</button>
                          <button onClick={() => setManualStatus(f.id, 'closed')} className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${f.manual_status==='closed' ? 'bg-red-500 text-white shadow-sm ring-2 ring-red-200' : 'bg-white border text-slate-600 hover:bg-slate-100'}`}>مغلق دائماً</button>
                          <button onClick={() => setManualStatus(f.id, 'auto')} className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!f.manual_status || f.manual_status==='auto' ? 'bg-indigo-500 text-white shadow-sm ring-2 ring-indigo-200' : 'bg-white border text-slate-600 hover:bg-slate-100'}`}>حسب الجدول</button>
                        </div>
                      </div>

                      <div className="flex gap-2 border-t border-slate-100 pt-4 mt-6"><button onClick={() => { setEditingData(f); setForm({...f, working_hours: f.working_hours || defaultWorkingHours}); setShowModal(true); }} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"><Edit2 size={14} /> تعديل البيانات</button><button onClick={() => openConfirm(t.confirmTitle, t.confirmBody, async () => { await api.delete(`/api/pharmacies/${f.id}`); loadData(); })} className="px-4 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"><Trash2 size={14} /></button></div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && isSuperAdmin && (
            <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-2xl">
              <h2 className="text-2xl md:text-3xl font-bold mb-8">إعدادات أسفل الموقع (الفوتر)</h2>
              <form onSubmit={handleSaveFooter} className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
                {footerMsg && <div className="p-3 bg-emerald-50 text-emerald-700 font-bold rounded-xl">{footerMsg}</div>}
                <div><label className="block text-sm font-bold mb-1">نص الحقوق (Copyright)</label><input className="w-full px-4 py-2 border rounded-xl" value={footerForm.copyright} onChange={e => setFooterForm({...footerForm, copyright: e.target.value})} placeholder="© 2026 نظام صيدليات طيبة الإمام. جميع الحقوق محفوظة." /></div>
                <div><label className="block text-sm font-bold mb-1">الوصف أسفل الحقوق</label><input className="w-full px-4 py-2 border rounded-xl" value={footerForm.description} onChange={e => setFooterForm({...footerForm, description: e.target.value})} placeholder="توفير المعلومات الأساسية عن المناوبات للمجتمع." /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-bold mb-1">رابط فيسبوك</label><input type="url" className="w-full px-4 py-2 border rounded-xl text-left" dir="ltr" value={footerForm.facebook} onChange={e => setFooterForm({...footerForm, facebook: e.target.value})} /></div>
                  <div><label className="block text-sm font-bold mb-1">رابط انستغرام</label><input type="url" className="w-full px-4 py-2 border rounded-xl text-left" dir="ltr" value={footerForm.instagram} onChange={e => setFooterForm({...footerForm, instagram: e.target.value})} /></div>
                  <div><label className="block text-sm font-bold mb-1">رقم التواصل العام</label><input className="w-full px-4 py-2 border rounded-xl text-left" dir="ltr" value={footerForm.contact_phone} onChange={e => setFooterForm({...footerForm, contact_phone: e.target.value})} /></div>
                  <div><label className="block text-sm font-bold mb-1">رقم الشكاوى</label><input className="w-full px-4 py-2 border rounded-xl text-left" dir="ltr" value={footerForm.complaints_phone} onChange={e => setFooterForm({...footerForm, complaints_phone: e.target.value})} /></div>
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800">حفظ الإعدادات</button>
              </form>
            </motion.div>
          )}

          {activeTab === 'users' && user.role === 'admin' && (
            <motion.div key="users" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{t.userManagement}</h2>
                  <p className="text-sm md:text-base text-slate-500">{t.manageStaff}</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                  {isSuperAdmin && (
                    <button onClick={generateActivationKey} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-indigo-50 text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-100 transition-colors">
                      توليد مفتاح تفعيل
                    </button>
                  )}
                  <button onClick={() => { setEditingUser(null); setUserForm({ email: '', password: '', role: 'pharmacist', name: '', pharmacy_limit: 10, phone: '', notes: '' }); setShowUserModal(true); }} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors">
                    <Plus size={20} /> {t.createUser}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {generatedKey && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="mb-6 p-6 bg-indigo-50 border border-indigo-100 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                    <div className="text-center md:text-right">
                      <h4 className="font-bold text-indigo-900 mb-1 text-lg">تم توليد مفتاح تفعيل بنجاح!</h4>
                      <p className="text-sm text-indigo-700">المفتاح صالح للاستخدام مرة واحدة فقط. قم بنسخه وإرساله للمستخدم.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-indigo-200 shadow-sm w-full md:w-auto justify-between">
                      <span className="font-mono text-xl font-bold tracking-widest text-slate-800" dir="ltr">{generatedKey}</span>
                      <div className="flex items-center gap-2 border-r border-slate-100 pr-4 mr-2">
                        <button onClick={() => { navigator.clipboard.writeText(generatedKey); alert('تم نسخ المفتاح للحافظة!'); }} className="px-4 py-2 bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl hover:bg-indigo-200 transition-colors">نسخ</button>
                        <button onClick={() => setGeneratedKey(null)} className="px-4 py-2 bg-slate-100 text-slate-500 hover:text-red-600 font-bold text-xs rounded-xl transition-colors">إغلاق</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {users.map(u => {
                  const isTargetSuperAdmin = SUPER_ADMINS.includes(u.email); const canEditTarget = !isTargetSuperAdmin || u.email === user.email; const canDeleteTarget = !isTargetSuperAdmin; 
                  return (
                    <div key={u.id} className={`p-5 md:p-6 rounded-2xl border shadow-sm flex flex-col gap-4 ${!u.is_active ? 'bg-yellow-50/50 border-yellow-200' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 font-bold text-xl shrink-0">{u.name[0]}</div><div className="flex-1 min-w-0"><div className="flex justify-between items-start"><span className="font-bold text-slate-900 truncate text-left text-base md:text-lg">{u.name}</span>{!u.is_active && <span className="shrink-0 px-2 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full mr-2">{lang === 'ar' ? 'بانتظار التفعيل' : 'Pending'}</span>}</div><p className="text-xs md:text-sm text-slate-500 truncate mt-1" dir="ltr">{u.email}</p><div className="flex gap-2 mt-2 flex-wrap"><span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isTargetSuperAdmin ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>{isTargetSuperAdmin ? 'Super Admin' : (u.role === 'admin' ? t.admin : u.role === 'doctor' ? t.doctor : t.pharmacist)}</span><span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold uppercase tracking-wider">الحد: {u.pharmacy_limit}</span></div></div></div>
                      <div className="flex gap-2 border-t border-slate-100 pt-4 mt-auto">{!u.is_active && <button onClick={() => approveUser(u.id)} className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 transition-colors text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"><CheckCircle size={14} /> تفعيل الحساب</button>}{u.is_active && canEditTarget && <button onClick={() => { setEditingUser(u); setUserForm({ email: u.email, password: '', role: u.role, name: u.name, pharmacy_limit: u.pharmacy_limit || 10, phone: u.phone || '', notes: u.notes || '' }); setShowUserModal(true); }} className="flex-1 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"><Edit2 size={12} /> {t.editUser}</button>}{canDeleteTarget && <button onClick={() => openConfirm(t.confirmTitle, 'هل أنت متأكد من حذف هذا المستخدم نهائياً؟', async () => { await api.delete(`/api/admin/users/${u.id}`); loadData(); })} className={`${u.is_active && !canEditTarget ? 'flex-1' : 'px-4'} py-2 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2`}><Trash2 size={12} /> {(u.is_active && !canEditTarget) && 'حذف'}</button>}</div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="max-w-2xl">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">{t.profileSettings}</h2><p className="text-sm md:text-base text-slate-500 mb-6 md:mb-8">{t.profileSubtitle}</p>
              <form onSubmit={handleUpdateProfile} className="bg-white p-5 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5 md:space-y-6">
                {profileMsg && <div className={`p-4 rounded-xl text-sm font-bold ${profileMsg.includes('نجاح') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{profileMsg}</div>}
                <div><label className="block text-sm font-medium text-slate-700 mb-2">{t.fullName}</label><input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" value={profileName} onChange={e => setProfileName(e.target.value)} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-2">{t.email}</label><input type="email" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-left" dir="ltr" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-2">{t.phone}</label><input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-2">{t.notes}</label><textarea className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none" rows={3} value={profileNotes} onChange={e => setProfileNotes(e.target.value)} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-2">{t.newPassword}</label><input type="password" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-left" dir="ltr" value={profileNewPassword} onChange={e => setProfileNewPassword(e.target.value)} /></div>
                <div className="pt-4 border-t border-slate-100"><label className="block text-sm font-medium text-slate-700 mb-2">{t.currentPassword}</label><input type="password" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50 text-left" dir="ltr" value={profileCurrentPassword} onChange={e => setProfileCurrentPassword(e.target.value)} /></div>
                <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-colors">{t.saveChanges}</button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl md:text-2xl font-bold mb-6">{editingData ? 'تعديل البيانات والمواعيد' : addButtonText}</h3>
              <form onSubmit={handleSaveFacility} className="space-y-4">
                
                {user.role === 'admin' && (
                  <div><label className="block text-sm font-bold mb-2">نوع المنشأة</label><select className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option value="pharmacy">صيدلية</option><option value="clinic">عيادة طبية</option></select></div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">اسم {form.type === 'clinic' ? 'العيادة' : 'الصيدلية'}</label><input required className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                  
                  {form.type === 'clinic' && (
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">تخصص العيادة / الطبيب</label>
                      <select 
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 mb-2" 
                        value={form.specialty === '' ? '' : SPECIALTIES.includes(form.specialty) ? form.specialty : 'other'} 
                        onChange={e => {
                          if (e.target.value === 'other') setForm({...form, specialty: 'تخصص آخر'});
                          else setForm({...form, specialty: e.target.value});
                        }}
                      >
                        <option value="">اختر التخصص...</option>
                        {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                        <option value="other">أخرى (كتابة يدوية)</option>
                      </select>
                      {(form.specialty && !SPECIALTIES.includes(form.specialty)) && (
                         <input required placeholder="اكتب التخصص هنا..." className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" value={form.specialty === 'تخصص آخر' ? '' : form.specialty} onChange={e => setForm({...form, specialty: e.target.value})} />
                      )}
                    </div>
                  )}

                  <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">العنوان والمكان</label><input required className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">رقم الهاتف للاتصال</label><input required className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">رقم الواتساب (اختياري)</label><input className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" value={form.whatsapp_phone} onChange={e => setForm({...form, whatsapp_phone: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">اسم {form.type === 'clinic' ? 'الطبيب المداوم' : 'الصيدلي المسؤول'}</label><input className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" value={form.pharmacist_name} onChange={e => setForm({...form, pharmacist_name: e.target.value})} /></div>
                  
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">صورة {form.type === 'clinic' ? 'العيادة' : 'الصيدلية'}</label>
                    <div className="flex items-center gap-3">
                      <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${uploadingImage ? 'bg-slate-50 border-slate-300 text-slate-400' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                        {uploadingImage ? <span className="animate-spin h-5 w-5 border-2 border-emerald-500 rounded-full border-t-transparent"></span> : <UploadCloud size={20} />}
                        <span className="font-bold text-sm">{uploadingImage ? 'جاري الرفع...' : 'اضغط لرفع صورة من جهازك'}</span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                      </label>
                      {form.image_url && <img src={form.image_url} alt="preview" className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm" />}
                    </div>
                  </div>
                </div>

                <div className="h-[150px] md:h-[200px] rounded-2xl overflow-hidden border border-slate-200 z-0 relative mt-4">
                  <MapContainer center={[form.latitude || 35.25, form.longitude || 36.7]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                    <LocationPicker onLocationSelect={(lat, lng) => setForm({...form, latitude: lat, longitude: lng})} initialPosition={form.latitude && form.longitude ? [form.latitude, form.longitude] : undefined} />
                    {editingData && <RecenterMap position={[form.latitude || 35.25, form.longitude || 36.7]} />}
                  </MapContainer>
                </div>
                <p className="text-[10px] text-slate-400 text-center -mt-2">انقر على الخريطة لتحديد الموقع بدقة</p>

                <div className="border-t border-slate-200 pt-6 mt-6">
                  <h4 className="font-bold text-lg mb-4 flex items-center gap-2"><Calendar className="text-emerald-500"/> تحديد أوقات الدوام الأسبوعي التلقائي</h4>
                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    {DAYS_OF_WEEK.map((day, idx) => {
                      const dayHours = form.working_hours[idx.toString()] || { isOpen: false, start: '00:00', end: '00:00' };
                      return (
                        <div key={idx} className={`flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-xl border ${dayHours.isOpen ? 'border-emerald-200 shadow-sm' : 'border-slate-200'} transition-all`}>
                          <div className="flex items-center gap-3 w-full sm:w-1/3">
                            <input type="checkbox" className="w-5 h-5 accent-emerald-500 rounded cursor-pointer" checked={dayHours.isOpen} onChange={e => setForm({...form, working_hours: {...form.working_hours, [idx]: {...dayHours, isOpen: e.target.checked}}})} />
                            <span className={`font-bold w-20 ${dayHours.isOpen ? 'text-slate-900' : 'text-slate-400'}`}>{day}</span>
                          </div>
                          {dayHours.isOpen ? (
                            <div className="flex items-center gap-2 w-full sm:w-2/3" dir="ltr">
                              <span className="text-xs font-bold text-slate-400">من</span><input type="time" className="border border-slate-200 px-3 py-2 rounded-lg font-mono text-sm w-full outline-none focus:ring-2 focus:ring-emerald-500" value={dayHours.start} onChange={e => setForm({...form, working_hours: {...form.working_hours, [idx]: {...dayHours, start: e.target.value}}})} />
                              <span className="text-xs font-bold text-slate-400 px-1">إلى</span><input type="time" className="border border-slate-200 px-3 py-2 rounded-lg font-mono text-sm w-full outline-none focus:ring-2 focus:ring-emerald-500" value={dayHours.end} onChange={e => setForm({...form, working_hours: {...form.working_hours, [idx]: {...dayHours, end: e.target.value}}})} />
                            </div>
                          ) : (
                            <div className="w-full sm:w-2/3 text-red-500 font-bold px-4 flex items-center justify-center bg-red-50 py-2 rounded-lg">يوم عطلة - مغلق</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {user.role === 'admin' && (
                  <div className="pt-4 border-t border-slate-200">
                    <label className="block text-sm font-medium mb-1">ربط المنشأة بحساب كادر طبي</label>
                    <select className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" value={form.doctor_id} onChange={e => setForm({...form, doctor_id: parseInt(e.target.value)})}>
                      <option value="0">بدون مالك (غير مرتبط)</option>
                      {users.filter(u => u.role === 'doctor' || u.role === 'pharmacist').map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.role === 'doctor' ? 'طبيب' : 'صيدلي'})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex gap-3 pt-6 border-t border-slate-200"><button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">إلغاء</button><button type="submit" className="flex-1 py-4 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors" disabled={uploadingImage}>حفظ البيانات والمواعيد</button></div>
              </form>
            </motion.div>
          </div>
        )}

        {showUserModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl md:text-2xl font-bold mb-6">{editingUser ? t.editUser : t.createUser}</h3>
              <form onSubmit={handleSaveUser} className="space-y-4">
                <div><label className="block text-sm font-medium mb-1">{t.fullName}</label><input required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} /></div>
                <div><label className="block text-sm font-medium mb-1">{t.email}</label><input type="email" required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-left" dir="ltr" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} /></div>
                <div><label className="block text-sm font-medium mb-1">{t.password} {editingUser && `(اتركها فارغة لعدم التغيير)`}</label><input type="password" required={!editingUser} placeholder={editingUser ? '********' : ''} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-left" dir="ltr" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.role}</label>
                    <select required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as any})}>
                      <option value="pharmacist">{t.pharmacist}</option><option value="doctor">{t.doctor}</option>
                      {(isSuperAdmin || userForm.role === 'admin') && <option value="admin">{t.admin}</option>}
                    </select>
                  </div>
                  <div><label className="block text-sm font-medium mb-1">الحد الأقصى للمنشآت</label><input type="number" required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" value={userForm.pharmacy_limit} onChange={e => setUserForm({...userForm, pharmacy_limit: parseInt(e.target.value)})} /></div>
                </div>
                <div><label className="block text-sm font-medium mb-1">{t.phone}</label><input className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})} /></div>
                <div><label className="block text-sm font-medium mb-1">الملاحظات والاختصاص</label><textarea className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" rows={3} value={userForm.notes} onChange={e => setUserForm({...userForm, notes: e.target.value})} /></div>
                <div className="flex gap-3 pt-4"><button type="button" onClick={() => { setShowUserModal(false); setEditingUser(null); }} className="flex-1 py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">{t.cancel}</button><button type="submit" className="flex-1 py-4 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors">{editingUser ? t.save : t.create}</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ConfirmModal isOpen={confirmData.isOpen} onClose={() => setConfirmData(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmData.onConfirm} title={confirmData.title} body={confirmData.body} t={t} />
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [view, setView] = useState<'public' | 'login' | 'dashboard'>('public');
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [footerData, setFooterData] = useState<FooterSettings | null>(null);
  const t = translations[lang] || translations['ar'];

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    api.get('/api/auth/me')
      .then(data => { setUser(data.user); setView('dashboard'); })
      .catch(() => setView('public'))
      .finally(() => setLoading(false));
      
    api.get('/api/public/settings').then(data => {
      if(Object.keys(data).length > 0) setFooterData(data);
    }).catch(console.error);
  }, []);

  const handleLogin = (u: UserType) => { setUser(u); setView('dashboard'); };
  const handleLogout = async () => { await api.post('/api/auth/logout', {}); setUser(null); setView('public'); };

  if (loading) return null;

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-slate-50">
      {view !== 'dashboard' && (
        <nav className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-40 backdrop-blur-md bg-white/90">
          <button onClick={() => setView('public')} className="text-xl font-bold flex items-center gap-2"><img src="/logo.png" className="w-8 h-8"/> {lang === 'ar' ? 'طيبة الامام الصحية' : 'Taibet El-Imam Health'}</button>
          <div className="flex gap-2 md:gap-4">
            <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-bold border border-slate-200 hover:bg-slate-50 transition-colors">
              {lang === 'ar' ? 'English' : 'العربية'}
            </button>
            <button onClick={() => setView(view === 'public' ? 'login' : 'public')} className="bg-slate-900 text-white px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-bold hover:bg-slate-800 transition-colors">
              {view === 'public' ? t.staffLogin : t.backToPublic}
            </button>
          </div>
        </nav>
      )}
      
      <main className="flex-1">
        {view === 'public' && <PublicView onLogin={() => setView('login')} lang={lang} t={t} />}
        {view === 'login' && <LoginAndRegister onLogin={handleLogin} t={t} lang={lang} />}
        {view === 'dashboard' && user && <Dashboard user={user} onLogout={handleLogout} lang={lang} t={t} />}
      </main>

      {view === 'public' && (
        <footer className="bg-[#0a1128] text-slate-300 py-12 mt-12 w-full text-center">
          <div className="max-w-4xl mx-auto px-4">
            <p className="text-base font-bold mb-3">{footerData?.copyright || '© 2026 نظام صيدليات طيبة الإمام. جميع الحقوق محفوظة.'}</p>
            <p className="text-sm text-slate-400 mb-6">{footerData?.description || 'توفير المعلومات الأساسية عن المناوبات للمجتمع.'}</p>
            
            <div className="flex justify-center items-center gap-6 text-sm flex-wrap">
              {footerData?.contact_phone && <p>📞 {lang==='ar'?'للتواصل':'Contact'}: <span dir="ltr" className="font-mono">{footerData.contact_phone}</span></p>}
              {footerData?.complaints_phone && <p>⚠️ {lang==='ar'?'الشكاوى':'Complaints'}: <span dir="ltr" className="font-mono">{footerData.complaints_phone}</span></p>}
              {footerData?.facebook && <a href={footerData.facebook} target="_blank" className="hover:text-white transition-colors">📘 Facebook</a>}
              {footerData?.instagram && <a href={footerData.instagram} target="_blank" className="hover:text-white transition-colors">📸 Instagram</a>}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}