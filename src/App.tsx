import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Calendar, MapPin, Phone, 
  User, LogOut, Shield, Settings, Activity,
  Search, Clock, MessageCircle, CheckCircle, Stethoscope, BriefcaseMedical, Layout, UploadCloud,
  ShoppingCart, Store, Package, ShoppingBag, ArrowRight, Minus, XCircle, FileText, Smile, Star, Wallet, Banknote
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore
import { translations } from './translations';

import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 🟢 --- الاستدعاءات الجديدة (Imports) --- 🟢
import { UserType, WorkingHours, Facility, Product, CartItem, Order, FooterSettings, SUPER_ADMINS, DAYS_OF_WEEK_AR, DAYS_OF_WEEK_EN, SPECIALTIES } from './types';
import { api, uploadImageToImgBB } from './api';
import { ProductsManager } from './Components/ProductsManager';
import { OrdersManager } from './Components/OrdersManager';
import { ServicesManager } from './Components/ServicesManager';
// ------------------------------------------------

// إعدادات أيقونة الخريطة
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png', iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png' });

// دوال مساعدة هامة (يجب أن تبقى هنا)
const checkIsOpenNow = (f: Facility) => {
  if (f.manual_status === 'open') return true; if (f.manual_status === 'closed') return false;
  if (!f.working_hours) return false; const todaySchedule = f.working_hours[new Date().getDay().toString()];
  if (!todaySchedule || !todaySchedule.isOpen) return false;
  const currentMins = new Date().getHours() * 60 + new Date().getMinutes();
  const [sH, sM] = todaySchedule.start.split(':').map(Number); const [eH, eM] = todaySchedule.end.split(':').map(Number);
  if ((eH * 60 + eM) < (sH * 60 + sM)) return currentMins >= (sH * 60 + sM) || currentMins <= (eH * 60 + eM);
  return currentMins >= (sH * 60 + sM) && currentMins <= (eH * 60 + eM);
};

