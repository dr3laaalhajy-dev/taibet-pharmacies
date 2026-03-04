import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Calendar, MapPin, Phone, 
  User, LogOut, Shield, Settings, Activity,
  Search, Clock, MessageCircle, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserType, Pharmacy, RosterEntry } from './types';
// @ts-ignore
import { translations } from './translations';

// --- استيراد مكتبات الخرائط المجانية (Leaflet) ---
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// إصلاح مشكلة اختفاء أيقونة الدبوس في مكتبة Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// قائمة المدراء الرئيسيين في الواجهة لإخفاء الأزرار
const SUPER_ADMINS = ['admin@pharmaduty.com', 'alaa@taiba.pharma.sy'];

// --- API Helpers ---
const api = {
  get: (url: string) => fetch(url, { credentials: 'include' }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
  post: (url: string, body: any) => fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body)
  }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
  put: (url: string, body: any) => fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body)
  }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
  patch: (url: string, body?: any) => fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined
  }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
  delete: (url: string) => fetch(url, { 
    method: 'DELETE',
    credentials: 'include'
  }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
};

// --- Helper Map Components ---
const LocationPicker = ({ onLocationSelect, initialPosition }: { onLocationSelect: (lat: number, lng: number) => void, initialPosition?: [number, number] }) => {
  const [position, setPosition] = useState<[number, number] | null>(initialPosition || null);
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    }
  });
  return position ? <Marker position={position} /> : null;
};

const RecenterMap = ({ position }: { position: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [position, map]);
  return null;
};

// --- Components ---

