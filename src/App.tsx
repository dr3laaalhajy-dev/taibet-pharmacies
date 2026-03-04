import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Calendar, MapPin, Phone, 
  User, LogOut, Shield, Settings, Activity,
  Search, Clock, MessageCircle, CheckCircle, Stethoscope, BriefcaseMedical
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
interface Facility { id: number; name: string; type: 'pharmacy' | 'clinic'; address: string; phone: string; latitude: number; longitude: number; doctor_id?: number; pharmacist_name?: string; whatsapp_phone?: string; image_url?: string; working_hours: Record<string, WorkingHours>; }

const SUPER_ADMINS = ['admin@pharmaduty.com', 'alaa@taiba.pharma.sy'];
const DAYS_OF_WEEK = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// دالة لمعرفة هل المنشأة مفتوحة الآن بناءً على اليوم والوقت
const checkIsOpenNow = (workingHours: Record<string, WorkingHours> | undefined) => {
  if (!workingHours) return false;
  const now = new Date();
  const dayIndex = now.getDay().toString();
  const todaySchedule = workingHours[dayIndex];
  
  if (!todaySchedule || !todaySchedule.isOpen) return false;
  
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = todaySchedule.start.split(':').map(Number);
  const [endH, endM] = todaySchedule.end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (endMinutes < startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

// دالة لتحويل وقت (14:00) إلى (02:00 مساءً)
const formatTime12h = (time24: string) => {
  if (!time24) return '';
  const [h, m] = time24.split(':');
  const d = new Date();
  d.setHours(parseInt(h), parseInt(m));
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
};

// --- API Helpers ---
const api = {
  get: (url: string) => fetch(url, { credentials: 'include' }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
  post: (url: string, body: any) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
  put: (url: string, body: any) => fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
  patch: (url: string) => fetch(url, { method: 'PATCH', credentials: 'include' }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
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

  useEffect(() => {
    api.get('/api/public/facilities').then(data => {
      setFacilities(data);
      setLoading(false);
    });
  }, []);

  const filteredData = facilities.filter(f => f.type === activeTab && (f.name.includes(searchQuery) || f.address.includes(searchQuery)));
  const currentlyOpen = filteredData.filter(f => checkIsOpenNow(f.working_hours));

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <header className="mb-16 text-center">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest text-emerald-600 uppercase bg-emerald-50 rounded-full">
          {t.communityHealth}
        </motion.div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
          دليل <span className="text-emerald-500">طيبة الإمام</span> الطبي
        </h1>
        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto font-light leading-relaxed mb-8">{t.searchPlaceholder}</p>
        
        <div className="max-w-xl mx-auto relative group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="ابحث عن صيدلية، عيادة، أو طبيب..."
            className="w-full pr-12 pl-4 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex justify-center gap-4 mt-10 flex-wrap">
          <button onClick={() => setActiveTab('pharmacy')} className={`px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all ${activeTab === 'pharmacy' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}>
            <BriefcaseMedical size={18} /> الصيدليات
          </button>
          <button onClick={() => setActiveTab('clinic')} className={`px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all ${activeTab === 'clinic' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}>
            <Stethoscope size={18} /> العيادات
          </button>
        </div>
      </header>

      <AnimatePresence>
        {selectedDoctorId && <DoctorProfileModal doctorId={selectedDoctorId} onClose={() => setSelectedDoctorId(null)} t={t} />}
      </AnimatePresence>

      <div className="flex flex-col gap-16 mb-16">
        {/* قسم المفتوح الآن */}
        <div className="w-full">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            {activeTab === 'pharmacy' ? 'الصيدليات المناوبة الآن' : 'العيادات المفتوحة الآن'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentlyOpen.length > 0 ? currentlyOpen.map(f => (
              <div key={`open-${f.id}`} className="bg-white p-6 rounded-3xl border-2 border-emerald-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-4 left-4 bg-emerald-50 text-emerald-600 text-[10px] font-bold px-3 py-1 rounded-full animate-pulse">مفتوح الآن</div>
                
                <div className="flex items-center gap-4 mb-4">
                  {f.image_url ? (
                    <img src={f.image_url} alt={f.name} className="w-14 h-14 object-cover rounded-xl shrink-0 shadow-sm border border-slate-100" />
                  ) : (
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-emerald-100">
                      {f.type === 'clinic' ? <Stethoscope size={24} /> : <Activity size={24} />}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 line-clamp-1">{f.name}</h3>
                    {f.pharmacist_name && <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-1"><User size={12} /> {f.pharmacist_name}</span>}
                  </div>
                </div>

                <p className="text-slate-500 text-sm flex items-center gap-2 mb-4"><MapPin size={16} className="shrink-0"/> <span className="truncate">{f.address}</span></p>
                <div className="flex gap-2">
                  <a href={`tel:${f.phone}`} className="flex-1 bg-slate-900 text-white text-center py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"><Phone size={14} className="inline mr-1"/> اتصال</a>
                  {f.whatsapp_phone && <a href={`https://wa.me/${f.whatsapp_phone}`} target="_blank" className="flex-1 bg-emerald-500 text-white text-center py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors"><MessageCircle size={14} className="inline mr-1"/> واتساب</a>}
                </div>
              </div>
            )) : (
              <div className="col-span-full text-center py-12 bg-slate-50 rounded-3xl border border-slate-100 text-slate-500">
                <Clock className="mx-auto text-slate-300 mb-4" size={48} />
                لا يوجد {activeTab === 'pharmacy' ? 'صيدليات' : 'عيادات'} مفتوحة في هذا الوقت بالتحديد.
              </div>
            )}
          </div>
        </div>

        {/* قسم الجدول الأسبوعي */}
        <div className="w-full">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
            <Calendar className="text-indigo-500" /> جدول الدوام الأسبوعي
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredData.map(f => {
              const isOpenNow = checkIsOpenNow(f.working_hours);
              return (
                <div key={`schedule-${f.id}`} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{f.name}</h3>
                      <p className="text-sm text-slate-500 mt-1 flex items-center gap-2"><MapPin size={14}/> {f.address}</p>
                    </div>
                    {isOpenNow ? (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full animate-pulse">مفتوح الآن</span>
                    ) : (
                      <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">مغلق حالياً</span>
                    )}
                  </div>
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {DAYS_OF_WEEK.map((day, idx) => {
                      const daySchedule = f.working_hours && f.working_hours[idx.toString()];
                      const isToday = new Date().getDay() === idx;
                      return (
                        <div key={idx} className={`p-3 rounded-xl border ${isToday ? 'border-indigo-500 bg-indigo-50/30 ring-1 ring-indigo-500' : 'border-slate-100'} flex flex-col items-center justify-center text-center`}>
                          <span className={`text-xs font-bold mb-1 ${isToday ? 'text-indigo-700' : 'text-slate-600'}`}>{day}</span>
                          {daySchedule?.isOpen ? (
                            <span className="text-[10px] text-slate-500 font-mono font-bold" dir="ltr">
                              {formatTime12h(daySchedule.start)} <br/> {formatTime12h(daySchedule.end)}
                            </span>
                          ) : (
                            <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-md mt-1">عطلة</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {f.doctor_id && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                      <button onClick={() => setSelectedDoctorId(f.doctor_id!)} className="w-full flex justify-center items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                        <User size={16} /> عرض بيانات الكادر الطبي
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* الخريطة */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
            <MapPin className="text-emerald-500" /> مواقع {activeTab === 'pharmacy' ? 'الصيدليات' : 'العيادات'}
          </h2>
          <div className="h-[400px] rounded-3xl overflow-hidden shadow-lg border border-slate-200 z-0 relative">
            <MapContainer center={[35.25, 36.7]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {filteredData.map(f => {
                const isOpenNow = checkIsOpenNow(f.working_hours);
                return (
                  <Marker key={`map-${f.id}`} position={[f.latitude || 35.25, f.longitude || 36.7]}>
                    <Popup className="custom-popup">
                      <div className="text-right min-w-[200px]" dir="rtl">
                        <h3 className={`font-bold text-lg ${isOpenNow ? 'text-emerald-600' : 'text-slate-900'}`}>{f.name}</h3>
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

const DoctorProfileModal = ({ doctorId, onClose, t }: { doctorId: number, onClose: () => void, t: any }) => { 
  const [doctor, setDoctor] = useState<(UserType & { facilities: Facility[] }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/public/doctors/${doctorId}`)
      .then(data => setDoctor(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [doctorId]);

  if (!doctorId) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">{loading ? '...' : doctor?.name}</h3>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold uppercase tracking-wider">
              {doctor?.role === 'doctor' ? t.doctor : t.pharmacist}
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0"><Plus className="rotate-45 text-slate-400" size={24} /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div></div>
        ) : doctor ? (
          <div className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="p-6 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3 text-slate-400 mb-2"><Phone size={18} /><span className="text-xs font-bold uppercase tracking-wider">{t.phone}</span></div>
                <p className="text-lg font-mono text-slate-900 truncate">{doctor.phone || '---'}</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3 text-slate-400 mb-2"><Calendar size={18} /><span className="text-xs font-bold uppercase tracking-wider">{t.email}</span></div>
                <p className="text-lg text-slate-900 truncate">{doctor.email}</p>
              </div>
            </div>

            {doctor.notes && (
              <div className="p-6 bg-emerald-50/50 rounded-2xl">
                <h4 className="text-sm font-bold text-emerald-900 uppercase tracking-wider mb-3">الاختصاص والملاحظات</h4>
                <p className="text-emerald-800 leading-relaxed text-sm md:text-base">{doctor.notes}</p>
              </div>
            )}

            <div>
              <h4 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3"><Activity className="text-emerald-500" size={24} /> المنشآت التابعة</h4>
              <div className="grid grid-cols-1 gap-4">
                {doctor.facilities && doctor.facilities.map(p => (
                  <div key={p.id} className="p-4 border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 hover:bg-slate-50 transition-colors">
                    <div>
                      <h5 className="font-bold text-slate-900">{p.name}</h5>
                      <p className="text-xs text-slate-500">{p.address}</p>
                    </div>
                    <div className="sm:text-right"><p className="text-sm font-mono text-slate-600">{p.phone}</p></div>
                  </div>
                ))}
                {(!doctor.facilities || doctor.facilities.length === 0) && <p className="text-center py-8 text-slate-400 italic">لا توجد منشآت مرتبطة بهذا الحساب حالياً.</p>}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center py-12 text-slate-500">حدث خطأ في تحميل البيانات.</p>
        )}
      </motion.div>
    </div>
  );
};

const LoginAndRegister = ({ onLogin, t }: { onLogin: (u: any) => void, t: any }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState(''); const [emailPrefix, setEmailPrefix] = useState(''); 
  const [password, setPassword] = useState(''); const [name, setName] = useState('');
  const [phone, setPhone] = useState(''); const [role, setRole] = useState('pharmacist');
  const [error, setError] = useState(''); const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccessMsg(''); setLoading(true);
    try {
      if (isLogin) {
        const data = await api.post('/api/auth/login', { email, password });
        onLogin(data.user);
      } else {
        await api.post('/api/auth/register', { email: `${emailPrefix}@taiba.pharma.sy`, password, name, phone, role });
        setSuccessMsg('تم إنشاء الحساب بنجاح! يرجى انتظار تفعيل حسابك من قبل الإدارة.'); setIsLogin(true); setPassword(''); setEmailPrefix('');
      }
    } catch (err: any) { setError(err.error || 'حدث خطأ في تسجيل الدخول'); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 w-full">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><Shield size={32} /></div>
          <h2 className="text-3xl font-bold text-slate-900">{isLogin ? t.loginTitle : 'إنشاء حساب كادر طبي'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium">{error}</div>}
          {successMsg && <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-sm font-medium">{successMsg}</div>}
          {!isLogin && (
            <>
              <input required placeholder="الاسم الكامل" className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-emerald-500" value={name} onChange={e => setName(e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <select className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-emerald-500" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="pharmacist">صيدلي</option><option value="doctor">طبيب</option>
                </select>
                <input placeholder="رقم الهاتف" className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-emerald-500" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </>
          )}
          {isLogin ? (
            <input type="email" required placeholder="البريد الإلكتروني" className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-emerald-500 text-left" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} />
          ) : (
            <div className="flex" dir="ltr">
              <input required placeholder="username" className="flex-1 px-4 py-3 rounded-l-xl border border-r-0 border-slate-200 outline-none text-left focus:ring-2 focus:ring-emerald-500" value={emailPrefix} onChange={e => setEmailPrefix(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ''))} />
              <div className="px-3 py-3 bg-slate-50 border border-slate-200 rounded-r-xl text-slate-500 font-mono text-sm">@taiba.pharma.sy</div>
            </div>
          )}
          <input type="password" required placeholder="كلمة المرور" className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-emerald-500 text-left" dir="ltr" value={password} onChange={e => setPassword(e.target.value)} />
          <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-colors mt-2">{loading ? '...' : (isLogin ? 'تسجيل الدخول' : 'إنشاء حساب')}</button>
        </form>
        <div className="mt-6 text-center pt-6 border-t border-slate-100"><button onClick={() => {setIsLogin(!isLogin); setError(''); setSuccessMsg('');}} className="text-emerald-600 font-bold hover:underline">{isLogin ? 'ليس لديك حساب؟ سجل الآن' : 'لدي حساب بالفعل'}</button></div>
      </motion.div>
    </div>
  );
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, body }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, body: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={32} /></div>
        <h3 className="text-2xl font-bold mb-2">{title}</h3><p className="text-slate-500 mb-8">{body}</p>
        <div className="flex gap-3"><button onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-100 font-bold hover:bg-slate-200">إلغاء</button><button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700">تأكيد الحذف</button></div>
      </motion.div>
    </div>
  );
};

const Dashboard = ({ user, onLogout, t }: { user: UserType, onLogout: () => void, t: any }) => {
  const [activeTab, setActiveTab] = useState<'facilities' | 'users' | 'profile'>('facilities');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  
  const dashboardTitle = user.role === 'doctor' ? 'عياداتي ومواعيدي' : (user.role === 'pharmacist' ? 'صيدلياتي ومواعيدي' : 'إدارة المنشآت الطبية');
  const addButtonText = user.role === 'doctor' ? 'إضافة عيادة جديدة' : (user.role === 'pharmacist' ? 'إضافة صيدلية جديدة' : 'إضافة منشأة طبية');

  // إعدادات الملف الشخصي
  const [profileEmail, setProfileEmail] = useState(user.email);
  const [profileName, setProfileName] = useState(user.name);
  const [profilePhone, setProfilePhone] = useState(user.phone || '');
  const [profileNotes, setProfileNotes] = useState(user.notes || '');
  const [profileCurrentPassword, setProfileCurrentPassword] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState('');

  const defaultWorkingHours: Record<string, WorkingHours> = {};
  for(let i=0; i<7; i++) defaultWorkingHours[i.toString()] = { isOpen: true, start: "08:00", end: "22:00" };

  const [showModal, setShowModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingData, setEditingData] = useState<Facility | null>(null);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [form, setForm] = useState<any>({ name: '', address: '', phone: '', type: user.role === 'doctor' ? 'clinic' : 'pharmacy', latitude: 35.25, longitude: 36.7, whatsapp_phone: '', pharmacist_name: '', working_hours: defaultWorkingHours });
  const [userForm, setUserForm] = useState<any>({ email: '', password: '', role: 'pharmacist', name: '', pharmacy_limit: 10, phone: '', notes: '' });

  const [confirmData, setConfirmData] = useState({ isOpen: false, onConfirm: () => {}, title: '', body: '' });

  const loadData = async () => {
    if (activeTab === 'facilities') api.get('/api/pharmacies').then(setFacilities);
    if (activeTab === 'users' && user.role === 'admin') api.get('/api/admin/users').then(setUsers);
  };
  useEffect(() => { loadData(); }, [activeTab]);

  const handleSaveFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingData) await api.put(`/api/pharmacies/${editingData.id}`, form);
      else await api.post('/api/pharmacies', form);
      setShowModal(false); loadData();
    } catch (err) { alert('خطأ في الحفظ'); }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) await api.put(`/api/admin/users/${editingUser.id}`, userForm);
      else await api.post('/api/admin/users', userForm);
      setShowUserModal(false); loadData();
    } catch (err: any) { alert(err.error || 'فشل حفظ المستخدم'); }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/auth/update-profile', { email: profileEmail, name: profileName, currentPassword: profileCurrentPassword, newPassword: profileNewPassword, phone: profilePhone, notes: profileNotes });
      setProfileMsg('تم تحديث الملف الشخصي بنجاح'); setProfileCurrentPassword(''); setProfileNewPassword('');
    } catch (err: any) { setProfileMsg(err.error || 'فشل التحديث'); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row w-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0 md:h-screen sticky top-0 z-20">
        <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2"><img src="/logo.png" className="w-8 h-8"/> {t.appName}</h1>
          <button onClick={onLogout} className="md:hidden p-2 rounded-lg bg-red-50 text-red-600"><LogOut size={18} /></button>
        </div>
        <nav className="flex flex-row md:flex-col gap-2 p-3 md:p-4 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <button onClick={() => setActiveTab('facilities')} className={`px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-bold transition-colors ${activeTab === 'facilities' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}><MapPin size={18}/> {dashboardTitle}</button>
          {user.role === 'admin' && <button onClick={() => setActiveTab('users')} className={`px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-bold transition-colors ${activeTab === 'users' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}><User size={18}/> إدارة المستخدمين</button>}
          <button onClick={() => setActiveTab('profile')} className={`px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-bold transition-colors ${activeTab === 'profile' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}><Settings size={18}/> إعدادات الحساب</button>
        </nav>
        <div className="hidden md:block p-4 border-t border-slate-100 mt-auto">
          <div className="flex items-center gap-3 mb-2"><div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-bold">{user.name[0]}</div><div className="flex-1 truncate"><p className="text-sm font-bold">{user.name}</p><p className="text-xs text-slate-500">{user.role === 'doctor' ? 'طبيب' : (user.role === 'pharmacist' ? 'صيدلي' : 'إدارة')}</p></div></div>
          <button onClick={onLogout} className="w-full py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl flex justify-center gap-2"><LogOut size={18}/> تسجيل الخروج</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'facilities' && (
            <motion.div key="facilities" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <h2 className="text-2xl md:text-3xl font-bold">{dashboardTitle}</h2>
                <button onClick={() => { setEditingData(null); setForm({ name: '', address: '', phone: '', type: user.role === 'doctor' ? 'clinic' : 'pharmacy', latitude: 35.25, longitude: 36.7, whatsapp_phone: '', pharmacist_name: '', working_hours: defaultWorkingHours }); setShowModal(true); }} className="w-full md:w-auto bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 flex items-center justify-center gap-2"><Plus size={20}/> {addButtonText}</button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {facilities.map(f => (
                  <div key={f.id} className="bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${f.type === 'clinic' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>{f.type === 'clinic' ? 'عيادة طبية' : 'صيدلية'}</span>
                        <h3 className="text-xl font-bold mt-2">{f.name}</h3>
                      </div>
                      {checkIsOpenNow(f.working_hours) ? <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-md animate-pulse">مفتوح الآن</span> : <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-md">مغلق حالياً</span>}
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl mt-4 grid grid-cols-7 gap-1 text-center overflow-x-auto">
                      {DAYS_OF_WEEK.map((d, i) => {
                        const h = f.working_hours?.[i.toString()];
                        const isToday = new Date().getDay() === i;
                        return (
                          <div key={i} className={`flex flex-col border border-slate-200 rounded-lg p-1 min-w-[40px] ${isToday ? 'bg-white shadow-sm ring-1 ring-emerald-400' : ''}`}>
                            <span className={`text-[10px] font-bold mb-1 ${isToday ? 'text-emerald-600' : 'text-slate-500'}`}>{d.slice(0,3)}</span>
                            {h?.isOpen ? <div className="text-[9px] font-mono leading-tight">{formatTime12h(h.start)}<br/>{formatTime12h(h.end)}</div> : <span className="text-[9px] text-red-500 mt-1">عطلة</span>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 mt-6">
                      <button onClick={() => { setEditingData(f); setForm({...f}); setShowModal(true); }} className="flex-1 bg-slate-100 hover:bg-slate-200 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"><Edit2 size={16}/> تعديل الإعدادات</button>
                      <button onClick={() => setConfirmData({ isOpen: true, title: 'حذف المنشأة', body: 'هل أنت متأكد من رغبتك في حذف هذا السجل نهائياً؟', onConfirm: () => api.delete(`/api/pharmacies/${f.id}`).then(loadData) })} className="bg-red-50 text-red-600 hover:bg-red-100 px-4 rounded-xl"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
                {facilities.length === 0 && <div className="col-span-full py-12 text-center text-slate-500">لا يوجد بيانات مسجلة حتى الآن.</div>}
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && user.role === 'admin' && (
            <motion.div key="users" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <h2 className="text-2xl md:text-3xl font-bold">إدارة الكادر الطبي</h2>
                <button onClick={() => { setEditingUser(null); setUserForm({ email: '', password: '', role: 'pharmacist', name: '', pharmacy_limit: 10, phone: '', notes: '' }); setShowUserModal(true); }} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"><Plus size={20}/> إضافة حساب جديد</button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {users.map(u => {
                  const isSuperAdmin = SUPER_ADMINS.includes(u.email);
                  const canEdit = !isSuperAdmin || u.email === user.email;
                  return (
                    <div key={u.id} className={`p-6 rounded-3xl border shadow-sm ${u.is_active ? 'bg-white' : 'bg-yellow-50 border-yellow-200'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg">{u.name}</h3>
                          <p className="text-sm text-slate-500" dir="ltr">{u.email}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${isSuperAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{isSuperAdmin ? 'إدارة عليا' : (u.role === 'admin' ? 'مدير' : (u.role === 'doctor' ? 'طبيب' : 'صيدلي'))}</span>
                      </div>
                      <div className="flex gap-2 mt-6">
                        {!u.is_active && <button onClick={() => api.patch(`/api/admin/users/${u.id}/approve`).then(loadData)} className="flex-1 bg-emerald-500 text-white py-2 rounded-xl font-bold text-sm">تفعيل الحساب</button>}
                        {u.is_active && canEdit && <button onClick={() => { setEditingUser(u); setUserForm({...u, password: ''}); setShowUserModal(true); }} className="flex-1 bg-slate-100 py-2 rounded-xl font-bold text-sm">تعديل</button>}
                        {!isSuperAdmin && <button onClick={() => setConfirmData({ isOpen: true, title: 'حذف مستخدم', body: 'سيتم مسح هذا الحساب بشكل نهائي', onConfirm: () => api.delete(`/api/admin/users/${u.id}`).then(loadData) })} className="bg-red-50 text-red-600 px-4 rounded-xl"><Trash2 size={16}/></button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="max-w-2xl">
              <h2 className="text-2xl md:text-3xl font-bold mb-8">إعدادات الحساب</h2>
              <form onSubmit={handleUpdateProfile} className="bg-white p-6 md:p-8 rounded-3xl border shadow-sm space-y-6">
                {profileMsg && <div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold">{profileMsg}</div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-bold mb-2">الاسم</label><input required className="w-full px-4 py-3 border rounded-xl" value={profileName} onChange={e=>setProfileName(e.target.value)} /></div>
                  <div><label className="block text-sm font-bold mb-2">البريد</label><input required className="w-full px-4 py-3 border rounded-xl text-left" dir="ltr" value={profileEmail} onChange={e=>setProfileEmail(e.target.value)} /></div>
                  <div><label className="block text-sm font-bold mb-2">الهاتف</label><input className="w-full px-4 py-3 border rounded-xl" value={profilePhone} onChange={e=>setProfilePhone(e.target.value)} /></div>
                  <div><label className="block text-sm font-bold mb-2">كلمة مرور جديدة (اختياري)</label><input type="password" className="w-full px-4 py-3 border rounded-xl text-left" dir="ltr" value={profileNewPassword} onChange={e=>setProfileNewPassword(e.target.value)} /></div>
                </div>
                <div><label className="block text-sm font-bold mb-2">الاختصاص وملاحظات الطبيب</label><textarea className="w-full px-4 py-3 border rounded-xl" rows={3} value={profileNotes} onChange={e=>setProfileNotes(e.target.value)} /></div>
                <div className="border-t pt-6"><label className="block text-sm font-bold mb-2 text-red-500">كلمة المرور الحالية (مطلوبة للحفظ)</label><input type="password" required className="w-full px-4 py-3 border rounded-xl bg-slate-50 text-left" dir="ltr" value={profileCurrentPassword} onChange={e=>setProfileCurrentPassword(e.target.value)} /></div>
                <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800">حفظ الإعدادات الشخصية</button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold mb-6">{editingData ? 'تعديل البيانات والمواعيد' : addButtonText}</h3>
              <form onSubmit={handleSaveFacility} className="space-y-6">
                {user.role === 'admin' && (
                  <div><label className="block text-sm font-bold mb-2">نوع المنشأة</label><select className="w-full px-4 py-3 border rounded-xl" value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option value="pharmacy">صيدلية</option><option value="clinic">عيادة طبية</option></select></div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-xs text-slate-500 mb-1">الاسم</label><input required className="w-full px-4 py-3 border rounded-xl" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                  <div><label className="block text-xs text-slate-500 mb-1">العنوان</label><input required className="w-full px-4 py-3 border rounded-xl" value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
                  <div><label className="block text-xs text-slate-500 mb-1">رقم الهاتف</label><input required className="w-full px-4 py-3 border rounded-xl" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                  <div><label className="block text-xs text-slate-500 mb-1">واتساب (اختياري)</label><input className="w-full px-4 py-3 border rounded-xl" value={form.whatsapp_phone} onChange={e => setForm({...form, whatsapp_phone: e.target.value})} /></div>
                </div>
                
                <div className="h-[150px] rounded-xl overflow-hidden border z-0 relative">
                  <MapContainer center={[form.latitude || 35.25, form.longitude || 36.7]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationPicker onLocationSelect={(lat, lng) => setForm({...form, latitude: lat, longitude: lng})} initialPosition={form.latitude ? [form.latitude, form.longitude] : undefined} />
                    <RecenterMap position={[form.latitude || 35.25, form.longitude || 36.7]} />
                  </MapContainer>
                </div>
                <p className="text-[10px] text-center text-slate-400 -mt-4">انقر على الخريطة لتحديد الموقع بدقة</p>

                <div className="border-t pt-6">
                  <h4 className="font-bold text-lg mb-4 flex items-center gap-2"><Calendar className="text-emerald-500"/> تحديد أوقات الدوام الأسبوعي التلقائي</h4>
                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    {DAYS_OF_WEEK.map((day, idx) => {
                      const dayHours = form.working_hours[idx.toString()] || { isOpen: false, start: '00:00', end: '00:00' };
                      return (
                        <div key={idx} className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-3 w-full sm:w-1/3">
                            <input type="checkbox" className="w-5 h-5 accent-emerald-500" checked={dayHours.isOpen} onChange={e => setForm({...form, working_hours: {...form.working_hours, [idx]: {...dayHours, isOpen: e.target.checked}}})} />
                            <span className="font-bold w-20">{day}</span>
                          </div>
                          {dayHours.isOpen ? (
                            <div className="flex items-center gap-2 w-full sm:w-2/3" dir="ltr">
                              <input type="time" className="border px-3 py-2 rounded-lg font-mono text-sm w-full" value={dayHours.start} onChange={e => setForm({...form, working_hours: {...form.working_hours, [idx]: {...dayHours, start: e.target.value}}})} />
                              <span className="text-slate-400 font-bold px-2">TO</span>
                              <input type="time" className="border px-3 py-2 rounded-lg font-mono text-sm w-full" value={dayHours.end} onChange={e => setForm({...form, working_hours: {...form.working_hours, [idx]: {...dayHours, end: e.target.value}}})} />
                            </div>
                          ) : (
                            <div className="w-full sm:w-2/3 text-red-500 font-bold px-4">يوم عطلة مغلق</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t"><button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 font-bold rounded-xl">إلغاء</button><button type="submit" className="flex-1 py-4 bg-emerald-600 text-white font-bold rounded-xl">حفظ البيانات والمواعيد</button></div>
              </form>
            </motion.div>
          </div>
        )}

        {showUserModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-lg">
              <h3 className="text-xl md:text-2xl font-bold mb-6">{editingUser ? 'تعديل المستخدم' : 'إضافة حساب جديد'}</h3>
              <form onSubmit={handleSaveUser} className="space-y-4">
                <input required placeholder="الاسم" className="w-full px-4 py-3 border rounded-xl" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} />
                <input type="email" required placeholder="البريد" className="w-full px-4 py-3 border rounded-xl text-left" dir="ltr" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} />
                <input type="password" required={!editingUser} placeholder={editingUser ? 'كلمة المرور (اتركها فارغة لعدم التغيير)' : 'كلمة المرور'} className="w-full px-4 py-3 border rounded-xl text-left" dir="ltr" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <select className="w-full px-4 py-3 border rounded-xl" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})}>
                    <option value="pharmacist">صيدلي</option><option value="doctor">طبيب</option><option value="admin">إدارة</option>
                  </select>
                  <input placeholder="رقم الهاتف" className="w-full px-4 py-3 border rounded-xl" value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})} />
                </div>
                <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowUserModal(false)} className="flex-1 py-3 bg-slate-100 font-bold rounded-xl">إلغاء</button><button type="submit" className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl">حفظ</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ConfirmModal isOpen={confirmData.isOpen} onClose={() => setConfirmData(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmData.onConfirm} title={confirmData.title} body={confirmData.body} />
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [view, setView] = useState<'public' | 'login' | 'dashboard'>('public');
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const t = translations[lang] || translations['ar'];

  useEffect(() => {
    document.documentElement.dir = 'rtl'; document.documentElement.lang = 'ar';
    api.get('/api/auth/me').then(data => { setUser(data.user); setView('dashboard'); }).catch(() => setView('public')).finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  return (
    <div className="min-h-screen font-sans text-slate-900 bg-slate-50">
      {view !== 'dashboard' && (
        <nav className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-40 backdrop-blur-md bg-white/90">
          <button onClick={() => setView('public')} className="text-xl font-bold flex items-center gap-2"><img src="/logo.png" className="w-8 h-8"/> Taibet El-Imam Health</button>
          <button onClick={() => setView(view === 'public' ? 'login' : 'public')} className="bg-slate-900 text-white px-6 py-2 rounded-full font-bold hover:bg-slate-800 transition-colors">{view === 'public' ? 'دخول الكادر الطبي' : 'العودة للرئيسية'}</button>
        </nav>
      )}
      <main>
        {view === 'public' && <PublicView onLogin={() => setView('login')} lang={lang} t={t} />}
        {view === 'login' && <LoginAndRegister onLogin={u => { setUser(u); setView('dashboard'); }} t={t} />}
        {view === 'dashboard' && user && <Dashboard user={user} onLogout={() => { api.post('/api/auth/logout', {}).then(() => { setUser(null); setView('public'); }); }} t={t} />}
      </main>
    </div>
  );
}