const formatTime12h = (t: string, lang: string = 'ar') => { if (!t) return ''; const [h, m] = t.split(':'); const d = new Date(); d.setHours(parseInt(h), parseInt(m)); return d.toLocaleTimeString(lang === 'en' ? 'en-US' : 'ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }); };
const getDistanceKm = (l1: number, ln1: number, l2: number, ln2: number) => { const R = 6371; const dLat = (l2 - l1) * Math.PI / 180; const dLon = (ln2 - ln1) * Math.PI / 180; const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(l1 * Math.PI / 180) * Math.cos(l2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2); return (R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(1); };

const LocationPicker = ({ onLocationSelect, initialPosition }: any) => { const [p, setP] = useState<any>(initialPosition || null); useMapEvents({ click(e) { setP([e.latlng.lat, e.latlng.lng]); onLocationSelect(e.latlng.lat, e.latlng.lng); } }); return p ? <Marker position={p} /> : null; };
const RecenterMap = ({ position }: any) => { const m = useMap(); useEffect(() => { m.setView(position, m.getZoom()); }, [position, m]); return null; };

// --- 1. Doctor Profile Modal (Vezeeta Style) ---
const DoctorProfileModal = ({ doctorId, onClose, t, lang }: { doctorId: number, onClose: () => void, t: any, lang: string }) => {
  const [doctor, setDoctor] = useState<(UserType & { facilities: Facility[] }) | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { api.get(`/api/public/doctors/${doctorId}`).then(setDoctor).catch(console.error).finally(() => setLoading(false)); }, [doctorId]);
  if (!doctorId) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="bg-white p-4 border-b flex justify-between items-center sticky top-0 z-10">
          <h3 className="text-xl font-bold text-slate-900">{lang === 'ar' ? 'الملف الشخصي والحجز' : 'Profile & Booking'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><XCircle size={24} className="text-slate-400" /></button>
        </div>
        
        {loading ? (<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-600"></div></div>) : doctor ? (
          <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-4xl font-bold shrink-0 shadow-sm">
                  {doctor.facilities[0]?.image_url ? <img src={doctor.facilities[0].image_url} className="w-full h-full rounded-full object-cover"/> : doctor.name[0]}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-extrabold text-slate-900 mb-1">{lang === 'ar' ? 'دكتور' : 'Dr.'} {doctor.name}</h2>
                  <p className="text-blue-600 font-bold mb-3">{doctor.role === 'dentist' ? (lang === 'ar'?'طبيب أسنان':'Dentist') : (doctor.facilities[0]?.specialty || t.doctor)}</p>
                  
                  <div className="flex items-center gap-1 text-yellow-400 mb-4">
                    <Star size={16} fill="currentColor"/> <Star size={16} fill="currentColor"/> <Star size={16} fill="currentColor"/> <Star size={16} fill="currentColor"/> <Star size={16} fill="currentColor"/>
                    <span className="text-xs text-slate-400 ml-2">{lang === 'ar' ? 'تقييم ممتاز' : 'Excellent'}</span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative">
                    <MessageCircle className="absolute top-3 right-3 text-slate-200" size={30}/>
                    <p className="text-slate-600 font-medium italic z-10 relative">"{lang === 'ar' ? 'طبيب متفهم ومستمع جيد، تشخيص دقيق وعلاج فعال.' : 'Great listener and provides accurate diagnosis.'}"</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><User className="text-blue-500"/> {lang === 'ar' ? 'معلومات عن الطبيب' : 'About Doctor'}</h4>
                <p className="text-slate-600 leading-relaxed mb-6">{doctor.notes || (lang === 'ar' ? 'لا توجد نبذة تعريفية حالياً.' : 'No bio available.')}</p>
                
                <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Stethoscope className="text-blue-500"/> {lang === 'ar' ? 'الأعراض والخدمات' : 'Services & Symptoms'}</h4>
                <div className="flex flex-wrap gap-2">
                  {doctor.facilities[0]?.services ? (
                    doctor.facilities[0].services.split(/[\n,]+/).map((s, i) => s.trim() && <span key={i} className="px-4 py-2 bg-blue-50 text-blue-700 font-bold text-sm rounded-lg border border-blue-100">{s.trim()}</span>)
                  ) : (
                    <span className="text-sm text-slate-400">{lang === 'ar' ? 'لم يقم الطبيب بإضافة الخدمات بعد.' : 'No services listed.'}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-blue-200 shadow-lg overflow-hidden sticky top-6">
                <div className="bg-blue-600 text-white text-center py-3 font-bold">{lang === 'ar' ? 'معلومات الحجز' : 'Booking Info'}</div>
                <div className="p-5">
                  <div className="flex justify-between items-center text-center border-b border-slate-100 pb-4 mb-4">
                    <div><Activity className="mx-auto text-emerald-500 mb-1"/><span className="block text-xs text-slate-400 mb-1">{lang === 'ar' ? 'الكشف' : 'Fees'}</span><span className="font-bold text-slate-800">{doctor.facilities[0]?.consultation_fee || 0} {lang==='ar'?'ل.س':'L.S'}</span></div>
                    <div className="border-r border-slate-100 h-10"></div>
                    <div><Clock className="mx-auto text-orange-500 mb-1"/><span className="block text-xs text-slate-400 mb-1">{lang === 'ar' ? 'مدة الانتظار' : 'Wait Time'}</span><span className="font-bold text-slate-800">{doctor.facilities[0]?.waiting_time || '15 دقيقة'}</span></div>
                  </div>
                  
                  <div className="mb-6">
                    <p className="text-sm text-slate-700 flex items-start gap-2 leading-tight">
                      <MapPin className="text-red-500 shrink-0 mt-1" size={18}/>
                      <span><span className="font-bold block mb-1">{doctor.facilities[0]?.name}</span>{doctor.facilities[0]?.address}</span>
                    </p>
                  </div>

                  <h5 className="text-center font-bold text-slate-900 mb-3">{lang === 'ar' ? 'مواعيد العمل:' : 'Working Hours:'}</h5>
                  <div className="bg-slate-50 rounded-xl p-3 mb-6 space-y-2 max-h-[150px] overflow-y-auto text-sm text-center">
                    {(lang === 'en' ? DAYS_OF_WEEK_EN : DAYS_OF_WEEK_AR).map((day, idx) => {
                      const daySchedule = doctor.facilities[0]?.working_hours?.[idx.toString()];
                      if(!daySchedule?.isOpen) return null;
                      return <div key={idx} className="flex justify-between border-b last:border-0 pb-1"><span className="font-bold">{day}</span><span dir="ltr" className="text-blue-700">{formatTime12h(daySchedule.start, lang)} - {formatTime12h(daySchedule.end, lang)}</span></div>
                    })}
                  </div>

                  <a href={`https://wa.me/${doctor.facilities[0]?.whatsapp_phone}?text=مرحباً، أريد حجز موعد في العيادة.`} target="_blank" className="block w-full bg-red-600 text-white text-center py-4 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-md">
                    {lang === 'ar' ? 'احجز الآن عبر الواتساب' : 'Book via WhatsApp'}
                  </a>
                  <p className="text-center text-[10px] text-slate-400 mt-3">{lang === 'ar' ? 'الحجز مسبقاً والدخول بأسبقية الحضور' : 'Pre-booking required. First come first serve.'}</p>
                </div>
              </div>
            </div>

          </div>
        ) : (<p className="text-center py-12 text-slate-500">حدث خطأ.</p>)}
      </motion.div>
    </div>
  );
};


// 2. --- Public Shopping View with Cart (Updated with Wallet) ---
const PublicShopView = ({ onBack, facilities, lang, user, refreshUser }: { onBack: () => void, facilities: Facility[], lang: string, user: UserType | null, refreshUser: () => void }) => {
  const [products, setProducts] = useState<Product[]>([]); const [searchQuery, setSearchQuery] = useState(''); const [selectedPharmacyId, setSelectedPharmacyId] = useState<number | null>(null); const [loading, setLoading] = useState(true); const [cart, setCart] = useState<CartItem[]>([]); const [showCart, setShowCart] = useState(false); const [customerName, setCustomerName] = useState(''); const [customerPhone, setCustomerPhone] = useState(''); const [orderSuccess, setOrderSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet'>('cash');

  useEffect(() => { api.get('/api/public/products').then(setProducts).finally(() => setLoading(false)); }, []);
  const ecommercePharmacies = facilities.filter(f => f.is_ecommerce_enabled); const selectedPharmacy = facilities.find(f => f.id === selectedPharmacyId);
  useEffect(() => { setCart([]); setOrderSuccess(false); }, [selectedPharmacyId]);
  const filteredProducts = products.filter(p => { const matchSearch = p.name.includes(searchQuery) || (p.pharmacy_name?.includes(searchQuery) && !selectedPharmacyId); const matchPharmacy = selectedPharmacyId ? p.pharmacy_id === selectedPharmacyId : true; return matchSearch && matchPharmacy; });
  
  const addToCart = (p: Product) => { setCart(prev => { const exists = prev.find(item => item.product_id === p.id); const limit = p.max_per_user || p.quantity; if (exists) { if (exists.qty >= limit || exists.qty >= p.quantity) return prev; return prev.map(item => item.product_id === p.id ? { ...item, qty: item.qty + 1 } : item); } return [...prev, { ...p, product_id: p.id, qty: 1 }]; }); };
  const removeFromCart = (id: number) => setCart(prev => prev.filter(item => item.product_id !== id));
  const updateQty = (id: number, delta: number, maxAllowed: number, totalStock: number) => { setCart(prev => prev.map(item => { if (item.product_id === id) { const newQty = item.qty + delta; if (newQty > 0 && newQty <= Math.min(maxAllowed || totalStock, totalStock)) return { ...item, qty: newQty }; } return item; })); };
  const cartTotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.qty), 0);
  
  const submitOrder = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    if(cart.length === 0) return; 
    
    // التحقق من المحفظة
    if (paymentMethod === 'wallet') {
      if (!user) { alert(lang === 'ar' ? 'يجب تسجيل الدخول لاستخدام المحفظة.' : 'Login required for wallet.'); return; }
      if (parseFloat(user.wallet_balance || '0') < cartTotal) { alert(lang === 'ar' ? 'رصيد المحفظة غير كافٍ!' : 'Insufficient wallet balance.'); return; }
    }

    try { 
      await api.post('/api/public/orders', { pharmacy_id: selectedPharmacyId, customer_name: customerName, customer_phone: customerPhone, items: cart, total_price: cartTotal, payment_method: paymentMethod }); 
      setOrderSuccess(true); setCart([]); setShowCart(false); 
      if (paymentMethod === 'wallet') refreshUser(); // تحديث الرصيد بعد الشراء
    } catch(err: any) { alert(err.error || (lang === 'ar' ? 'فشل إرسال الطلب' : 'Failed to submit order')); } 
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full animate-in fade-in duration-500 relative min-h-[80vh]">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-emerald-600 font-bold transition-colors"><ArrowRight size={20}/> {lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</button>
      {selectedPharmacyId && cart.length > 0 && !showCart && (<button onClick={() => setShowCart(true)} className="fixed bottom-8 left-8 bg-slate-900 text-white p-4 rounded-full shadow-2xl z-50 flex items-center justify-center animate-bounce hover:bg-slate-800"><ShoppingCart size={24} /><span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{cart.length}</span></button>)}
      <AnimatePresence>
        {showCart && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end"><motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="bg-white w-full md:w-[400px] h-full shadow-2xl flex flex-col"><div className="p-6 border-b flex justify-between items-center bg-slate-50"><h2 className="text-xl font-bold flex items-center gap-2"><ShoppingCart className="text-emerald-500"/> {lang === 'ar' ? 'سلة المشتريات' : 'Shopping Cart'}</h2><button onClick={() => setShowCart(false)} className="p-2 hover:bg-slate-200 rounded-full"><XCircle size={24}/></button></div><div className="flex-1 overflow-y-auto p-4 space-y-4">{cart.map(item => (<div key={item.product_id} className="flex items-center gap-4 bg-white p-3 border rounded-2xl shadow-sm">{item.image_url ? <img src={item.image_url} className="w-16 h-16 object-cover rounded-xl"/> : <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center"><Package size={20}/></div>}<div className="flex-1 min-w-0"><h4 className="font-bold text-sm line-clamp-1">{item.name}</h4><p className="text-emerald-600 font-bold text-sm" dir="ltr">{item.price} ل.س</p><div className="flex items-center gap-3 mt-2"><button onClick={() => updateQty(item.product_id, 1, item.max_per_user || item.quantity, item.quantity)} className="bg-slate-100 p-1 rounded-md hover:bg-slate-200"><Plus size={14}/></button><span className="font-bold text-sm">{item.qty}</span><button onClick={() => updateQty(item.product_id, -1, item.max_per_user || item.quantity, item.quantity)} className="bg-slate-100 p-1 rounded-md hover:bg-slate-200"><Minus size={14}/></button></div></div><button onClick={() => removeFromCart(item.product_id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={18}/></button></div>))}</div>
          <div className="p-6 border-t bg-slate-50">
            <div className="flex justify-between items-center mb-4 text-lg font-bold"><span>{lang === 'ar' ? 'المجموع الكلي:' : 'Total:'}</span><span dir="ltr" className="text-emerald-600">{cartTotal} ل.س</span></div>
            
            {/* خيارات الدفع */}
            <div className="flex gap-2 mb-4">
              <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer font-bold text-sm transition-colors ${paymentMethod === 'cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                <input type="radio" className="hidden" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} />
                💵 {lang === 'ar' ? 'الدفع عند الاستلام' : 'Cash'}
              </label>
              <label className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 cursor-pointer font-bold text-sm transition-colors ${paymentMethod === 'wallet' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                <input type="radio" className="hidden" checked={paymentMethod === 'wallet'} onChange={() => setPaymentMethod('wallet')} />
                <div className="flex items-center gap-1">💳 {lang === 'ar' ? 'المحفظة' : 'Wallet'}</div>
                {user && <span className="text-[10px] font-mono">{user.wallet_balance} ل.س</span>}
              </label>
            </div>

            <form onSubmit={submitOrder} className="space-y-3"><input required placeholder={lang === 'ar' ? "اسمك الكامل" : "Full Name"} className="w-full px-4 py-3 border rounded-xl outline-none focus:border-emerald-500" value={customerName} onChange={e=>setCustomerName(e.target.value)} /><input required placeholder={lang === 'ar' ? "رقم هاتفك للتواصل" : "Phone Number"} className="w-full px-4 py-3 border rounded-xl outline-none focus:border-emerald-500" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} /><button type="submit" className={`w-full text-white font-bold py-4 rounded-xl transition-colors shadow-lg ${paymentMethod === 'wallet' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-500 hover:bg-emerald-600'}`}>{lang === 'ar' ? 'تأكيد الطلب' : 'Submit Order'}</button></form></div></motion.div></div>
        )}
      </AnimatePresence>
      <div className="text-center mb-12"><div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100"><ShoppingBag size={40}/></div><h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">{lang === 'ar' ? <>السوق <span className="text-emerald-500">الطبي</span></> : <>Medical <span className="text-emerald-500">Store</span></>}</h1><p className="text-slate-500 max-w-xl mx-auto">{selectedPharmacy ? (lang === 'ar' ? `تسوق منتجات ${selectedPharmacy.name} واطلبها مباشرة.` : `Shop ${selectedPharmacy.name} products directly.`) : (lang === 'ar' ? 'اختر صيدلية من القائمة أدناه لبدء التسوق وتصفح المنتجات المتاحة لديها.' : 'Choose a pharmacy below to start shopping.')}</p></div>
      {orderSuccess && (<div className="max-w-2xl mx-auto bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-3xl text-center mb-8"><CheckCircle size={40} className="mx-auto mb-3 text-emerald-500"/><h3 className="text-xl font-bold mb-2">{lang === 'ar' ? 'تم إرسال طلبك بنجاح!' : 'Order submitted successfully!'}</h3><p>{lang === 'ar' ? 'سيتواصل معك الصيدلي قريباً.' : 'The pharmacist will contact you soon.'}</p></div>)}
      {!selectedPharmacyId ? (<div className="mb-16"><h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Store className="text-indigo-500"/> {lang === 'ar' ? 'الصيدليات المتاحة للتسوق' : 'Pharmacies Available for Shopping'}</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{ecommercePharmacies.map(ph => (<div key={ph.id} onClick={() => { setSelectedPharmacyId(ph.id); setSearchQuery(''); }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all flex items-center gap-4">{ph.image_url ? <img src={ph.image_url} className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100"/> : <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center shrink-0"><Store size={24}/></div>}<div><h3 className="font-bold text-lg text-slate-900 line-clamp-1">{ph.name}</h3><p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin size={12}/> {ph.address}</p><span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md font-bold mt-2 inline-block">{lang === 'ar' ? 'اضغط لبدء التسوق' : 'Click to shop'}</span></div></div>))}{ecommercePharmacies.length === 0 && <div className="col-span-full text-center py-10 text-slate-500">{lang === 'ar' ? 'لا توجد صيدليات مفعلة حالياً.' : 'No pharmacies available right now.'}</div>}</div></div>) : (<><div className="mb-8 flex justify-between items-center bg-indigo-50 p-4 rounded-2xl border border-indigo-100"><div className="flex items-center gap-3"><Store className="text-indigo-500"/><h2 className="font-bold text-indigo-900 text-lg">{lang === 'ar' ? `منتجات ${selectedPharmacy?.name}` : `${selectedPharmacy?.name} Products`}</h2></div><button onClick={() => { setSelectedPharmacyId(null); setSearchQuery(''); }} className="text-xs font-bold bg-white text-indigo-600 px-4 py-2 rounded-lg shadow-sm border border-indigo-200">{lang === 'ar' ? 'تغيير الصيدلية' : 'Change Pharmacy'}</button></div><div className="max-w-2xl mx-auto relative mb-12"><Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="text" placeholder={lang === 'ar' ? "ابحث عن دواء أو منتج..." : "Search for a product..."} className="w-full pr-12 pl-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 outline-none shadow-sm text-lg transition-colors" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>{loading ? (<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500"></div></div>) : (<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">{filteredProducts.map(p => { const inCart = cart.find(i => i.product_id === p.id); const isMaxed = inCart && inCart.qty >= (p.max_per_user || p.quantity); const isOutOfStock = p.quantity <= 0; return (<div key={p.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-shadow group flex flex-col"><div className="aspect-square bg-slate-50 relative overflow-hidden">{p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={48}/></div>}{isOutOfStock && <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center"><span className="bg-red-500 text-white font-bold px-4 py-1.5 rounded-full text-sm shadow-md rotate-[-12deg]">{lang === 'ar' ? 'نفذت الكمية' : 'Out of Stock'}</span></div>}</div><div className="p-4 flex flex-col flex-1"><h3 className="font-bold text-slate-900 line-clamp-2 text-sm md:text-base leading-snug mb-2">{p.name}</h3>{p.max_per_user && <span className="text-[10px] text-red-500 mb-2 block font-bold">{lang === 'ar' ? `الحد الأقصى للفرد: ${p.max_per_user}` : `Max per user: ${p.max_per_user}`}</span>}<div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between"><span className="font-extrabold text-lg text-slate-900" dir="ltr">{p.price} ل.س</span></div>{!isOutOfStock && (<button onClick={() => addToCart(p)} disabled={!!isMaxed} className={`mt-3 w-full py-2 rounded-xl text-xs font-bold flex justify-center items-center gap-1 transition-colors ${isMaxed ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}><Plus size={14}/> {isMaxed ? (lang === 'ar' ? 'الحد الأقصى' : 'Max Reached') : (lang === 'ar' ? 'أضف للسلة' : 'Add to Cart')}</button>)}</div></div>); })}{filteredProducts.length === 0 && <div className="col-span-full py-20 text-center text-slate-500"><Package className="mx-auto mb-4 text-slate-300" size={48}/><p>{lang === 'ar' ? 'لا توجد منتجات متاحة.' : 'No products available.'}</p></div>}</div>)}</>)}
    </div>
  );
};

// 6. --- Main Public View ---
const PublicView = ({ user, refreshUser, lang, t }: { user: UserType | null, refreshUser: () => void, lang: string, t: any }) => {
  const [facilities, setFacilities] = useState<Facility[]>([]); const [loading, setLoading] = useState(true); const [searchQuery, setSearchQuery] = useState(''); const [activeTab, setActiveTab] = useState<'pharmacy' | 'clinic' | 'dental_clinic'>('pharmacy'); const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null); const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null); const [currentPage, setCurrentPage] = useState(1); const [openNowPage, setOpenNowPage] = useState(1); const itemsPerPage = 6; const [showShop, setShowShop] = useState(false);
  useEffect(() => { setLoading(true); api.get('/api/public/facilities').then(data => setFacilities(data)).finally(() => setLoading(false)); if (navigator.geolocation) { navigator.geolocation.getCurrentPosition( (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }), (err) => console.log("الموقع غير مفعل") ); } }, []);
  useEffect(() => { setCurrentPage(1); setOpenNowPage(1); }, [activeTab, searchQuery]);
  
  if (showShop) return <PublicShopView onBack={() => setShowShop(false)} facilities={facilities} lang={lang} user={user} refreshUser={refreshUser} />;
  
  const processedFacilities = facilities.filter(f => f.type === activeTab && (f.name.includes(searchQuery) || f.address.includes(searchQuery))).map(f => ({ ...f, isOpenNow: checkIsOpenNow(f), distance: userLocation ? parseFloat(getDistanceKm(userLocation.lat, userLocation.lng, f.latitude, f.longitude)) : null })).sort((a, b) => { if (a.isOpenNow && !b.isOpenNow) return -1; if (!a.isOpenNow && b.isOpenNow) return 1; if (a.distance !== null && b.distance !== null) return a.distance - b.distance; return 0; });
  const currentlyOpen = processedFacilities.filter(f => f.isOpenNow); const totalOpenPages = Math.ceil(currentlyOpen.length / itemsPerPage); const paginatedOpen = currentlyOpen.slice((openNowPage - 1) * itemsPerPage, openNowPage * itemsPerPage); const totalPages = Math.ceil(processedFacilities.length / itemsPerPage); const paginatedFacilities = processedFacilities.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-600"></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full overflow-x-hidden min-h-[80vh]">
      <header className="mb-16 text-center">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest text-blue-600 uppercase bg-blue-50 rounded-full border border-blue-100">{t.communityHealth}</motion.div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">{lang === 'ar' ? <>منصة <span className="text-blue-600">طيبة الإمام</span> الصحية</> : <>Taibet El-Imam <span className="text-blue-600">Health Platform</span></>}</h1>
        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto font-light leading-relaxed mb-8">{t.searchPlaceholder}</p>
        <div className="max-w-xl mx-auto relative group"><Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} /><input type="text" placeholder={t.searchPlaceholder} className="w-full pr-12 pl-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-blue-600 outline-none shadow-sm text-lg transition-colors" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
        <div className="flex justify-center gap-3 mt-10 flex-wrap">
          <button onClick={() => setActiveTab('pharmacy')} className={`px-6 md:px-8 py-3.5 rounded-2xl font-bold transition-all shadow-sm flex items-center gap-2 ${activeTab === 'pharmacy' ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}><BriefcaseMedical size={18} /> {lang === 'ar' ? 'الصيدليات' : 'Pharmacies'}</button>
          <button onClick={() => setActiveTab('clinic')} className={`px-6 md:px-8 py-3.5 rounded-2xl font-bold transition-all shadow-sm flex items-center gap-2 ${activeTab === 'clinic' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}><Stethoscope size={18} /> {lang === 'ar' ? 'العيادات الطبية' : 'Clinics'}</button>
          <button onClick={() => setActiveTab('dental_clinic')} className={`px-6 md:px-8 py-3.5 rounded-2xl font-bold transition-all shadow-sm flex items-center gap-2 ${activeTab === 'dental_clinic' ? 'bg-indigo-500 text-white shadow-indigo-200' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}><Smile size={18} /> {lang === 'ar' ? 'عيادات الأسنان' : 'Dental Clinics'}</button>
        </div>
        {activeTab === 'pharmacy' && (<div className="mt-6 flex justify-center"><button onClick={() => setShowShop(true)} className="px-8 py-3.5 rounded-2xl font-bold transition-all shadow-md flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 animate-pulse"><ShoppingCart size={18} /> {lang === 'ar' ? 'تسوق الأدوية والمنتجات' : 'Shop Products'}</button></div>)}
      </header>

      <AnimatePresence>{selectedDoctorId && <DoctorProfileModal doctorId={selectedDoctorId} onClose={() => setSelectedDoctorId(null)} t={t} lang={lang} />}</AnimatePresence>

      <div className="flex flex-col gap-12 md:gap-16 mb-16">
        <div className="w-full">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3"><div className={`w-3 h-3 rounded-full animate-pulse ${activeTab === 'clinic' ? 'bg-blue-600' : 'bg-emerald-500'}`} /> {activeTab === 'pharmacy' ? (lang === 'ar' ? 'صيدليات مناوبة الآن' : 'Pharmacies On Call Now') : (activeTab === 'clinic' ? (lang === 'ar' ? 'عيادات مناوبة الآن' : 'Clinics Open Now') : (lang === 'ar' ? 'عيادات أسنان مناوبة الآن' : 'Dental Clinics Open Now'))}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedOpen.length > 0 ? paginatedOpen.map(f => (
              <div key={`open-${f.id}`} className="bg-white p-6 rounded-3xl border-2 border-emerald-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-4 left-4 bg-emerald-50 text-emerald-600 text-[10px] font-bold px-3 py-1 rounded-full animate-pulse">{lang === 'ar' ? 'مفتوح الآن' : 'Open Now'}</div>
                <div className="flex items-center gap-4 mb-4 mt-2">
                  {f.image_url ? <img src={f.image_url} alt={f.name} className="w-14 h-14 object-cover rounded-xl shrink-0 shadow-sm border border-slate-100" /> : <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${activeTab === 'clinic' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-emerald-50 text-emerald-500 border border-emerald-100'}`}>{f.type === 'clinic' ? <Stethoscope size={24} /> : (f.type === 'dental_clinic' ? <Smile size={24} /> : <Activity size={24} />)}</div>}
                  <div><h3 className="text-xl font-bold text-slate-900 line-clamp-1">{f.name}</h3>{(f.type === 'clinic' || f.type === 'dental_clinic') && f.specialty && <span className="text-[11px] font-bold text-blue-600 block mt-0.5">{f.specialty}</span>}{f.pharmacist_name && <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-1"><User size={12} /> {f.pharmacist_name}</span>}{f.distance !== null && <span className="text-[11px] font-bold text-slate-500 mt-1.5 block">{lang === 'ar' ? `تبعد عنك: ${f.distance} كم` : `${f.distance} km away`} 📍</span>}</div>
                </div>
                <p className="text-slate-500 text-sm flex items-center gap-2 mb-4"><MapPin size={16} className="shrink-0"/> <span className="truncate">{f.address}</span></p>
                <div className="flex gap-2">
                  {f.doctor_id && (f.type === 'clinic' || f.type === 'dental_clinic') && (
                    <button onClick={() => setSelectedDoctorId(f.doctor_id!)} className="flex-1 bg-blue-50 text-blue-700 border border-blue-100 text-center py-2.5 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors">{lang === 'ar' ? 'احجز موعد' : 'Book Appt'}</button>
                  )}
                  <a href={`tel:${f.phone}`} className="flex-1 bg-slate-900 text-white text-center py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-1"><Phone size={14} /> {lang === 'ar' ? 'اتصال' : 'Call'}</a>
                </div>
              </div>
            )) : (<div className="col-span-full text-center py-12 bg-slate-50 rounded-3xl border border-slate-100 text-slate-500"><Clock className="mx-auto text-slate-300 mb-4" size={48} /><p className="text-slate-500 font-medium">{lang === 'ar' ? 'لا يوجد مناوبات في هذا الوقت.' : 'No facilities open at this time.'}</p></div>)}
          </div>
          {totalOpenPages > 1 && (<div className="flex justify-center items-center gap-4 mt-8"><button disabled={openNowPage === 1} onClick={() => setOpenNowPage(prev => prev - 1)} className="px-6 py-2.5 rounded-xl font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">{lang === 'ar' ? 'السابق' : 'Prev'}</button><span className="font-bold text-slate-500 text-sm" dir="ltr">{openNowPage} / {totalOpenPages}</span><button disabled={openNowPage === totalOpenPages} onClick={() => setOpenNowPage(prev => prev + 1)} className="px-6 py-2.5 rounded-xl font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">{lang === 'ar' ? 'التالي' : 'Next'}</button></div>)}
        </div>

        <div className="w-full">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3"><Calendar className="text-slate-400" /> {lang === 'ar' ? 'الجدول الأسبوعي للدوام' : 'Weekly Schedule'}</h2>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-right min-w-[800px]"><thead className="bg-slate-50/50"><tr><th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{activeTab === 'pharmacy' ? (lang === 'ar'?'الصيدلية':'Pharmacy') : (activeTab === 'clinic' ? (lang === 'ar'?'العيادة':'Clinic') : (lang === 'ar'?'العيادة':'Dental Clinic'))}</th>{(lang === 'en' ? DAYS_OF_WEEK_EN : DAYS_OF_WEEK_AR).map((day, idx) => (<th key={idx} className={`px-2 py-4 text-[10px] font-bold text-center uppercase tracking-widest ${new Date().getDay() === idx ? 'text-blue-600 bg-blue-50/50' : 'text-slate-400'}`}>{day}</th>))}<th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">{lang === 'ar' ? 'التفاصيل' : 'Details'}</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedFacilities.map((f, idx) => {
                    const isOpenNow = f.isOpenNow;
                    return (
                      <motion.tr key={`schedule-${f.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4"><div className="flex flex-col"><span className="font-bold text-slate-900 text-base">{f.name}</span>{(f.type === 'clinic' || f.type === 'dental_clinic') && f.specialty && <span className="text-[10px] font-bold text-blue-500 mt-0.5">{f.specialty}</span>}<span className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin size={10}/> {f.address}</span><div className="mt-2">{isOpenNow ? <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full">{lang === 'ar' ? 'مفتوح الآن' : 'Open'}</span> : <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-full">{lang === 'ar' ? 'مغلق' : 'Closed'}</span>}</div></div></td>
                        {(lang === 'en' ? DAYS_OF_WEEK_EN : DAYS_OF_WEEK_AR).map((day, dIdx) => { const daySchedule = f.working_hours && f.working_hours[dIdx.toString()]; const isToday = new Date().getDay() === dIdx; return <td key={dIdx} className={`px-2 py-4 text-center border-x border-slate-50/50 ${isToday ? 'bg-blue-50/30' : ''}`}>{daySchedule?.isOpen ? <div className="flex flex-col items-center justify-center"><span className={`text-[10px] font-mono font-bold ${isToday ? 'text-blue-700' : 'text-slate-700'}`} dir="ltr">{formatTime12h(daySchedule.start, lang)}</span><span className="text-[8px] text-slate-400 my-0.5">-</span><span className={`text-[10px] font-mono font-bold ${isToday ? 'text-blue-700' : 'text-slate-700'}`} dir="ltr">{formatTime12h(daySchedule.end, lang)}</span></div> : <span className="text-[10px] text-slate-300 font-bold">{lang === 'ar' ? 'عطلة' : 'Off'}</span>}</td>; })}
                        <td className="px-6 py-4 text-center">{f.doctor_id ? <button onClick={() => setSelectedDoctorId(f.doctor_id!)} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-1 mx-auto">{lang === 'ar' ? 'عرض الملف' : 'Profile'}</button> : <span className="text-slate-300 text-xs">---</span>}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (<div className="flex justify-center items-center gap-4 p-6 border-t border-slate-100 bg-slate-50"><button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="px-6 py-2.5 rounded-xl font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">{lang === 'ar' ? 'السابق' : 'Prev'}</button><span className="font-bold text-slate-500 text-sm" dir="ltr">{currentPage} / {totalPages}</span><button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="px-6 py-2.5 rounded-xl font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">{lang === 'ar' ? 'التالي' : 'Next'}</button></div>)}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Auth & Modals (Updated for Patients) ---
const LoginAndRegister = ({ onLogin, t, lang }: { onLogin: (user: any) => void, t: any, lang: string }) => {
  const [isLogin, setIsLogin] = useState(true); const [email, setEmail] = useState(''); const [emailPrefix, setEmailPrefix] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [activationKey, setActivationKey] = useState(''); const [isActivatedByKey, setIsActivatedByKey] = useState(false); const [role, setRole] = useState('patient'); const [error, setError] = useState(''); const [successMsg, setSuccessMsg] = useState(''); const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => { 
    e.preventDefault(); setError(''); setSuccessMsg(''); setLoading(true); 
    try { 
      if (isLogin) { 
        const data = await api.post('/api/auth/login', { email, password }); onLogin(data.user); 
      } else { 
        const domain = role === 'patient' ? '@taiba.user.sy' : (role === 'dentist' ? '@taiba.dental.sy' : (role === 'doctor' ? '@taiba.Health.sy' : '@taiba.pharma.sy')); 
        const fullEmail = `${emailPrefix}${domain}`; 
        const res = await api.post('/api/auth/register', { email: fullEmail, password, name, phone, role, activationKey }); 
        if (res.isActive) { setSuccessMsg('تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن.'); setIsActivatedByKey(true); } 
        else { setSuccessMsg('تم إنشاء الحساب بنجاح! يرجى التواصل مع الإدارة لتفعيل حسابك (للكوادر الطبية).'); setIsActivatedByKey(false); } 
        setIsLogin(true); setPassword(''); setEmailPrefix(''); setActivationKey(''); 
      } 
    } catch (err: any) { setError(err.error || (isLogin ? t.loginFailed : 'فشل التسجيل.')); } finally { setLoading(false); } 
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 w-full">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 w-full max-w-md">
        <div className="text-center mb-8"><div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><Shield size={32} /></div><h2 className="text-3xl font-bold text-slate-900">{isLogin ? t.loginTitle : (lang === 'ar' ? 'إنشاء حساب جديد' : 'Create Account')}</h2></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>}
          {successMsg && (<div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm flex flex-col gap-3 text-center border border-emerald-100"><span className="font-bold">{successMsg}</span>{!isActivatedByKey && role !== 'patient' && successMsg.includes('التواصل') && (<a href="https://wa.me/963000000000" target="_blank" rel="noreferrer" className="bg-emerald-500 text-white py-2 rounded-lg font-bold flex justify-center items-center gap-2 hover:bg-emerald-600 transition-colors"><MessageCircle size={16} /> تواصل عبر واتساب للتفعيل</a>)}</div>)}
          {!isLogin && (<><div><label className="block text-sm font-medium text-slate-700 mb-1">{t.fullName}</label><input required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" value={name} onChange={e => setName(e.target.value)} /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">{t.role}</label><select className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" value={role} onChange={e => setRole(e.target.value)}><option value="patient">{lang === 'ar' ? 'مريض / مستخدم' : 'Patient'}</option><option value="pharmacist">{t.pharmacist}</option><option value="doctor">{t.doctor}</option><option value="dentist">{lang === 'ar' ? 'طبيب أسنان' : 'Dentist'}</option></select></div><div><label className="block text-sm font-medium text-slate-700 mb-1">{t.phone}</label><input className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" value={phone} onChange={e => setPhone(e.target.value)} /></div></div>{role !== 'patient' && <div className="pt-2 border-t border-slate-100 mt-2"><p className="text-xs text-slate-500 mb-2 font-medium leading-relaxed">مفتاح التفعيل للكادر الطبي (اختياري):</p><input placeholder="مفتاح التفعيل (إن وجد)" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center tracking-widest uppercase" value={activationKey} onChange={e => setActivationKey(e.target.value.toUpperCase())} /></div>}</>)}
          {isLogin ? (<div><label className="block text-sm font-medium text-slate-700 mb-1">{t.email}</label><input type="email" required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-left" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} /><div className="flex gap-2 mt-2 justify-end flex-wrap" dir="ltr"><button type="button" onClick={() => setEmail(email.split('@')[0] + '@taiba.user.sy')} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-mono rounded-lg hover:bg-slate-200 transition-colors">@taiba.user.sy</button><button type="button" onClick={() => setEmail(email.split('@')[0] + '@taiba.pharma.sy')} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-mono rounded-lg hover:bg-slate-200 transition-colors">@taiba.pharma.sy</button><button type="button" onClick={() => setEmail(email.split('@')[0] + '@taiba.Health.sy')} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-mono rounded-lg hover:bg-slate-200 transition-colors">@taiba.Health.sy</button><button type="button" onClick={() => setEmail(email.split('@')[0] + '@taiba.dental.sy')} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-mono rounded-lg hover:bg-slate-200 transition-colors">@taiba.dental.sy</button></div></div>) : (<div><label className="block text-sm font-medium text-slate-700 mb-1">{t.email}</label><div className="flex" dir="ltr"><input type="text" required placeholder="username" className="flex-1 px-4 py-3 rounded-l-xl border border-r-0 border-slate-200 outline-none text-left focus:ring-2 focus:ring-blue-500" value={emailPrefix} onChange={e => setEmailPrefix(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ''))} /><div className="px-3 py-3 bg-slate-50 border border-slate-200 rounded-r-xl text-slate-500 font-mono text-xs flex items-center select-none">{role === 'patient' ? '@taiba.user.sy' : (role === 'dentist' ? '@taiba.dental.sy' : (role === 'doctor' ? '@taiba.Health.sy' : '@taiba.pharma.sy'))}</div></div></div>)}
          <div><label className="block text-sm font-medium text-slate-700 mb-1">{t.password}</label><input type="password" required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-left" dir="ltr" value={password} onChange={e => setPassword(e.target.value)} /></div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors mt-6">{loading ? '...' : (isLogin ? t.signIn : (lang === 'ar' ? 'تسجيل حساب' : 'Sign Up'))}</button>
        </form>
        <div className="mt-6 text-center border-t border-slate-100 pt-6"><p className="text-sm text-slate-600">{isLogin ? (lang === 'ar' ? 'ليس لديك حساب؟' : "Don't have an account?") : (lang === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?')}<button type="button" onClick={() => {setIsLogin(!isLogin); setError(''); setSuccessMsg('');}} className="text-blue-600 font-bold hover:underline mx-2">{isLogin ? (lang === 'ar' ? 'إنشاء حساب' : 'Sign Up') : (lang === 'ar' ? 'تسجيل الدخول' : 'Login')}</button></p></div>
      </motion.div>
    </div>
  );
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, body, t }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, body: string, t: any }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"><motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md text-center max-h-[90vh] overflow-y-auto"><div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={32} /></div><h3 className="text-2xl font-bold text-slate-900 mb-2">{title}</h3><p className="text-slate-500 mb-8">{body}</p><div className="flex gap-3"><button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">{t.cancel}</button><button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors">{t.deleteBtn}</button></div></motion.div></div>
  );
};

// --- 7. Main Dashboard Component ---
const Dashboard = ({ user, onLogout, lang, t }: { user: UserType, onLogout: () => void, lang: 'ar' | 'en', t: any }) => {
  const [activeTab, setActiveTab] = useState<'facilities' | 'products' | 'orders' | 'services' | 'users' | 'profile' | 'settings'>('facilities');
  const [facilities, setFacilities] = useState<Facility[]>([]); const [users, setUsers] = useState<any[]>([]);
  const isSuperAdmin = SUPER_ADMINS.includes(user.email);
  const hasEcommerce = facilities.some(f => f.is_ecommerce_enabled);
  
  const dashboardTitle = (user.role === 'doctor' || user.role === 'dentist') ? (lang === 'ar' ? 'عياداتي ومواعيدي' : 'My Clinics') : (user.role === 'pharmacist' ? (lang === 'ar' ? 'صيدلياتي ومواعيدي' : 'My Pharmacies') : (lang === 'ar' ? 'إدارة المنشآت الطبية' : 'Manage Facilities'));
  const addButtonText = (user.role === 'doctor' || user.role === 'dentist') ? (lang === 'ar' ? 'إضافة عيادة' : 'Add Clinic') : (user.role === 'pharmacist' ? (lang === 'ar' ? 'إضافة صيدلية' : 'Add Pharmacy') : (lang === 'ar' ? 'إضافة منشأة' : 'Add Facility'));

  const [profileEmail, setProfileEmail] = useState(user.email); const [profileName, setProfileName] = useState(user.name); const [profilePhone, setProfilePhone] = useState(user.phone || ''); const [profileNotes, setProfileNotes] = useState(user.notes || ''); const [profileCurrentPassword, setProfileCurrentPassword] = useState(''); const [profileNewPassword, setProfileNewPassword] = useState(''); const [profileMsg, setProfileMsg] = useState('');
  const [footerForm, setFooterForm] = useState<FooterSettings>({ copyright: '', description: '', facebook: '', instagram: '', contact_phone: '', complaints_phone: '' }); const [footerMsg, setFooterMsg] = useState('');
  const defaultWorkingHours: Record<string, WorkingHours> = {}; for(let i=0; i<7; i++) defaultWorkingHours[i.toString()] = { isOpen: true, start: "08:00", end: "22:00" };
  const [showModal, setShowModal] = useState(false); const [editingData, setEditingData] = useState<Facility | null>(null); const [form, setForm] = useState<any>({ name: '', address: '', phone: '', type: user.role === 'dentist' ? 'dental_clinic' : (user.role === 'doctor' ? 'clinic' : 'pharmacy'), latitude: 35.25, longitude: 36.7, whatsapp_phone: '', pharmacist_name: '', specialty: '', services: '', consultation_fee: 0, waiting_time: '15 دقيقة', image_url: '', doctor_id: 0, working_hours: defaultWorkingHours });
  const [showUserModal, setShowUserModal] = useState(false); const [editingUser, setEditingUser] = useState<UserType | null>(null); const [userForm, setUserForm] = useState({ email: '', password: '', role: 'pharmacist' as any, name: '', pharmacy_limit: 10, phone: '', notes: '' });
  const [doctorFilter, setDoctorFilter] = useState<number>(0);
  const [confirmData, setConfirmData] = useState<{ isOpen: boolean, onConfirm: () => void, title: string, body: string }>({ isOpen: false, onConfirm: () => {}, title: '', body: '' });
  const openConfirm = (title: string, body: string, onConfirm: () => void) => setConfirmData({ isOpen: true, onConfirm, title, body });
  const [generatedKey, setGeneratedKey] = useState<string | null>(null); const [uploadingImage, setUploadingImage] = useState(false);

  const loadData = async () => { if (activeTab === 'facilities' || activeTab === 'services') api.get('/api/pharmacies').then(setFacilities); if (activeTab === 'users' && user.role === 'admin') api.get('/api/admin/users').then(setUsers); if (activeTab === 'settings' && isSuperAdmin) api.get('/api/public/settings').then(data => setFooterForm(data)); };
  useEffect(() => { loadData(); }, [activeTab]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; setUploadingImage(true); try { const url = await uploadImageToImgBB(file); setForm({ ...form, image_url: url }); } catch (err: any) { alert(err.message); } finally { setUploadingImage(false); } };
  const handleSaveFacility = async (e: React.FormEvent) => { e.preventDefault(); const payload = { ...form }; if (user.role !== 'admin') delete payload.doctor_id; try { if (editingData) await api.put(`/api/pharmacies/${editingData.id}`, payload); else await api.post('/api/pharmacies', payload); setShowModal(false); loadData(); } catch (err: any) { alert(err.error || 'خطأ في الحفظ!'); } };
  const setManualStatus = async (id: number, status: 'open' | 'closed' | 'auto') => { try { await api.patch(`/api/pharmacies/${id}/status`, { manual_status: status }); loadData(); } catch(err: any) { alert('حدث خطأ'); } };
  const toggleEcommerce = async (id: number, currentStatus: boolean) => { try { await api.patch(`/api/pharmacies/${id}/ecommerce`, { is_ecommerce_enabled: !currentStatus }); loadData(); } catch(err: any) { alert('ممنوع'); } };
  const generateActivationKey = async () => { try { const res = await api.post('/api/admin/generate-key', {}); setGeneratedKey(res.key); } catch (err: any) { alert('خطأ'); } };
  const approveUser = async (id: number) => { try { await api.patch(`/api/admin/users/${id}/approve`); setUsers(users.map(u => u.id === id ? { ...u, is_active: true } : u)); } catch (err) { alert('خطأ'); } };
  const handleSaveUser = async (e: React.FormEvent) => { e.preventDefault(); try { if (editingUser) await api.put(`/api/admin/users/${editingUser.id}`, userForm); else await api.post('/api/admin/users', userForm); setShowUserModal(false); setEditingUser(null); loadData(); } catch (err: any) { alert(err.error); } };
  const handleUpdateProfile = async (e: React.FormEvent) => { e.preventDefault(); try { const res = await api.post('/api/auth/update-profile', { email: profileEmail, name: profileName, currentPassword: profileCurrentPassword, newPassword: profileNewPassword, phone: profilePhone, notes: profileNotes }); setProfileMsg(res.verificationRequired ? t.verificationSent : t.profileUpdated); setProfileCurrentPassword(''); setProfileNewPassword(''); } catch (err: any) { setProfileMsg(err.error); } };
  const handleSaveFooter = async (e: React.FormEvent) => { e.preventDefault(); try { await api.put('/api/admin/settings', footerForm); setFooterMsg('تم الحفظ بنجاح'); } catch(err: any) { setFooterMsg('فشل الحفظ'); } };

  const handleAddWalletBalance = async (userId: number) => {
    const amount = prompt('أدخل المبلغ المراد شحنه (بالليرة):');
    if(!amount || isNaN(Number(amount))) return;
    try { await api.post(`/api/admin/wallet/${userId}`, { amount: parseFloat(amount) }); loadData(); alert('تم الشحن بنجاح!'); } catch(err) { alert('خطأ في الشحن'); }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col md:flex-row w-full overflow-hidden">
      <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0 md:sticky md:top-0 md:h-screen z-20">
        <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center"><h1 className="text-xl font-bold text-slate-900 flex items-center gap-2"><img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" /> {lang === 'ar' ? 'طيبة الامام الصحية' : 'Taibet Health'}</h1><button onClick={onLogout} className="md:hidden p-2 rounded-lg bg-red-50 text-red-600"><LogOut size={18} /></button></div>
        
        <div className="mx-4 mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-200">
          <div className="flex items-center gap-2 text-blue-100 mb-1"><Wallet size={16}/> <span className="text-xs font-bold">{lang === 'ar' ? 'رصيد المحفظة' : 'Wallet Balance'}</span></div>
          <div className="text-xl font-extrabold" dir="ltr">{user.wallet_balance || '0.00'} ل.س</div>
        </div>

        <nav className="flex-none md:flex-1 p-3 md:p-4 flex flex-row md:flex-col gap-2 overflow-x-auto whitespace-nowrap flex-nowrap scrollbar-hide mt-2">
          {user.role !== 'patient' && <button onClick={() => setActiveTab('facilities')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'facilities' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><MapPin size={18} /> {dashboardTitle}</button>}
          {(user.role === 'admin' || user.role === 'doctor' || user.role === 'dentist') && (<button onClick={() => setActiveTab('services')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'services' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><Activity size={18} /> {lang === 'ar' ? 'الخدمات التي أقدمها' : 'My Services'}</button>)}
          {(user.role === 'admin' || hasEcommerce) && (<><button onClick={() => setActiveTab('products')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'products' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><Package size={18} /> {lang === 'ar' ? 'إدارة المنتجات' : 'Products Manager'}</button><button onClick={() => setActiveTab('orders')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><FileText size={18} /> {lang === 'ar' ? 'طلبات الزبائن' : 'Customer Orders'}</button></>)}
          {user.role === 'admin' && <button onClick={() => setActiveTab('users')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><User size={18} /> {t.userManagement}</button>}
          {isSuperAdmin && <button onClick={() => setActiveTab('settings')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><Layout size={18} /> {lang === 'ar' ? 'إعدادات الفوتر' : 'Footer Settings'}</button>}
          <button onClick={() => setActiveTab('profile')} className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><Settings size={18} /> {t.profileSettings}</button>
        </nav>
        <div className="hidden md:block p-4 border-t border-slate-100 mt-auto"><div className="flex items-center gap-3 px-4 py-3 mb-2"><div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold shrink-0">{user.name[0]}</div><div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-900 truncate">{user.name}</p><p className="text-xs text-slate-500 capitalize">{user.role === 'admin' ? t.admin : (user.role === 'dentist' ? (lang === 'ar' ? 'طبيب أسنان' : 'Dentist') : (user.role === 'doctor' ? t.doctor : (user.role === 'pharmacist' ? t.pharmacist : 'مريض')))}</p></div></div><button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"><LogOut size={18} /> {t.logout}</button></div>
      </div>

      <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'facilities' && user.role !== 'patient' && (
            <motion.div key="facilities" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
                <div><h2 className="text-2xl md:text-3xl font-bold text-slate-900">{dashboardTitle}</h2></div>
                <div className="flex flex-wrap gap-2 md:gap-4 w-full sm:w-auto">
                  {user.role === 'admin' && <select className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={doctorFilter} onChange={e => setDoctorFilter(parseInt(e.target.value))}><option value="0">{t.allDoctors}</option>{users.filter(u => u.role !== 'admin' && u.role !== 'patient').map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>}
                  <button onClick={() => { setEditingData(null); setForm({ name: '', address: '', phone: '', type: user.role === 'dentist' ? 'dental_clinic' : (user.role === 'doctor' ? 'clinic' : 'pharmacy'), latitude: 35.25, longitude: 36.7, whatsapp_phone: '', pharmacist_name: '', specialty: '', services: '', consultation_fee: 0, waiting_time: '15 دقيقة', image_url: '', doctor_id: 0, working_hours: defaultWorkingHours }); setShowModal(true); }} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"><Plus size={20} /> {addButtonText}</button>
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
                {facilities.filter(p => doctorFilter === 0 || p.doctor_id === doctorFilter).map(f => {
                  const isOpenNow = checkIsOpenNow(f);
                  return (
                    <div key={f.id} className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4 gap-2">
                        <div className="flex items-center gap-4">
                          {f.image_url ? <img src={f.image_url} className="w-14 h-14 rounded-xl object-cover border border-slate-100"/> : <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center"><Store size={24}/></div>}
                          <div><span className={`text-[10px] px-2 py-1 rounded-full font-bold inline-block mb-1 ${f.type === 'clinic' ? 'bg-indigo-100 text-indigo-700' : (f.type === 'dental_clinic' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700')}`}>{f.type === 'clinic' ? (lang === 'ar' ? 'عيادة طبية' : 'Clinic') : (f.type === 'dental_clinic' ? (lang === 'ar' ? 'عيادة أسنان' : 'Dental Clinic') : (lang === 'ar' ? 'صيدلية' : 'Pharmacy'))}</span><h3 className="text-lg font-bold text-slate-900 line-clamp-1">{f.name}</h3></div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {isOpenNow ? <span className="bg-emerald-500 text-white text-xs px-3 py-1 rounded-lg font-bold animate-pulse">{lang === 'ar' ? 'مفتوح الآن' : 'Open'}</span> : <span className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-lg font-bold">{lang === 'ar' ? 'مغلق حالياً' : 'Closed'}</span>}
                          {isSuperAdmin && f.type === 'pharmacy' && (
                            <button onClick={() => toggleEcommerce(f.id, f.is_ecommerce_enabled || false)} className={`text-[10px] px-2 py-1 rounded-md font-bold ${f.is_ecommerce_enabled ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{lang === 'ar' ? 'المتجر: ' : 'Store: '}{f.is_ecommerce_enabled ? (lang === 'ar' ? 'مفعل' : 'ON') : (lang === 'ar' ? 'معطل' : 'OFF')}</button>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-slate-600 mb-4 mt-4 pt-4 border-t border-slate-100">
                        {(f.type === 'clinic' || f.type === 'dental_clinic') && f.specialty && <p className="flex items-center gap-2 text-sm font-bold text-indigo-600 mb-1"><Stethoscope size={14} className="shrink-0"/> <span className="truncate">{f.specialty}</span></p>}
                        <p className="flex items-center gap-2 text-sm"><MapPin size={14} className="shrink-0"/> <span className="truncate">{f.address}</span></p>
                        <p className="flex items-center gap-2 text-sm"><Phone size={14} className="shrink-0"/> <span className="truncate">{f.phone}</span></p>
                      </div>
                      
                      <div className="bg-slate-50 p-3 rounded-xl mt-4 flex flex-col sm:flex-row items-center gap-2 border border-slate-100">
                        <span className="text-xs font-bold text-slate-500 mb-2 sm:mb-0 sm:ml-2 w-full sm:w-auto text-center sm:text-right">{lang === 'ar' ? 'الدوام اليدوي:' : 'Manual Status:'}</span>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button onClick={() => setManualStatus(f.id, 'open')} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${f.manual_status==='open' ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-200' : 'bg-white border text-slate-600'}`}>{lang === 'ar' ? 'مفتوح دائماً' : 'Always Open'}</button>
                          <button onClick={() => setManualStatus(f.id, 'closed')} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${f.manual_status==='closed' ? 'bg-red-500 text-white shadow-sm ring-2 ring-red-200' : 'bg-white border text-slate-600'}`}>{lang === 'ar' ? 'مغلق دائماً' : 'Always Closed'}</button>
                          <button onClick={() => setManualStatus(f.id, 'auto')} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!f.manual_status || f.manual_status==='auto' ? 'bg-indigo-500 text-white shadow-sm ring-2 ring-indigo-200' : 'bg-white border text-slate-600'}`}>{lang === 'ar' ? 'حسب الجدول' : 'Auto'}</button>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4 mt-4 border-t border-slate-100"><button onClick={() => { setEditingData(f); setForm({...f, working_hours: f.working_hours || defaultWorkingHours}); setShowModal(true); }} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"><Edit2 size={14} /> {lang === 'ar' ? 'تعديل البيانات' : 'Edit'}</button><button onClick={() => openConfirm(t.confirmTitle, t.confirmBody, async () => { await api.delete(`/api/pharmacies/${f.id}`); loadData(); })} className="px-4 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"><Trash2 size={14} /></button></div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && user.role === 'admin' && (
            <motion.div key="users" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8"><div><h2 className="text-2xl md:text-3xl font-bold text-slate-900">{t.userManagement}</h2></div><div className="flex flex-wrap gap-3 w-full sm:w-auto">{isSuperAdmin && <button onClick={generateActivationKey} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-indigo-50 text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-100 transition-colors">توليد مفتاح تفعيل</button>}<button onClick={() => { setEditingUser(null); setUserForm({ email: '', password: '', role: 'pharmacist', name: '', pharmacy_limit: 10, phone: '', notes: '' }); setShowUserModal(true); }} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"><Plus size={20} /> {t.createUser}</button></div></div>
              <AnimatePresence>{generatedKey && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="mb-6 p-6 bg-indigo-50 border border-indigo-100 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm"><div className="text-center md:text-right"><h4 className="font-bold text-indigo-900 mb-1 text-lg">تم التوليد بنجاح!</h4><p className="text-sm text-indigo-700">المفتاح صالح للاستخدام مرة واحدة فقط.</p></div><div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-indigo-200 shadow-sm w-full md:w-auto justify-between"><span className="font-mono text-xl font-bold tracking-widest text-slate-800" dir="ltr">{generatedKey}</span><div className="flex items-center gap-2 border-r border-slate-100 pr-4 mr-2"><button onClick={() => { navigator.clipboard.writeText(generatedKey); alert('تم النسخ!'); }} className="px-4 py-2 bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl">نسخ</button><button onClick={() => setGeneratedKey(null)} className="px-4 py-2 bg-slate-100 text-slate-500 hover:text-red-600 font-bold text-xs rounded-xl">إغلاق</button></div></div></motion.div>}</AnimatePresence>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {users.map(u => {
                  const isTargetSuperAdmin = SUPER_ADMINS.includes(u.email); const canEditTarget = !isTargetSuperAdmin || u.email === user.email; const canDeleteTarget = !isTargetSuperAdmin; 
                  return (
                    <div key={u.id} className={`p-5 md:p-6 rounded-2xl border shadow-sm flex flex-col gap-4 ${!u.is_active ? 'bg-yellow-50/50 border-yellow-200' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 font-bold text-xl shrink-0">{u.name[0]}</div><div className="flex-1 min-w-0"><div className="flex justify-between items-start"><span className="font-bold text-slate-900 truncate text-left text-base md:text-lg">{u.name}</span>{!u.is_active && <span className="shrink-0 px-2 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full mr-2">{lang === 'ar' ? 'بانتظار التفعيل' : 'Pending'}</span>}</div><p className="text-xs md:text-sm text-slate-500 truncate mt-1" dir="ltr">{u.email}</p><div className="flex gap-2 mt-2 flex-wrap"><span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isTargetSuperAdmin ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>{isTargetSuperAdmin ? 'Super Admin' : (u.role === 'admin' ? t.admin : (u.role === 'dentist' ? 'طبيب أسنان' : (u.role === 'doctor' ? t.doctor : (u.role === 'pharmacist' ? t.pharmacist : 'مريض'))))}</span><span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-wider">محفظة: {u.wallet_balance} ل.س</span></div></div></div>
                      
                      <div className="flex gap-2 border-t border-slate-100 pt-4 mt-auto">
                        {!u.is_active && <button onClick={() => approveUser(u.id)} className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 transition-colors text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"><CheckCircle size={14} /> تفعيل</button>}
                        {isSuperAdmin && <button onClick={() => handleAddWalletBalance(u.id)} className="flex-1 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors rounded-lg text-xs font-bold flex items-center justify-center gap-1"><Banknote size={14} /> شحن</button>}
                        {u.is_active && canEditTarget && <button onClick={() => { setEditingUser(u); setUserForm({ email: u.email, password: '', role: u.role, name: u.name, pharmacy_limit: u.pharmacy_limit || 10, phone: u.phone || '', notes: u.notes || '' }); setShowUserModal(true); }} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center"><Edit2 size={16} /></button>}
                        {canDeleteTarget && <button onClick={() => openConfirm(t.confirmTitle, 'هل أنت متأكد من الحذف؟', async () => { await api.delete(`/api/admin/users/${u.id}`); loadData(); })} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center"><Trash2 size={16} /></button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ... Services, Products, Orders, Settings, Profile rendering mapping (Using the same components defined above) ... */}
          {activeTab === 'services' && (user.role === 'doctor' || user.role === 'dentist' || user.role === 'admin') && (<motion.div key="services" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ServicesManager user={user} facilities={facilities.filter(f => f.type === 'clinic' || f.type === 'dental_clinic')} lang={lang} /></motion.div>)}
          {activeTab === 'products' && (user.role === 'admin' || hasEcommerce) && (<motion.div key="products" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ProductsManager user={user} facilities={facilities.filter(f => f.type === 'pharmacy')} lang={lang} /></motion.div>)}
          {activeTab === 'orders' && (user.role === 'admin' || hasEcommerce) && (<motion.div key="orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><OrdersManager user={user} facilities={facilities.filter(f => f.type === 'pharmacy')} lang={lang} /></motion.div>)}
          {activeTab === 'settings' && isSuperAdmin && (<motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-2xl"><h2 className="text-2xl md:text-3xl font-bold mb-8">إعدادات الفوتر</h2><form onSubmit={handleSaveFooter} className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">{footerMsg && <div className="p-3 bg-emerald-50 text-emerald-700 font-bold rounded-xl">{footerMsg}</div>}<div><label className="block text-sm font-bold mb-1">نص الحقوق (Copyright)</label><input className="w-full px-4 py-2 border rounded-xl" value={footerForm.copyright} onChange={e => setFooterForm({...footerForm, copyright: e.target.value})} /></div><div><label className="block text-sm font-bold mb-1">الوصف</label><input className="w-full px-4 py-2 border rounded-xl" value={footerForm.description} onChange={e => setFooterForm({...footerForm, description: e.target.value})} /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold mb-1">رابط فيسبوك</label><input type="url" className="w-full px-4 py-2 border rounded-xl text-left" dir="ltr" value={footerForm.facebook} onChange={e => setFooterForm({...footerForm, facebook: e.target.value})} /></div><div><label className="block text-sm font-bold mb-1">رابط انستغرام</label><input type="url" className="w-full px-4 py-2 border rounded-xl text-left" dir="ltr" value={footerForm.instagram} onChange={e => setFooterForm({...footerForm, instagram: e.target.value})} /></div><div><label className="block text-sm font-bold mb-1">رقم التواصل العام</label><input className="w-full px-4 py-2 border rounded-xl text-left" dir="ltr" value={footerForm.contact_phone} onChange={e => setFooterForm({...footerForm, contact_phone: e.target.value})} /></div><div><label className="block text-sm font-bold mb-1">رقم الشكاوى</label><input className="w-full px-4 py-2 border rounded-xl text-left" dir="ltr" value={footerForm.complaints_phone} onChange={e => setFooterForm({...footerForm, complaints_phone: e.target.value})} /></div></div><button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700">حفظ الإعدادات</button></form></motion.div>)}
          {activeTab === 'profile' && (<motion.div key="profile" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="max-w-2xl"><h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8">{t.profileSettings}</h2><form onSubmit={handleUpdateProfile} className="bg-white p-5 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5 md:space-y-6">{profileMsg && <div className={`p-4 rounded-xl text-sm font-bold ${profileMsg.includes('نجاح') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{profileMsg}</div>}<div><label className="block text-sm font-medium text-slate-700 mb-2">{t.fullName}</label><input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" value={profileName} onChange={e => setProfileName(e.target.value)} /></div><div><label className="block text-sm font-medium text-slate-700 mb-2">{t.email}</label><input type="email" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} /></div><div><label className="block text-sm font-medium text-slate-700 mb-2">{t.phone}</label><input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} /></div><div><label className="block text-sm font-medium text-slate-700 mb-2">{t.notes}</label><textarea className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" rows={3} value={profileNotes} onChange={e => setProfileNotes(e.target.value)} /></div><div><label className="block text-sm font-medium text-slate-700 mb-2">{t.newPassword}</label><input type="password" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-left" dir="ltr" value={profileNewPassword} onChange={e => setProfileNewPassword(e.target.value)} /></div><div className="pt-4 border-t border-slate-100"><label className="block text-sm font-medium text-slate-700 mb-2">{t.currentPassword}</label><input type="password" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 text-left" dir="ltr" value={profileCurrentPassword} onChange={e => setProfileCurrentPassword(e.target.value)} /></div><button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors">{t.saveChanges}</button></form></motion.div>)}
        </AnimatePresence>
      </div>

      {/* Modals for Facilities & Users */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl md:text-2xl font-bold mb-6">{editingData ? (lang === 'ar' ? 'تعديل البيانات' : 'Edit') : addButtonText}</h3>
              <form onSubmit={handleSaveFacility} className="space-y-4">
                {user.role === 'admin' && (<div><label className="block text-sm font-bold mb-2">نوع المنشأة</label><select className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option value="pharmacy">صيدلية</option><option value="clinic">عيادة طبية</option><option value="dental_clinic">عيادة أسنان</option></select></div>)}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{lang === 'ar' ? 'الاسم' : 'Name'}</label><input required className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                  {form.type === 'clinic' && (
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{lang === 'ar' ? 'تخصص العيادة' : 'Specialty'}</label>
                      <select className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 mb-2" value={form.specialty === '' ? '' : SPECIALTIES.includes(form.specialty) ? form.specialty : 'other'} onChange={e => { if (e.target.value === 'other') setForm({...form, specialty: 'تخصص آخر'}); else setForm({...form, specialty: e.target.value}); }}>
                        <option value="">{lang === 'ar' ? 'اختر التخصص...' : 'Select...'}</option>{SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}<option value="other">{lang === 'ar' ? 'أخرى (كتابة يدوية)' : 'Other'}</option>
                      </select>
                      {(form.specialty && !SPECIALTIES.includes(form.specialty)) && (
                         <input required placeholder={lang === 'ar' ? "اكتب التخصص هنا..." : "Type here..."} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={form.specialty === 'تخصص آخر' ? '' : form.specialty} onChange={e => setForm({...form, specialty: e.target.value})} />
                      )}
                    </div>
                  )}
                  {(form.type === 'clinic' || form.type === 'dental_clinic') && (
                    <>
                      <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{lang === 'ar' ? 'سعر الكشف (ل.س)' : 'Consultation Fee'}</label><input type="number" required className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={form.consultation_fee} onChange={e => setForm({...form, consultation_fee: e.target.value})} /></div>
                      <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{lang === 'ar' ? 'مدة الانتظار التقريبية' : 'Wait Time'}</label><input required placeholder="مثال: 15 دقيقة" className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={form.waiting_time} onChange={e => setForm({...form, waiting_time: e.target.value})} /></div>
                    </>
                  )}
                  <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{lang === 'ar' ? 'العنوان' : 'Address'}</label><input required className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{lang === 'ar' ? 'الهاتف' : 'Phone'}</label><input required className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{lang === 'ar' ? 'الواتساب (اختياري)' : 'WhatsApp'}</label><input className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={form.whatsapp_phone} onChange={e => setForm({...form, whatsapp_phone: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{lang === 'ar' ? 'اسم المسؤول' : 'In Charge'}</label><input className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={form.pharmacist_name} onChange={e => setForm({...form, pharmacist_name: e.target.value})} /></div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{lang === 'ar' ? 'صورة/شعار' : 'Logo/Image'}</label>
                    <div className="flex items-center gap-3">
                      <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${uploadingImage ? 'bg-slate-50 border-slate-300 text-slate-400' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                        {uploadingImage ? <span className="animate-spin h-5 w-5 border-2 border-blue-600 rounded-full border-t-transparent"></span> : <UploadCloud size={20} />}
                        <span className="font-bold text-sm">{uploadingImage ? (lang === 'ar' ? 'جاري الرفع...' : 'Uploading...') : (lang === 'ar' ? 'اضغط لرفع صورة' : 'Click to Upload')}</span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                      </label>
                      {form.image_url && <img src={form.image_url} alt="preview" className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm" />}
                    </div>
                  </div>
                </div>

                <div className="h-[150px] md:h-[200px] rounded-2xl overflow-hidden border border-slate-200 z-0 relative mt-4"><MapContainer center={[form.latitude || 35.25, form.longitude || 36.7]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><LocationPicker onLocationSelect={(lat, lng) => setForm({...form, latitude: lat, longitude: lng})} initialPosition={form.latitude && form.longitude ? [form.latitude, form.longitude] : undefined} />{editingData && <RecenterMap position={[form.latitude || 35.25, form.longitude || 36.7]} />}</MapContainer></div>
                
                <div className="border-t border-slate-200 pt-6 mt-6">
                  <h4 className="font-bold text-lg mb-4 flex items-center gap-2"><Calendar className="text-blue-500"/> أوقات الدوام الأسبوعي</h4>
                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">{(lang === 'en' ? DAYS_OF_WEEK_EN : DAYS_OF_WEEK_AR).map((day, idx) => { const dayHours = form.working_hours[idx.toString()] || { isOpen: false, start: '00:00', end: '00:00' }; return <div key={idx} className={`flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-xl border ${dayHours.isOpen ? 'border-blue-200 shadow-sm' : 'border-slate-200'} transition-all`}><div className="flex items-center gap-3 w-full sm:w-1/3"><input type="checkbox" className="w-5 h-5 accent-blue-600 rounded cursor-pointer" checked={dayHours.isOpen} onChange={e => setForm({...form, working_hours: {...form.working_hours, [idx]: {...dayHours, isOpen: e.target.checked}}})} /><span className={`font-bold w-20 ${dayHours.isOpen ? 'text-slate-900' : 'text-slate-400'}`}>{day}</span></div>{dayHours.isOpen ? <div className="flex items-center gap-2 w-full sm:w-2/3" dir="ltr"><span className="text-xs font-bold text-slate-400">{lang === 'ar' ? 'من' : 'From'}</span><input type="time" className="border border-slate-200 px-3 py-2 rounded-lg font-mono text-sm w-full outline-none focus:ring-2 focus:ring-blue-500" value={dayHours.start} onChange={e => setForm({...form, working_hours: {...form.working_hours, [idx]: {...dayHours, start: e.target.value}}})} /><span className="text-xs font-bold text-slate-400 px-1">{lang === 'ar' ? 'إلى' : 'To'}</span><input type="time" className="border border-slate-200 px-3 py-2 rounded-lg font-mono text-sm w-full outline-none focus:ring-2 focus:ring-blue-500" value={dayHours.end} onChange={e => setForm({...form, working_hours: {...form.working_hours, [idx]: {...dayHours, end: e.target.value}}})} /></div> : <div className="w-full sm:w-2/3 text-red-500 font-bold px-4 flex items-center justify-center bg-red-50 py-2 rounded-lg">{lang === 'ar' ? 'عطلة - مغلق' : 'Day Off'}</div>}</div>; })}</div>
                </div>

                {user.role === 'admin' && (<div className="pt-4 border-t border-slate-200"><label className="block text-sm font-medium mb-1">ربط المنشأة بكادر طبي</label><select className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" value={form.doctor_id} onChange={e => setForm({...form, doctor_id: parseInt(e.target.value)})}> <option value="0">بدون مالك</option>{users.filter(u => u.role !== 'admin' && u.role !== 'patient').map(d => <option key={d.id} value={d.id}>{d.name} ({d.role === 'dentist' ? 'طبيب أسنان' : (d.role === 'doctor' ? 'طبيب' : 'صيدلي')})</option>)}</select></div>)}
                <div className="flex gap-3 pt-6 border-t border-slate-200"><button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button><button type="submit" disabled={uploadingImage} className="flex-1 py-4 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50">{lang === 'ar' ? 'حفظ' : 'Save'}</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ConfirmModal isOpen={confirmData.isOpen} onClose={() => setConfirmData(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmData.onConfirm} title={confirmData.title} body={confirmData.body} t={t} />
    </div>
  );
};

// 8. --- Main App Root Component (Handles Routing) ---
export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [view, setView] = useState<'public' | 'login' | 'dashboard'>('public');
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [footerData, setFooterData] = useState<FooterSettings | null>(null);
  const t = translations[lang] || translations['ar'];

  useEffect(() => { document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; document.documentElement.lang = lang; }, [lang]);
  useEffect(() => {
    api.get('/api/auth/me').then(data => { 
      setUser(data.user); 
      // توجيه المريض للصفحة العامة دائماً بدلاً من لوحة التحكم
      setView(data.user.role === 'patient' ? 'public' : 'dashboard'); 
    }).catch(() => setView('public')).finally(() => setLoading(false));
    api.get('/api/public/settings').then(data => { if(Object.keys(data).length > 0) setFooterData(data); }).catch(console.error);
  }, []);

  const handleLogin = (u: UserType) => { 
    setUser(u); 
    setView(u.role === 'patient' ? 'public' : 'dashboard'); 
  };
  const handleLogout = async () => { await api.post('/api/auth/logout', {}); setUser(null); setView('public'); };
  const refreshUser = () => { api.get('/api/auth/me').then(data => setUser(data.user)).catch(console.error); };

  if (loading) return null;

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-slate-50">
      {view !== 'dashboard' && (
        <nav className="bg-white border-b px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-40 backdrop-blur-md bg-white/90 shadow-sm">
          <button onClick={() => setView('public')} className="text-xl font-bold flex items-center gap-2"><img src="/logo.png" className="w-8 h-8"/> <span className="hidden sm:inline">{lang === 'ar' ? 'طيبة الامام الصحية' : 'Taibet Health'}</span></button>
          <div className="flex gap-2 md:gap-4 items-center">
            
            {/* عرض المحفظة للمريض في الصفحة العامة */}
            {user && user.role === 'patient' && (
              <div className="bg-blue-50 text-blue-700 px-3 md:px-4 py-1.5 rounded-full flex items-center gap-2 text-xs md:text-sm font-bold border border-blue-200 shadow-sm">
                <Wallet size={16}/> <span dir="ltr">{user.wallet_balance || '0.00'} ل.س</span>
              </div>
            )}

            <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-bold border border-slate-200 hover:bg-slate-50 transition-colors">{lang === 'ar' ? 'English' : 'العربية'}</button>
            
            {user ? (
              <div className="flex gap-2">
                {user.role !== 'patient' && view === 'public' && (
                  <button onClick={() => setView('dashboard')} className="bg-slate-900 text-white px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-bold hover:bg-slate-800 transition-colors shadow-md">{lang === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</button>
                )}
                <button onClick={handleLogout} className="bg-red-50 text-red-600 px-3 md:px-4 py-1.5 rounded-full flex items-center gap-1 text-xs md:text-sm font-bold hover:bg-red-100 transition-colors">
                  <LogOut size={16}/> <span className="hidden sm:inline">{lang === 'ar' ? 'خروج' : 'Logout'}</span>
                </button>
              </div>
            ) : (
              <button onClick={() => setView(view === 'public' ? 'login' : 'public')} className="bg-blue-600 text-white px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-bold hover:bg-blue-700 transition-colors shadow-md">{view === 'public' ? t.staffLogin : t.backToPublic}</button>
            )}

          </div>
        </nav>
      )}
      
      <main className="flex-1">
        {view === 'public' && <PublicView onLogin={() => setView('login')} user={user} refreshUser={refreshUser} lang={lang} t={t} />}
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
// force update files