const PublicView = ({ onLogin, lang, t }: { onLogin: () => void, lang: 'ar' | 'en', t: any }) => {
  const [onCall, setOnCall] = useState<Pharmacy[]>([]);
  const [allPharmacies, setAllPharmacies] = useState<Pharmacy[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/api/public/on-call'),
      api.get('/api/public/pharmacies'),
      api.get('/api/public/roster?page=1&limit=10')
    ]).then(([onCallData, allPharmaData, rosterData]) => {
      setOnCall(onCallData);
      setAllPharmacies(allPharmaData);
      setRoster(rosterData.data);
      setHasMore(rosterData.data.length < rosterData.total);
      setLoading(false);
    });
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const rosterData = await api.get(`/api/public/roster?page=${nextPage}&limit=10`);
      setRoster(prev => [...prev, ...rosterData.data]);
      setPage(nextPage);
      setHasMore(roster.length + rosterData.data.length < rosterData.total);
    } catch (err) {
      console.error('Failed to load more roster entries', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const filteredOnCall = onCall.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRoster = roster.filter(entry => 
    entry.pharmacy_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    entry.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <header className="mb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest text-emerald-600 uppercase bg-emerald-50 rounded-full"
        >
          {t.communityHealth}
        </motion.div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
          {lang === 'ar' ? (
            <>صيدليات <span className="text-emerald-500">طيبة الإمام</span></>
          ) : (
            <>Taibet El-Imam <span className="text-emerald-500">Pharmacies</span></>
          )}
        </h1>
        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto font-light leading-relaxed mb-8">
          {t.searchPlaceholder}
        </p>
        
        <div className="max-w-xl mx-auto relative group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder={t.searchPlaceholder}
            className="w-full pr-12 pl-4 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <AnimatePresence>
        {selectedDoctorId && (
          <DoctorProfileModal 
            doctorId={selectedDoctorId} 
            onClose={() => setSelectedDoctorId(null)} 
            t={t} 
            lang={lang} 
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-12 md:gap-16 mb-16">
        
        {/* القسم الأول: جدول المناوبون اليوم */}
        <div className="w-full">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {t.onCallToday}
          </h2>
          
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden w-full max-w-[100vw]">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-right min-w-[800px]">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 md:px-8 md:py-6 text-xs font-bold text-slate-400 uppercase tracking-widest">{t.pharmacy}</th>
                    <th className="px-6 py-4 md:px-8 md:py-6 text-xs font-bold text-slate-400 uppercase tracking-widest">{t.location}</th>
                    <th className="px-6 py-4 md:px-8 md:py-6 text-xs font-bold text-slate-400 uppercase tracking-widest">{t.notes || (lang === 'ar' ? 'ملاحظات' : 'Notes')}</th>
                    <th className="px-6 py-4 md:px-8 md:py-6 text-xs font-bold text-slate-400 uppercase tracking-widest">{t.actions || (lang === 'ar' ? 'التواصل' : 'Contact')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOnCall.length > 0 ? filteredOnCall.map((p, idx) => (
                    <motion.tr 
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4 md:px-8 md:py-6">
                        <div className="flex items-center gap-4 whitespace-nowrap">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-12 h-12 md:w-14 md:h-14 object-cover rounded-xl shrink-0 shadow-sm border border-slate-100" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-12 h-12 md:w-14 md:h-14 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-emerald-100">
                              <Activity size={24} />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-bold text-lg text-slate-900 group-hover:text-emerald-600 transition-colors">{p.name}</span>
                            {p.pharmacist_name && (
                              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-1">
                                <User size={12} /> {p.pharmacist_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 md:px-8 md:py-6">
                        <div className="flex items-center gap-2 text-slate-600 text-sm whitespace-nowrap">
                          <MapPin size={16} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[150px] md:max-w-[200px]">{p.address}</span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 md:px-8 md:py-6">
                        <div className="text-sm text-slate-500 italic max-w-[200px] whitespace-normal">
                          {(p as any).notes || <span className="text-slate-300">---</span>}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 md:px-8 md:py-6 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <a 
                            href={`tel:${p.phone}`}
                            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
                          >
                            <Phone size={14} /> <span className="font-mono">{p.phone}</span>
                          </a>
                          {p.whatsapp_phone && (
                            <a 
                              href={`https://wa.me/${p.whatsapp_phone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors shadow-sm"
                            >
                              <MessageCircle size={14} /> {t.whatsappChat}
                            </a>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="p-12 text-center">
                        <Clock className="mx-auto text-slate-300 mb-4" size={48} />
                        <p className="text-slate-500 font-medium">{t.noOnCall}</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* القسم الثاني: الجدول القادم */}
        <div className="w-full">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
            <Calendar className="text-indigo-500" />
            {t.upcomingSchedule}
          </h2>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden w-full max-w-[100vw]">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-right min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 md:px-8 md:py-6 text-xs font-bold text-slate-400 uppercase tracking-widest">{t.date}</th>
                    <th className="px-6 py-4 md:px-8 md:py-6 text-xs font-bold text-slate-400 uppercase tracking-widest">{t.pharmacy}</th>
                    <th className="px-6 py-4 md:px-8 md:py-6 text-xs font-bold text-slate-400 uppercase tracking-widest">{t.location}</th>
                    <th className="px-6 py-4 md:px-8 md:py-6 text-xs font-bold text-slate-400 uppercase tracking-widest">{t.addedBy}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRoster.map((entry, idx) => (
                    <motion.tr 
                      key={idx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4 md:px-8 md:py-6">
                        <div className="flex items-center gap-3 whitespace-nowrap">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                            {new Date(entry.duty_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { day: '2-digit' })}
                          </div>
                          <span className="font-medium text-slate-900">
                            {new Date(entry.duty_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 md:px-8 md:py-6 whitespace-nowrap">
                        <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{entry.pharmacy_name}</span>
                      </td>
                      <td className="px-6 py-4 md:px-8 md:py-6">
                        <div className="flex items-center gap-2 text-slate-500 text-sm whitespace-nowrap">
                          <MapPin size={14} className="shrink-0"/>
                          <span className="truncate max-w-[150px] md:max-w-[200px]">{entry.address}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 md:px-8 md:py-6 whitespace-nowrap">
                        {entry.creator_name ? (
                          <div className="flex flex-col">
                            <button 
                              onClick={() => entry.creator_id && setSelectedDoctorId(entry.creator_id)}
                              className="text-sm font-bold text-emerald-600 hover:underline text-right"
                            >
                              {entry.creator_name}
                            </button>
                            <span className="text-[10px] text-slate-400 font-mono">{entry.creator_phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">---</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div className="p-6 md:p-8 text-center border-t border-slate-100">
                <button 
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? '...' : t.loadMore}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="mt-8 md:mt-16">
        <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
          <MapPin className="text-emerald-500" />
          {t.mapView}
        </h2>
        <div className="h-[300px] md:h-[400px] rounded-3xl overflow-hidden shadow-lg border border-slate-200 z-0 relative">
          <MapContainer 
            center={[35.25, 36.7]} 
            zoom={13} 
            style={{ height: '100%', width: '100%', zIndex: 0 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {allPharmacies.map(p => {
              const isOnCall = onCall.some(oc => oc.id === p.id);
              return (
                <Marker key={`pharma-${p.id}`} position={[p.latitude || 35.25, p.longitude || 36.7]}>
                  <Popup className="custom-popup">
                    <div className="text-right min-w-[200px]" style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
                      {p.image_url && (
                        <img 
                          src={p.image_url} 
                          alt={p.name} 
                          className="w-full h-24 object-cover rounded-xl mb-3" 
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <h3 className={`font-bold text-lg ${isOnCall ? 'text-emerald-600' : 'text-slate-900'}`}>{p.name}</h3>
                      <div className="space-y-1 mt-2">
                        <p className="text-xs text-slate-500 flex items-center gap-2">
                          <MapPin size={12} /> {p.address}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-2">
                          <Phone size={12} /> {p.phone}
                        </p>
                        {p.pharmacist_name && (
                          <p className="text-xs text-emerald-600 font-bold flex items-center gap-2">
                            <User size={12} /> {p.pharmacist_name}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 mt-4">
                        {p.whatsapp_phone && (
                          <a 
                            href={`https://wa.me/${p.whatsapp_phone}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1 bg-emerald-500 text-white p-2 rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold no-underline"
                          >
                            <MessageCircle size={12} /> {t.whatsappChat}
                          </a>
                        )}
                        <a 
                          href={`tel:${p.phone}`}
                          className="flex-1 bg-slate-900 text-white p-2 rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold no-underline"
                        >
                          <Phone size={12} /> {t.callPharmacy}
                        </a>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

// شاشة تسجيل الدخول وإنشاء الحساب
const LoginAndRegister = ({ onLogin, t, lang }: { onLogin: (user: any) => void, t: any, lang: string }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState(''); 
  const [emailPrefix, setEmailPrefix] = useState(''); 
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('pharmacist');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccessMsg(''); setLoading(true);
    try {
      if (isLogin) {
        const data = await api.post('/api/auth/login', { email, password });
        onLogin(data.user);
      } else {
        const fullEmail = `${emailPrefix}@taiba.pharma.sy`;
        await api.post('/api/auth/register', { email: fullEmail, password, name, phone, role });
        setSuccessMsg(lang === 'ar' ? 'تم إنشاء الحساب بنجاح! يرجى انتظار موافقة الإدارة لتفعيل حسابك.' : 'Account created! Please wait for admin approval.');
        setIsLogin(true); 
        setPassword('');
        setEmailPrefix('');
      }
    } catch (err: any) {
      setError(err.error || (isLogin ? t.loginFailed : 'فشل التسجيل. ربما البريد مستخدم مسبقاً.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 w-full">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><Shield size={32} /></div>
          <h2 className="text-3xl font-bold text-slate-900">{isLogin ? t.loginTitle : (lang === 'ar' ? 'إنشاء حساب جديد' : 'Create Account')}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>}
          {successMsg && <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-sm">{successMsg}</div>}
          
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
            </>
          )}

          {isLogin ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.email}</label>
              <input type="email" required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-left" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.email}</label>
              <div className="flex" dir="ltr">
                <input 
                  type="text" 
                  required 
                  placeholder="username"
                  className="flex-1 px-4 py-3 rounded-l-xl border border-r-0 border-slate-200 outline-none text-left focus:ring-2 focus:ring-emerald-500" 
                  value={emailPrefix} 
                  onChange={e => setEmailPrefix(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ''))} 
                />
                <div className="px-3 py-3 bg-slate-50 border border-slate-200 rounded-r-xl text-slate-500 font-mono text-sm flex items-center select-none">
                  @taiba.pharma.sy
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
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md text-center max-h-[90vh] overflow-y-auto"
      >
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trash2 size={32} />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-500 mb-8">{body}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">{t.cancel}</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors">{t.deleteBtn}</button>
        </div>
      </motion.div>
    </div>
  );
};

const DoctorProfileModal = ({ doctorId, onClose, t, lang }: { doctorId: number, onClose: () => void, t: any, lang: string }) => {
  const [doctor, setDoctor] = useState<(UserType & { pharmacies: Pharmacy[] }) | null>(null);
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
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">{loading ? '...' : doctor?.name}</h3>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold uppercase tracking-wider">
              {doctor?.role === 'doctor' ? t.doctor : t.pharmacist}
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0">
            <Plus className="rotate-45 text-slate-400" size={24} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div>
          </div>
        ) : doctor ? (
          <div className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="p-6 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3 text-slate-400 mb-2">
                  <Phone size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">{t.phone}</span>
                </div>
                <p className="text-lg font-mono text-slate-900 truncate">{doctor.phone || '---'}</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3 text-slate-400 mb-2">
                  <Calendar size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">{t.email}</span>
                </div>
                <p className="text-lg text-slate-900 truncate">{doctor.email}</p>
              </div>
            </div>

            {doctor.notes && (
              <div className="p-6 bg-emerald-50/50 rounded-2xl">
                <h4 className="text-sm font-bold text-emerald-900 uppercase tracking-wider mb-3">{t.doctorNotes}</h4>
                <p className="text-emerald-800 leading-relaxed text-sm md:text-base">{doctor.notes}</p>
              </div>
            )}

            <div>
              <h4 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <Activity className="text-emerald-500" size={24} />
                {t.managedPharmacies}
              </h4>
              <div className="grid grid-cols-1 gap-4">
                {doctor.pharmacies.map(p => (
                  <div key={p.id} className="p-4 border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 hover:bg-slate-50 transition-colors">
                    <div>
                      <h5 className="font-bold text-slate-900">{p.name}</h5>
                      <p className="text-xs text-slate-500">{p.address}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-sm font-mono text-slate-600">{p.phone}</p>
                    </div>
                  </div>
                ))}
                {doctor.pharmacies.length === 0 && (
                  <p className="text-center py-8 text-slate-400 italic">No pharmacies assigned yet.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center py-12 text-slate-500">Doctor not found.</p>
        )}
      </motion.div>
    </div>
  );
};

const Dashboard = ({ user, onLogout, lang, t }: { user: UserType, onLogout: () => void, lang: 'ar' | 'en', t: any }) => {
  const [activeTab, setActiveTab] = useState<'pharmacies' | 'roster' | 'users' | 'profile'>('pharmacies');
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [users, setUsers] = useState<any[]>([]); // Using 'any' here since we added 'is_active'
  
  // هل المستخدم الحالي هو أحد المدراء الرئيسيين؟
  const isSuperAdmin = SUPER_ADMINS.includes(user.email);

  // Profile state
  const [profileEmail, setProfileEmail] = useState(user.email);
  const [profileName, setProfileName] = useState(user.name);
  const [profilePhone, setProfilePhone] = useState(user.phone || '');
  const [profileNotes, setProfileNotes] = useState(user.notes || '');
  const [profileCurrentPassword, setProfileCurrentPassword] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState('');

  // Form states
  const [showPharmaModal, setShowPharmaModal] = useState(false);
  const [editingPharma, setEditingPharma] = useState<Pharmacy | null>(null);
  const [pharmaForm, setPharmaForm] = useState({ 
    name: '', 
    address: '', 
    phone: '', 
    doctor_id: 0, 
    latitude: 35.25, 
    longitude: 36.7,
    pharmacist_name: '',
    whatsapp_phone: '',
    image_url: ''
  });

  const [showRosterModal, setShowRosterModal] = useState(false);
  const [editingRoster, setEditingRoster] = useState<RosterEntry | null>(null);
  const [rosterForm, setRosterForm] = useState({ pharmacy_id: 0, duty_date: '', notes: '' });

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [userForm, setUserForm] = useState({ 
    email: '', 
    password: '', 
    role: 'pharmacist' as any, 
    name: '', 
    pharmacy_limit: 10,
    phone: '',
    notes: ''
  });

  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [doctorFilter, setDoctorFilter] = useState<number>(0);

  // Confirmation modal state
  const [confirmData, setConfirmData] = useState<{ isOpen: boolean, onConfirm: () => void, title: string, body: string }>({
    isOpen: false,
    onConfirm: () => {},
    title: '',
    body: ''
  });

  const openConfirm = (title: string, body: string, onConfirm: () => void) => {
    setConfirmData({ isOpen: true, onConfirm, title, body });
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    if (activeTab === 'pharmacies') api.get('/api/pharmacies').then(setPharmacies);
    if (activeTab === 'roster') api.get('/api/roster').then(setRoster);
    if (activeTab === 'users' && user.role === 'admin') api.get('/api/admin/users').then(setUsers);
  };

  const approveUser = async (id: number) => {
    try {
      await api.patch(`/api/admin/users/${id}/approve`);
      setUsers(users.map(u => u.id === id ? { ...u, is_active: true } : u));
    } catch (err) { alert('فشل التفعيل'); }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/auth/update-profile', { 
        email: profileEmail, 
        name: profileName, 
        currentPassword: profileCurrentPassword,
        newPassword: profileNewPassword,
        phone: profilePhone,
        notes: profileNotes
      });
      setProfileMsg(res.verificationRequired ? t.verificationSent : t.profileUpdated);
      setProfileCurrentPassword('');
      setProfileNewPassword('');
    } catch (err: any) {
      setProfileMsg(err.error || 'فشل تحديث الملف الشخصي.');
    }
  };

  const handleSavePharma = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...pharmaForm };
    if (user.role !== 'admin') delete (payload as any).doctor_id;

    try {
      if (editingPharma) {
        await api.put(`/api/pharmacies/${editingPharma.id}`, payload);
      } else {
        await api.post('/api/pharmacies', payload);
      }
      setShowPharmaModal(false);
      setEditingPharma(null);
      setPharmaForm({ 
        name: '', address: '', phone: '', doctor_id: 0, latitude: 35.25, longitude: 36.7, pharmacist_name: '', whatsapp_phone: '', image_url: ''
      });
      loadData();
    } catch (err: any) {
      alert(err.error || 'فشل حفظ الصيدلية');
    }
  };

  const handleSaveRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRoster) {
        await api.put(`/api/roster/${editingRoster.id}`, rosterForm);
      } else {
        await api.post('/api/roster', rosterForm);
      }
      setShowRosterModal(false);
      setEditingRoster(null);
      setRosterForm({ pharmacy_id: 0, duty_date: '', notes: '' });
      loadData();
    } catch (err: any) {
      alert(err.error || 'فشل حفظ المناوبة');
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.put(`/api/admin/users/${editingUser.id}`, userForm);
      } else {
        await api.post('/api/admin/users', userForm);
      }
      setShowUserModal(false);
      setEditingUser(null);
      setUserForm({ 
        email: '', password: '', role: 'pharmacist', name: '', pharmacy_limit: 10, phone: '', notes: ''
      });
      loadData();
    } catch (err: any) {
      alert(err.error || 'فشل حفظ المستخدم');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col md:flex-row w-full overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0 md:sticky md:top-0 md:h-screen z-20">
        <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="text-emerald-500" /> {t.appName}
          </h1>
          <button 
            onClick={onLogout}
            className="md:hidden flex items-center justify-center p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>

        <nav className="flex-none md:flex-1 p-3 md:p-4 flex flex-row md:flex-col gap-2 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('pharmacies')}
            className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'pharmacies' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <MapPin size={18} /> {t.pharmacies}
          </button>
          <button 
            onClick={() => setActiveTab('roster')}
            className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'roster' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Calendar size={18} /> {t.dutyRoster}
          </button>
          {user.role === 'admin' && (
            <button 
              onClick={() => setActiveTab('users')}
              className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <User size={18} /> {t.userManagement}
            </button>
          )}
          <button 
            onClick={() => setActiveTab('profile')}
            className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Settings size={18} /> {t.profileSettings}
          </button>
        </nav>

        <div className="hidden md:block p-4 border-t border-slate-100 mt-auto">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold shrink-0">
              {user.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user.role === 'admin' ? t.admin : user.role === 'doctor' ? t.doctor : t.pharmacist}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} /> {t.logout}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'pharmacies' && (
            <motion.div 
              key="pharmacies"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{t.pharmacies}</h2>
                  <p className="text-sm md:text-base text-slate-500">{t.managePharmacies}</p>
                </div>
                <div className="flex flex-wrap gap-2 md:gap-4 w-full sm:w-auto">
                  {user.role === 'admin' && (
                    <select 
                      className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      value={doctorFilter}
                      onChange={e => setDoctorFilter(parseInt(e.target.value))}
                    >
                      <option value="0">{t.allDoctors}</option>
                      {users.filter(u => u.role === 'doctor' || u.role === 'pharmacist').map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  )}
                  {(user.role === 'admin' || user.role === 'doctor' || user.role === 'pharmacist') && (
                    <button 
                      onClick={() => { setEditingPharma(null); setPharmaForm({ name: '', address: '', phone: '', doctor_id: 0, latitude: 35.25, longitude: 36.7, pharmacist_name: '', whatsapp_phone: '', image_url: '' }); setShowPharmaModal(true); }}
                      className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-slate-900 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors"
                    >
                      <Plus size={20} /> {t.addPharmacy}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                {pharmacies.filter(p => doctorFilter === 0 || p.doctor_id === doctorFilter).map(p => {
                  const isOnCall = roster.some(r => r.pharmacy_id === p.id && r.duty_date === new Date().toISOString().split('T')[0]);
                  return (
                    <div key={p.id} className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg md:text-xl font-bold text-slate-900 line-clamp-1">{p.name}</h3>
                        {isOnCall && (
                          <span className="shrink-0 px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold uppercase tracking-wider animate-pulse ml-2">
                            {t.onCall}
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 text-slate-600 mb-6">
                        <p className="flex items-center gap-2 text-sm"><MapPin size={14} className="shrink-0"/> <span className="truncate">{p.address}</span></p>
                        <p className="flex items-center gap-2 text-sm"><Phone size={14} className="shrink-0"/> <span className="truncate">{p.phone}</span></p>
                        <div className="flex items-center gap-2 text-sm">
                          <User size={14} className="shrink-0"/>
                          <button 
                            onClick={() => p.doctor_id && setSelectedDoctorId(p.doctor_id)}
                            className="text-emerald-600 hover:underline font-medium truncate"
                          >
                            {users.find(u => u.id === p.doctor_id)?.name || t.unassigned}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{p.latitude}, {p.longitude}</p>
                      </div>
                      {p.whatsapp_phone && (
                        <a 
                          href={`https://wa.me/${p.whatsapp_phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mb-4 w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
                        >
                          <MessageCircle size={14} /> {t.whatsappChat}
                        </a>
                      )}
                      {(user.role === 'admin' || ((user.role === 'doctor' || user.role === 'pharmacist') && p.doctor_id === user.id)) && (
                        <div className="flex gap-2 border-t border-slate-100 pt-4">
                          <button 
                            onClick={() => { setEditingPharma(p); setPharmaForm({ name: p.name, address: p.address, phone: p.phone, doctor_id: p.doctor_id || 0, latitude: p.latitude || 35.25, longitude: p.longitude || 36.7, pharmacist_name: p.pharmacist_name || '', whatsapp_phone: p.whatsapp_phone || '', image_url: p.image_url || '' }); setShowPharmaModal(true); }}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            <Edit2 size={14} /> {t.edit}
                          </button>
                          <button 
                            onClick={() => openConfirm(t.confirmTitle, t.confirmBody, async () => { await api.delete(`/api/pharmacies/${p.id}`); loadData(); })}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={14} /> {t.delete}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'roster' && (
            <motion.div 
              key="roster"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{t.dutyRoster}</h2>
                  <p className="text-sm md:text-base text-slate-500">{t.scheduleDuties}</p>
                </div>
                {(user.role === 'admin' || user.role === 'doctor' || user.role === 'pharmacist') && (
                  <button 
                    onClick={() => { setEditingRoster(null); setRosterForm({ pharmacy_id: 0, duty_date: '', notes: '' }); setShowRosterModal(true); }}
                    className="w-full sm:w-auto flex justify-center items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors"
                  >
                    <Plus size={20} /> {t.newAssignment}
                  </button>
                )}
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm w-full">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-right min-w-[600px]">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t.date}</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t.pharmacy}</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t.notes}</th>
                        {(user.role === 'admin' || user.role === 'doctor' || user.role === 'pharmacist') && <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t.actions}</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {roster.map(entry => (
                        <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4 font-mono text-sm text-slate-600 whitespace-nowrap">{entry.duty_date}</td>
                          <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{entry.pharmacy_name}</td>
                          <td className="px-6 py-4 text-slate-500 text-sm italic whitespace-nowrap">{entry.notes || '-'}</td>
                          {(user.role === 'admin' || user.role === 'doctor' || user.role === 'pharmacist') && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => openConfirm(t.confirmEditTitle, t.confirmEditBody, () => { setEditingRoster(entry); setRosterForm({ pharmacy_id: entry.pharmacy_id, duty_date: entry.duty_date, notes: entry.notes || '' }); setShowRosterModal(true); })}
                                  className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button 
                                  onClick={() => openConfirm(t.confirmTitle, t.confirmBody, async () => { await api.delete(`/api/roster/${entry.id}`); loadData(); })}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && user.role === 'admin' && (
            <motion.div 
              key="users"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{t.userManagement}</h2>
                  <p className="text-sm md:text-base text-slate-500">{t.manageStaff}</p>
                </div>
                <button 
                  onClick={() => setShowUserModal(true)}
                  className="w-full sm:w-auto flex justify-center items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors"
                >
                  <Plus size={20} /> {t.createUser}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {users.map(u => {
                  const isTargetSuperAdmin = SUPER_ADMINS.includes(u.email);
                  const canEditTarget = !isTargetSuperAdmin || u.email === user.email; // يمكنه تعديل الكل ما عدا المدراء الرئيسيين (إلا لو كان هو نفسه)
                  const canDeleteTarget = !isTargetSuperAdmin; // لا أحد يستطيع حذف المدراء الرئيسيين
                  
                  return (
                    <div key={u.id} className={`p-5 md:p-6 rounded-2xl border shadow-sm flex flex-col gap-4 ${!u.is_active ? 'bg-yellow-50/50 border-yellow-200' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 font-bold text-xl shrink-0">
                          {u.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <button 
                              onClick={() => setSelectedDoctorId(u.id)}
                              className="font-bold text-slate-900 truncate hover:text-emerald-600 transition-colors text-left text-base md:text-lg"
                            >
                              {u.name}
                            </button>
                            {!u.is_active && <span className="shrink-0 px-2 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full mr-2">{lang === 'ar' ? 'بانتظار التفعيل' : 'Pending'}</span>}
                          </div>
                          <p className="text-xs md:text-sm text-slate-500 truncate mt-1" dir="ltr">{u.email}</p>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isTargetSuperAdmin ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                              {isTargetSuperAdmin ? 'Super Admin' : (u.role === 'admin' ? t.admin : u.role === 'doctor' ? t.doctor : t.pharmacist)}
                            </span>
                            <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold uppercase tracking-wider">
                              {t.pharmacyLimit}: {u.pharmacy_limit}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 border-t border-slate-100 pt-4 mt-auto">
                        {!u.is_active && (
                          <button 
                            onClick={() => approveUser(u.id)} 
                            className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 transition-colors text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                          >
                            <CheckCircle size={14} /> {lang === 'ar' ? 'تفعيل الحساب' : 'Approve'}
                          </button>
                        )}
                        
                        {u.is_active && canEditTarget && (
                          <button 
                            onClick={() => { setEditingUser(u); setUserForm({ email: u.email, password: '', role: u.role, name: u.name, pharmacy_limit: u.pharmacy_limit || 10, phone: u.phone || '', notes: u.notes || '' }); setShowUserModal(true); }}
                            className="flex-1 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                          >
                            <Edit2 size={12} /> {t.editUser}
                          </button>
                        )}

                        {canDeleteTarget && (
                          <button 
                            onClick={() => openConfirm(t.confirmTitle, t.confirmDeleteUser, async () => { await api.delete(`/api/admin/users/${u.id}`); loadData(); })}
                            className={`${u.is_active && !canEditTarget ? 'flex-1' : 'px-4'} py-2 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2`}
                          >
                            <Trash2 size={12} /> {(u.is_active && !canEditTarget) && t.deleteUser}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-2xl"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">{t.profileSettings}</h2>
              <p className="text-sm md:text-base text-slate-500 mb-6 md:mb-8">{t.profileSubtitle}</p>

              <form onSubmit={handleUpdateProfile} className="bg-white p-5 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5 md:space-y-6">
                {profileMsg && <div className={`p-4 rounded-xl text-sm ${profileMsg.includes('verified') || profileMsg.includes('updated') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{profileMsg}</div>}
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t.fullName}</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t.email}</label>
                  <input 
                    type="email" 
                    required 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-left"
                    dir="ltr"
                    value={profileEmail}
                    onChange={e => setProfileEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t.phone}</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={profilePhone}
                    onChange={e => setProfilePhone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t.notes}</label>
                  <textarea 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    rows={3}
                    value={profileNotes}
                    onChange={e => setProfileNotes(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t.newPassword}</label>
                  <input 
                    type="password" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-left"
                    dir="ltr"
                    value={profileNewPassword}
                    onChange={e => setProfileNewPassword(e.target.value)}
                  />
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t.currentPassword}</label>
                  <input 
                    type="password" 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50 text-left"
                    dir="ltr"
                    value={profileCurrentPassword}
                    onChange={e => setProfileCurrentPassword(e.target.value)}
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-colors"
                >
                  {t.saveChanges}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedDoctorId && (
          <DoctorProfileModal 
            doctorId={selectedDoctorId} 
            onClose={() => setSelectedDoctorId(null)} 
            t={t} 
            lang={lang} 
          />
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showPharmaModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl md:text-2xl font-bold mb-6">{editingPharma ? t.editPharmacy : t.addPharmacy}</h3>
              <form onSubmit={handleSavePharma} className="space-y-4">
                <div className="h-[150px] md:h-[200px] rounded-2xl overflow-hidden border border-slate-200 z-0 relative">
                  <MapContainer 
                    center={[pharmaForm.latitude || 35.25, pharmaForm.longitude || 36.7]} 
                    zoom={13} 
                    style={{ height: '100%', width: '100%', zIndex: 0 }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                    <LocationPicker 
                      onLocationSelect={(lat, lng) => setPharmaForm({...pharmaForm, latitude: lat, longitude: lng})} 
                      initialPosition={pharmaForm.latitude && pharmaForm.longitude ? [pharmaForm.latitude, pharmaForm.longitude] : undefined}
                    />
                    {editingPharma && <RecenterMap position={[pharmaForm.latitude || 35.25, pharmaForm.longitude || 36.7]} />}
                  </MapContainer>
                </div>
                <p className="text-[10px] text-slate-400 text-center">{t.clickToSetLocation}</p>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t.pharmacy}</label>
                  <input 
                    required 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200"
                    value={pharmaForm.name}
                    onChange={e => setPharmaForm({...pharmaForm, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t.location}</label>
                  <input 
                    required 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200"
                    value={pharmaForm.address}
                    onChange={e => setPharmaForm({...pharmaForm, address: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t.phone}</label>
                  <input 
                    required 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200"
                    value={pharmaForm.phone}
                    onChange={e => setPharmaForm({...pharmaForm, phone: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.pharmacistName}</label>
                    <input 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200"
                      value={pharmaForm.pharmacist_name}
                      onChange={e => setPharmaForm({...pharmaForm, pharmacist_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.whatsapp}</label>
                    <input 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200"
                      value={pharmaForm.whatsapp_phone}
                      onChange={e => setPharmaForm({...pharmaForm, whatsapp_phone: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t.pharmacyPhoto}</label>
                  <input 
                    type="url"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200"
                    placeholder="https://..."
                    value={pharmaForm.image_url}
                    onChange={e => setPharmaForm({...pharmaForm, image_url: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.latitude}</label>
                    <input 
                      type="number"
                      step="any"
                      required 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200"
                      value={pharmaForm.latitude}
                      onChange={e => setPharmaForm({...pharmaForm, latitude: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.longitude}</label>
                    <input 
                      type="number"
                      step="any"
                      required 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200"
                      value={pharmaForm.longitude}
                      onChange={e => setPharmaForm({...pharmaForm, longitude: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                {user.role === 'admin' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.assignDoctor}</label>
                    <select 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200"
                      value={pharmaForm.doctor_id}
                      onChange={e => setPharmaForm({...pharmaForm, doctor_id: parseInt(e.target.value)})}
                    >
                      <option value="0">{t.unassigned}</option>
                      {users.filter(u => u.role === 'doctor').map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowPharmaModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100">{t.cancel}</button>
                  <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800">{t.save}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showRosterModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl md:text-2xl font-bold mb-6">{editingRoster ? t.editAssignment : t.newAssignment}</h3>
              <form onSubmit={handleSaveRoster} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t.selectPharmacy}</label>
                  <select 
                    required 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200"
                    value={rosterForm.pharmacy_id}
                    onChange={e => setRosterForm({...rosterForm, pharmacy_id: parseInt(e.target.value)})}
                  >
                    <option value="">{t.selectPharmacy}...</option>
                    {pharmacies.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t.dutyDate}</label>
                  <input 
                    type="date"
                    required 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200"
                    value={rosterForm.duty_date}
                    onChange={e => setRosterForm({...rosterForm, duty_date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t.notes}</label>
                  <input 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200"
                    value={rosterForm.notes}
                    onChange={e => setRosterForm({...rosterForm, notes: e.target.value})}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => { setShowRosterModal(false); setEditingRoster(null); }} className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100">{t.cancel}</button>
                  <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800">{editingRoster ? t.save : t.newAssignment}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showUserModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl md:text-2xl font-bold mb-6">{editingUser ? t.editUser : t.createUser}</h3>
              <form onSubmit={handleSaveUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t.fullName}</label>
                  <input 
                    required 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200"
                    value={userForm.name}
                    onChange={e => setUserForm({...userForm, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t.email}</label>
                  <input 
                    type="email"
                    required 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-left"
                    dir="ltr"
                    value={userForm.email}
                    onChange={e => setUserForm({...userForm, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t.password} {editingUser && `(${t.newPassword})`}</label>
                  <input 
                    type="password"
                    required={!editingUser}
                    placeholder={editingUser ? '********' : ''}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-left"
                    dir="ltr"
                    value={userForm.password}
                    onChange={e => setUserForm({...userForm, password: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.role}</label>
                    <select 
                      required 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200"
                      value={userForm.role}
                      onChange={e => setUserForm({...userForm, role: e.target.value as any})}
                    >
                      <option value="pharmacist">{t.pharmacist}</option>
                      <option value="doctor">{t.doctor}</option>
                      {/* المدير الفرعي لن يرى خيار إضافة مدير جديد */}
                      {(isSuperAdmin || userForm.role === 'admin') && (
                        <option value="admin">{t.admin}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.pharmacyLimit}</label>
                    <input 
                      type="number"
                      required 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200"
                      value={userForm.pharmacy_limit}
                      onChange={e => setUserForm({...userForm, pharmacy_limit: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t.phone}</label>
                  <input 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200"
                    value={userForm.phone}
                    onChange={e => setUserForm({...userForm, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t.notes}</label>
                  <textarea 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200"
                    rows={3}
                    value={userForm.notes}
                    onChange={e => setUserForm({...userForm, notes: e.target.value})}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => { setShowUserModal(false); setEditingUser(null); }} className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100">{t.cancel}</button>
                  <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800">{editingUser ? t.save : t.create}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ConfirmModal 
        isOpen={confirmData.isOpen}
        onClose={() => setConfirmData(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmData.onConfirm}
        title={confirmData.title}
        body={confirmData.body}
        t={t}
      />
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [view, setView] = useState<'public' | 'login' | 'dashboard'>('public');
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');

  const t = translations[lang];

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    api.get('/api/auth/me')
      .then(data => {
        setUser(data.user);
        setView('dashboard');
      })
      .catch(() => setView('public'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = (u: UserType) => {
    setUser(u);
    setView('dashboard');
  };

  const handleLogout = async () => {
    await api.post('/api/auth/logout', {});
    setUser(null);
    setView('public');
  };

  if (loading) return null;

  return (
    <div className="min-h-screen font-sans text-slate-900">
      {/* Navigation Bar (Public/Login) */}
      {view !== 'dashboard' && (
        <nav className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 z-40 backdrop-blur-md bg-white/80">
          <button onClick={() => setView('public')} className="text-xl font-bold flex items-center gap-2">
            <Activity className="text-emerald-500" /> {t.appName}
          </button>
          <div className="flex gap-2 md:gap-4">
            <button 
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-bold border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              {lang === 'ar' ? 'English' : 'العربية'}
            </button>
            {view === 'public' ? (
              <button 
                onClick={() => setView('login')}
                className="bg-slate-900 text-white px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-bold hover:bg-slate-800 transition-colors"
              >
                {t.staffLogin}
              </button>
            ) : (
              <button 
                onClick={() => setView('public')}
                className="text-slate-600 px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-bold hover:bg-slate-50 transition-colors"
              >
                {t.backToPublic}
              </button>
            )}
          </div>
        </nav>
      )}

      <main>
        {view === 'public' && <PublicView onLogin={() => setView('login')} lang={lang} t={t} />}
        {view === 'login' && <LoginAndRegister onLogin={handleLogin} t={t} lang={lang} />}
        {view === 'dashboard' && user && <Dashboard user={user} onLogout={handleLogout} lang={lang} t={t} />}
      </main>

      {/* Footer (Public only) */}
      {view === 'public' && (
        <footer className="bg-slate-900 text-slate-400 py-12 text-center">
          <p className="text-sm">{t.copyright}</p>
          <p className="text-xs mt-2">{t.footerNote}</p>
        </footer>
      )}
    </div>
  );
}