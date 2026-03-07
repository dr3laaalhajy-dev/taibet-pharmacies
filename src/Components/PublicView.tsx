import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, MapPin, Phone, User, Activity, Search, Clock, MessageCircle, CheckCircle, Stethoscope, BriefcaseMedical, ShoppingCart, Store, Package, ShoppingBag, ArrowRight, Minus, XCircle, Smile, Star, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Facility, Product, CartItem, UserType, DAYS_OF_WEEK_AR, DAYS_OF_WEEK_EN, SPECIALTIES } from '../types';
import { api } from '../api-client';
import { checkIsOpenNow, formatTime12h, getDistanceKm } from '../helpers';

const CurrencyToggle = ({ currency, setCurrency, lang }: { currency: 'old' | 'new', setCurrency: (c: 'old' | 'new') => void, lang: string }) => (
  <div className="bg-white/80 backdrop-blur-md shadow-sm rounded-full p-1 flex items-center border border-slate-200 w-fit">
    <button onClick={() => setCurrency('new')} className={`px-3 md:px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-all ${currency === 'new' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>{lang === 'ar' ? 'ل.س جديدة' : 'New L.S'}</button>
    <button onClick={() => setCurrency('old')} className={`px-3 md:px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-all ${currency === 'old' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>{lang === 'ar' ? 'ل.س قديمة' : 'Old L.S'}</button>
  </div>
);

// 🟢 مكون عرض النجوم
const StarRating = ({ rating, size = 16, className = "" }: { rating: number, size?: number, className?: string }) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={size} className={star <= Math.round(rating) ? "text-yellow-400 fill-current" : "text-slate-300"} />
      ))}
    </div>
  );
};

// ⭐ نافذة الملف الشخصي والتقييم
const DoctorProfileModal = ({ doctorId, onClose, t, lang, currency, currentUser }: { doctorId: number, onClose: () => void, t: any, lang: string, currency: 'old'|'new', currentUser: UserType | null }) => {
  const [doctor, setDoctor] = useState<any | null>(null); 
  const [loading, setLoading] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // حالة التقييم
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [userComment, setUserComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchDoctorData = () => {
    api.get(`/api/public/doctors/${doctorId}`).then(setDoctor).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchDoctorData(); }, [doctorId]);
  if (!doctorId) return null;

  const fee = doctor?.consultation_price || doctor?.facilities[0]?.consultation_fee || 0;
  const displayFee = currency === 'new' ? Number(fee) / 100 : Number(fee);
  const currencyLabel = currency === 'new' ? (lang === 'ar' ? 'ل.س جديدة' : 'New L.S') : (lang === 'ar' ? 'ل.س' : 'L.S');

  const submitReview = async () => {
    if (!currentUser) return toast.error(lang === 'ar' ? 'يجب تسجيل الدخول لتقييم الطبيب' : 'Please login to submit a review');
    if (userRating === 0) return toast.error(lang === 'ar' ? 'الرجاء اختيار عدد النجوم' : 'Please select stars');
    
    setSubmittingReview(true);
    try {
      await api.post(`/api/public/doctors/${doctorId}/review`, { rating: userRating, comment: userComment });
      toast.success(lang === 'ar' ? 'شكراً لتقييمك! تم الحفظ بنجاح' : 'Thank you! Review saved');
      fetchDoctorData(); // تحديث بيانات الطبيب ليعرض التقييم الجديد
      setUserRating(0); setUserComment('');
    } catch(err: any) {
      toast.error(err.error || 'حدث خطأ');
    } finally {
      setSubmittingReview(false);
    }
  };

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
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-4xl font-bold shrink-0 shadow-sm overflow-hidden border-2 border-white outline outline-1 outline-slate-200">
                  {doctor.profile_picture || doctor.facilities[0]?.image_url ? <img src={doctor.profile_picture || doctor.facilities[0]?.image_url} className="w-full h-full object-cover"/> : doctor.name[0]}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-extrabold text-slate-900 mb-1">{lang === 'ar' ? 'دكتور' : 'Dr.'} {doctor.name}</h2>
                  <p className="text-blue-600 font-bold mb-3">{doctor.specialty || doctor.facilities[0]?.specialty || (doctor.role === 'dentist' ? (lang === 'ar'?'طبيب أسنان':'Dentist') : t.doctor)}</p>
                  
                  {/* ⭐ عرض التقييم الحالي للطبيب */}
                  <div className="flex items-center gap-2 mb-4">
                    <StarRating rating={Number(doctor.average_rating)} size={18} />
                    <span className="text-sm font-bold text-slate-700">{Number(doctor.average_rating).toFixed(1)}</span>
                    <span className="text-xs text-slate-400">({doctor.reviews_count} {lang === 'ar' ? 'تقييمات' : 'reviews'})</span>
                  </div>

                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><User className="text-blue-500"/> {lang === 'ar' ? 'معلومات عن الطبيب' : 'About Doctor'}</h4>
                <p className="text-slate-600 leading-relaxed mb-6 whitespace-pre-line">{doctor.about || doctor.notes || (lang === 'ar' ? 'لا توجد نبذة تعريفية حالياً.' : 'No bio available.')}</p>
                
                <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Stethoscope className="text-blue-500"/> {lang === 'ar' ? 'الأعراض والخدمات' : 'Services & Symptoms'}</h4>
                <div className="flex flex-wrap gap-2">
                  {doctor.facilities[0]?.services ? (
                    doctor.facilities[0].services.split(/[\n,]+/).map((s: string, i: number) => s.trim() && <span key={i} className="px-4 py-2 bg-blue-50 text-blue-700 font-bold text-sm rounded-lg border border-blue-100">{s.trim()}</span>)
                  ) : (
                    <span className="text-sm text-slate-400">{lang === 'ar' ? 'لم يقم الطبيب بإضافة الخدمات بعد.' : 'No services listed.'}</span>
                  )}
                </div>

                {doctor.faqs && doctor.faqs.length > 0 && (
                  <div className="mt-8 border-t border-slate-100 pt-6">
                    <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <MessageCircle className="text-emerald-500" /> 
                      {lang === 'ar' ? 'أسئلة طبية شائعة يطرحها المرضى' : 'Medical FAQs'}
                    </h4>
                    <div className="space-y-3">
                      {doctor.faqs.map((faq: any, idx: number) => (
                        <div key={faq.id || idx} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden transition-all">
                          <button 
                            onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)} 
                            className="w-full text-left px-4 py-4 font-bold text-slate-800 flex justify-between items-center hover:bg-slate-100 transition-colors"
                          >
                            <span className={lang === 'ar' ? 'text-right' : 'text-left'}>{faq.question}</span>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${expandedFaq === faq.id ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>
                              {expandedFaq === faq.id ? <Minus size={14} /> : <Plus size={14} />}
                            </div>
                          </button>
                          <AnimatePresence>
                            {expandedFaq === faq.id && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 pb-4 text-slate-600 text-sm leading-relaxed border-t border-slate-200 pt-3">
                                {faq.answer}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* ⭐ قسم التقييم الجديد للمرضى */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
                <h4 className="text-lg font-bold text-slate-900 mb-2">{lang === 'ar' ? 'ما رأيك في تجربتك مع الطبيب؟' : 'Rate your experience'}</h4>
                <p className="text-sm text-slate-500 mb-4">{lang === 'ar' ? 'تقييمك يساعد المرضى الآخرين في اتخاذ القرار الصحيح.' : 'Your review helps others make better choices.'}</p>
                
                {currentUser ? (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button 
                          key={star} 
                          onClick={() => setUserRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="focus:outline-none transition-transform hover:scale-110"
                        >
                          <Star size={32} className={(hoverRating || userRating) >= star ? "text-yellow-400 fill-current" : "text-slate-300"} />
                        </button>
                      ))}
                    </div>
                    <textarea 
                      placeholder={lang === 'ar' ? "أضف تعليقاً يصف تجربتك (اختياري)..." : "Write a comment (optional)..."} 
                      className="w-full px-4 py-3 rounded-xl border border-blue-200 focus:border-blue-500 outline-none resize-none bg-white"
                      rows={3}
                      value={userComment}
                      onChange={e => setUserComment(e.target.value)}
                    ></textarea>
                    <button 
                      onClick={submitReview} 
                      disabled={submittingReview || userRating === 0} 
                      className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {submittingReview ? '...' : (lang === 'ar' ? 'إرسال التقييم' : 'Submit Review')}
                    </button>
                  </div>
                ) : (
                  <div className="bg-white/60 p-4 rounded-xl text-center border border-white">
                    <p className="text-sm font-bold text-slate-600">{lang === 'ar' ? 'يجب تسجيل الدخول كـ مريض لتتمكن من التقييم.' : 'Please login to rate.'}</p>
                  </div>
                )}
              </div>

            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-blue-200 shadow-lg overflow-hidden sticky top-6">
                <div className="bg-blue-600 text-white text-center py-3 font-bold">{lang === 'ar' ? 'معلومات الحجز' : 'Booking Info'}</div>
                <div className="p-5">
                  <div className="flex justify-between items-center text-center border-b border-slate-100 pb-4 mb-4">
                    <div><Activity className="mx-auto text-emerald-500 mb-1"/><span className="block text-xs text-slate-400 mb-1">{lang === 'ar' ? 'سعر الكشف' : 'Consultation'}</span><span className="font-bold text-slate-800">{displayFee.toLocaleString()} {currencyLabel}</span></div>
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

const DoctorsDirectoryView = ({ onBack, lang, t, filterRole, currency, setCurrency, currentUser }: { onBack: () => void, lang: string, t: any, filterRole: 'doctor' | 'dentist', currency: 'old'|'new', setCurrency: (c:'old'|'new')=>void, currentUser: UserType | null }) => {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [searchSpecialty, setSearchSpecialty] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(300000); 
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);

  useEffect(() => { api.get('/api/public/doctors').then(setDoctors).catch(console.error).finally(() => setLoading(false)); }, []);

  const filteredDoctors = doctors.filter(d => {
    const roleMatch = d.role === filterRole;
    const matchName = d.name.toLowerCase().includes(searchName.toLowerCase());
    const matchSpecialty = searchSpecialty && filterRole === 'doctor' ? d.specialty === searchSpecialty : true;
    const matchPrice = d.consultation_price ? d.consultation_price <= maxPrice : true;
    return roleMatch && matchName && matchSpecialty && matchPrice;
  });

  const currencyLabel = currency === 'new' ? (lang === 'ar' ? 'ل.س جديدة' : 'New L.S') : (lang === 'ar' ? 'ل.س' : 'L.S');
  const directoryTitle = filterRole === 'dentist' ? (lang === 'ar' ? 'دليل أطباء الأسنان' : 'Dentists Directory') : (lang === 'ar' ? 'دليل الأطباء البشري' : 'Medical Doctors Directory');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full animate-in fade-in duration-500 min-h-[80vh]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold transition-colors"><ArrowRight size={20}/> {lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</button>
        <CurrencyToggle currency={currency} setCurrency={setCurrency} lang={lang} />
      </div>

      <div className="text-center mb-12">
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border ${filterRole === 'dentist' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
          {filterRole === 'dentist' ? <Smile size={40}/> : <Stethoscope size={40}/>}
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">{directoryTitle}</h1>
        <p className="text-slate-500 max-w-xl mx-auto">{lang === 'ar' ? 'تصفح قائمة الأطباء المعتمدين، ابحث بالاسم، وقارن أسعار الكشفية لتحجز موعدك بسهولة.' : 'Browse certified doctors and compare fees.'}</p>
      </div>

      <div className={`bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm mb-12 grid grid-cols-1 ${filterRole === 'doctor' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6 relative z-10`}>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">{lang === 'ar' ? 'البحث بالاسم' : 'Search by Name'}</label>
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
            <input type="text" className="w-full pr-12 pl-4 py-3.5 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-colors" placeholder={lang === 'ar' ? 'اسم الطبيب...' : 'Doctor name...'} value={searchName} onChange={e => setSearchName(e.target.value)} />
          </div>
        </div>
        
        {filterRole === 'doctor' && (
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">{lang === 'ar' ? 'التخصص الطبي' : 'Specialty'}</label>
            <select className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-colors bg-white cursor-pointer" value={searchSpecialty} onChange={e => setSearchSpecialty(e.target.value)}>
              <option value="">{lang === 'ar' ? 'جميع التخصصات' : 'All Specialties'}</option>
              {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2 flex justify-between">
            <span>{lang === 'ar' ? 'سعر الكشف (الحد الأقصى)' : 'Max Consultation Fee'}</span>
            <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{(currency === 'new' ? maxPrice / 100 : maxPrice).toLocaleString()} {currencyLabel}</span>
          </label>
          <input type="range" min="0" max="300000" step="5000" className="w-full mt-3 accent-blue-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} />
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>0</span>
            <span>{currency === 'new' ? '3,000+' : '300,000+'}</span>
          </div>
        </div>
      </div>

      {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-600"></div></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDoctors.map(doctor => {
            const fee = doctor.consultation_price || 0;
            return (
            <div key={doctor.id} onClick={() => setSelectedDoctorId(doctor.id)} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer text-center group flex flex-col h-full relative overflow-hidden">
              
              {/* ⭐ شارة التقييم فوق صورة الطبيب */}
              <div className="absolute top-4 right-4 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                <Star size={12} className="fill-current" /> {Number(doctor.average_rating).toFixed(1)}
              </div>

              <div className="w-24 h-24 mx-auto bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl font-bold mb-4 shadow-sm group-hover:scale-110 transition-transform overflow-hidden outline outline-4 outline-slate-50">
                {doctor.profile_picture ? <img src={doctor.profile_picture} className="w-full h-full object-cover"/> : doctor.name[0]}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1 line-clamp-1">{lang === 'ar' ? 'د.' : 'Dr.'} {doctor.name}</h3>
              <p className={`text-sm font-bold mb-4 ${filterRole === 'dentist' ? 'text-indigo-600' : 'text-blue-600'}`}>{doctor.specialty || (doctor.role === 'dentist' ? (lang === 'ar' ? 'طبيب أسنان' : 'Dentist') : t.doctor)}</p>
              
              <div className="mt-auto pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs text-slate-500 font-bold">{lang === 'ar' ? 'سعر الكشف' : 'Fee'}</span>
                  <span className="text-sm font-extrabold text-slate-800 bg-slate-50 px-2 py-1 rounded-lg">{(currency === 'new' ? fee / 100 : fee).toLocaleString()} {currencyLabel}</span>
                </div>
                <button className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl text-sm font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">{lang === 'ar' ? 'عرض الملف والحجز' : 'View Profile & Book'}</button>
              </div>
            </div>
          )})}
          {filteredDoctors.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-500 flex flex-col items-center">
              <Search size={48} className="text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-700 mb-2">{lang === 'ar' ? 'لا يوجد أطباء يطابقون بحثك' : 'No doctors match your search'}</h3>
              <p>{lang === 'ar' ? 'حاول تغيير شروط البحث لتشمل نتائج أكثر.' : 'Try adjusting your filters.'}</p>
            </div>
          )}
        </div>
      )}
      <AnimatePresence>
        {selectedDoctorId && <DoctorProfileModal doctorId={selectedDoctorId} onClose={() => setSelectedDoctorId(null)} t={t} lang={lang} currency={currency} currentUser={currentUser} />}
      </AnimatePresence>
    </div>
  );
};

const PublicShopView = ({ onBack, facilities, lang, user, refreshUser, currency, setCurrency, defaultAddress }: { onBack: () => void, facilities: Facility[], lang: string, user: UserType | null, refreshUser: () => void, currency: 'old' | 'new', setCurrency: (c:'old'|'new')=>void, defaultAddress: string }) => {
  const [products, setProducts] = useState<Product[]>([]); const [searchQuery, setSearchQuery] = useState(''); const [selectedPharmacyId, setSelectedPharmacyId] = useState<number | null>(null); const [loading, setLoading] = useState(true); const [cart, setCart] = useState<CartItem[]>([]); const [showCart, setShowCart] = useState(false); const [orderSuccess, setOrderSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet'>('cash');

  useEffect(() => { api.get('/api/public/products').then(setProducts).finally(() => setLoading(false)); }, []);
  const ecommercePharmacies = facilities.filter(f => f.is_ecommerce_enabled); const selectedPharmacy = facilities.find(f => f.id === selectedPharmacyId);
  useEffect(() => { setCart([]); setOrderSuccess(false); }, [selectedPharmacyId]);
  const filteredProducts = products.filter(p => { const matchSearch = p.name.includes(searchQuery) || (p.pharmacy_name?.includes(searchQuery) && !selectedPharmacyId); const matchPharmacy = selectedPharmacyId ? p.pharmacy_id === selectedPharmacyId : true; return matchSearch && matchPharmacy; });
  
  const addToCart = (p: Product) => { setCart(prev => { const exists = prev.find(item => item.product_id === p.id); const limit = p.max_per_user || p.quantity; if (exists) { if (exists.qty >= limit || exists.qty >= p.quantity) return prev; return prev.map(item => item.product_id === p.id ? { ...item, qty: item.qty + 1 } : item); } return [...prev, { ...p, product_id: p.id, qty: 1 }]; }); };
  const removeFromCart = (id: number) => setCart(prev => prev.filter(item => item.product_id !== id));
  const updateQty = (id: number, delta: number, maxAllowed: number, totalStock: number) => { setCart(prev => prev.map(item => { if (item.product_id === id) { const newQty = item.qty + delta; if (newQty > 0 && newQty <= Math.min(maxAllowed || totalStock, totalStock)) return { ...item, qty: newQty }; } return item; })); };
  
  const cartTotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.qty), 0);
  const currencyLabel = currency === 'new' ? (lang === 'ar' ? 'ل.س جديدة' : 'New L.S') : (lang === 'ar' ? 'ل.س' : 'L.S');

  const submitOrder = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    if(cart.length === 0) return; 
  
    if (!user) {
      toast.error(lang === 'ar' ? 'يجب تسجيل الدخول كـ (مريض/مستخدم) لتتمكن من الطلب.' : 'Please login to order.');
      return;
    }
    
    if (paymentMethod === 'wallet') {
      if (parseFloat(user.wallet_balance || '0') < cartTotal) { 
        toast.error(lang === 'ar' ? 'رصيد المحفظة غير كافٍ!' : 'Insufficient wallet balance.'); 
        return; 
      }
    }
  
    try { 
      await api.post('/api/public/orders', { 
        pharmacy_id: selectedPharmacyId, 
        customer_name: user.name, 
        customer_phone: user.phone || 'بدون رقم', 
        delivery_address: defaultAddress || 'بدون عنوان', 
        items: cart, 
        total_price: cartTotal.toString(), 
        payment_method: paymentMethod 
      }); 
      setOrderSuccess(true); setCart([]); setShowCart(false); 
      if (paymentMethod === 'wallet') refreshUser(); 
    } catch(err: any) { 
      toast.error(err.error || (lang === 'ar' ? 'فشل إرسال الطلب' : 'Failed to submit order')); 
    } 
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full animate-in fade-in duration-500 min-h-[80vh]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 font-bold transition-colors"><ArrowRight size={20}/> {lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</button>
        <CurrencyToggle currency={currency} setCurrency={setCurrency} lang={lang} />
      </div>

      {selectedPharmacyId && cart.length > 0 && !showCart && (<button onClick={() => setShowCart(true)} className="fixed bottom-8 left-8 bg-slate-900 text-white p-4 rounded-full shadow-2xl z-50 flex items-center justify-center animate-bounce hover:bg-slate-800"><ShoppingCart size={24} /><span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{cart.length}</span></button>)}
      <AnimatePresence>
        {showCart && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="bg-white w-full md:w-[400px] h-full shadow-2xl flex flex-col">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50"><h2 className="text-xl font-bold flex items-center gap-2"><ShoppingCart className="text-emerald-500"/> {lang === 'ar' ? 'سلة المشتريات' : 'Shopping Cart'}</h2><button onClick={() => setShowCart(false)} className="p-2 hover:bg-slate-200 rounded-full"><XCircle size={24}/></button></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {cart.map(item => (
                  <div key={item.product_id} className="flex items-center gap-4 bg-white p-3 border rounded-2xl shadow-sm">
                    {item.image_url ? <img src={item.image_url} className="w-16 h-16 object-cover rounded-xl"/> : <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center"><Package size={20}/></div>}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm line-clamp-1">{item.name}</h4>
                      <p className="text-emerald-600 font-bold text-sm" dir="ltr">{(parseFloat(item.price) / (currency === 'new' ? 100 : 1)).toLocaleString()} {currencyLabel}</p>
                      <div className="flex items-center gap-3 mt-2"><button onClick={() => updateQty(item.product_id, 1, item.max_per_user || item.quantity, item.quantity)} className="bg-slate-100 p-1 rounded-md hover:bg-slate-200"><Plus size={14}/></button><span className="font-bold text-sm">{item.qty}</span><button onClick={() => updateQty(item.product_id, -1, item.max_per_user || item.quantity, item.quantity)} className="bg-slate-100 p-1 rounded-md hover:bg-slate-200"><Minus size={14}/></button></div>
                    </div>
                    <button onClick={() => removeFromCart(item.product_id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>
              <div className="p-6 border-t bg-slate-50">
                <div className="flex justify-between items-center mb-4 text-lg font-bold">
                  <span>{lang === 'ar' ? 'المجموع الكلي:' : 'Total:'}</span>
                  <span dir="ltr" className="text-emerald-600">{(cartTotal / (currency === 'new' ? 100 : 1)).toLocaleString()} {currencyLabel}</span>
                </div>
                
                <div className="mb-4 bg-white p-3 border border-slate-200 rounded-xl shadow-sm">
                  <p className="text-xs text-slate-500 font-bold mb-1">{lang === 'ar' ? 'سيتم التوصيل إلى:' : 'Delivery to:'}</p>
                  <p className="text-sm font-medium text-slate-800 flex items-start gap-2">
                    <MapPin size={16} className="text-blue-500 shrink-0 mt-0.5"/> 
                    {defaultAddress || (lang === 'ar' ? 'يرجى إضافة عنوان من الإعدادات!' : 'Please add address in settings!')}
                  </p>
                </div>

                <div className="flex gap-2 mb-4">
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer font-bold text-sm transition-colors ${paymentMethod === 'cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                    <input type="radio" className="hidden" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} />
                    💵 {lang === 'ar' ? 'الدفع عند الاستلام' : 'Cash'}
                  </label>
                  <label className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 cursor-pointer font-bold text-sm transition-colors ${paymentMethod === 'wallet' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                    <input type="radio" className="hidden" checked={paymentMethod === 'wallet'} onChange={() => setPaymentMethod('wallet')} />
                    <div className="flex items-center gap-1">💳 {lang === 'ar' ? 'المحفظة' : 'Wallet'}</div>
                    {user && <span className="text-[10px] font-mono">{(parseFloat(user.wallet_balance || '0') / (currency === 'new' ? 100 : 1)).toLocaleString()} {currencyLabel}</span>}
                  </label>
                </div>
                
                <button onClick={submitOrder} disabled={!defaultAddress} className="w-full bg-emerald-500 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{lang === 'ar' ? 'تأكيد وإرسال الطلب' : 'Confirm Order'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <div className="text-center mb-12"><div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100"><ShoppingBag size={40}/></div><h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">{lang === 'ar' ? <>السوق <span className="text-emerald-500">الطبي</span></> : <>Medical <span className="text-emerald-500">Store</span></>}</h1><p className="text-slate-500 max-w-xl mx-auto">{selectedPharmacy ? (lang === 'ar' ? `تسوق منتجات ${selectedPharmacy.name} واطلبها مباشرة.` : `Shop ${selectedPharmacy.name} products directly.`) : (lang === 'ar' ? 'اختر صيدلية من القائمة أدناه لبدء التسوق وتصفح المنتجات المتاحة لديها.' : 'Choose a pharmacy below to start shopping.')}</p></div>
      {orderSuccess && (<div className="max-w-2xl mx-auto bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-3xl text-center mb-8"><CheckCircle size={40} className="mx-auto mb-3 text-emerald-500"/><h3 className="text-xl font-bold mb-2">{lang === 'ar' ? 'تم إرسال طلبك بنجاح!' : 'Order submitted successfully!'}</h3><p>{lang === 'ar' ? 'سيتواصل معك الصيدلي قريباً.' : 'The pharmacist will contact you soon.'}</p></div>)}
      {!selectedPharmacyId ? (<div className="mb-16"><h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Store className="text-indigo-500"/> {lang === 'ar' ? 'الصيدليات المتاحة للتسوق' : 'Pharmacies Available for Shopping'}</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{ecommercePharmacies.map(ph => (<div key={ph.id} onClick={() => { setSelectedPharmacyId(ph.id); setSearchQuery(''); }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all flex items-center gap-4">{ph.image_url ? <img src={ph.image_url} className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100"/> : <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center shrink-0"><Store size={24}/></div>}<div><h3 className="font-bold text-lg text-slate-900 line-clamp-1">{ph.name}</h3><p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin size={12}/> {ph.address}</p><span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md font-bold mt-2 inline-block">{lang === 'ar' ? 'اضغط لبدء التسوق' : 'Click to shop'}</span></div></div>))}{ecommercePharmacies.length === 0 && <div className="col-span-full text-center py-10 text-slate-500">{lang === 'ar' ? 'لا توجد صيدليات مفعلة حالياً.' : 'No pharmacies available right now.'}</div>}</div></div>) : (<><div className="mb-8 flex justify-between items-center bg-indigo-50 p-4 rounded-2xl border border-indigo-100"><div className="flex items-center gap-3"><Store className="text-indigo-500"/><h2 className="font-bold text-indigo-900 text-lg">{lang === 'ar' ? `منتجات ${selectedPharmacy?.name}` : `${selectedPharmacy?.name} Products`}</h2></div><button onClick={() => { setSelectedPharmacyId(null); setSearchQuery(''); }} className="text-xs font-bold bg-white text-indigo-600 px-4 py-2 rounded-lg shadow-sm border border-indigo-200">{lang === 'ar' ? 'تغيير الصيدلية' : 'Change Pharmacy'}</button></div><div className="max-w-2xl mx-auto relative mb-12"><Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="text" placeholder={lang === 'ar' ? "ابحث عن دواء أو منتج..." : "Search for a product..."} className="w-full pr-12 pl-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 outline-none shadow-sm text-lg transition-colors" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>{loading ? (<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500"></div></div>) : (<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">{filteredProducts.map(p => { const inCart = cart.find(i => i.product_id === p.id); const isMaxed = inCart && inCart.qty >= (p.max_per_user || p.quantity); const isOutOfStock = p.quantity <= 0; return (
        <div key={p.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-shadow group flex flex-col">
          <div className="aspect-square bg-slate-50 relative overflow-hidden">{p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={48}/></div>}{isOutOfStock && <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center"><span className="bg-red-500 text-white font-bold px-4 py-1.5 rounded-full text-sm shadow-md rotate-[-12deg]">{lang === 'ar' ? 'نفذت الكمية' : 'Out of Stock'}</span></div>}</div>
          <div className="p-4 flex flex-col flex-1">
            <h3 className="font-bold text-slate-900 line-clamp-2 text-sm md:text-base leading-snug mb-2">{p.name}</h3>
            {p.max_per_user && <span className="text-[10px] text-red-500 mb-2 block font-bold">{lang === 'ar' ? `الحد الأقصى للفرد: ${p.max_per_user}` : `Max per user: ${p.max_per_user}`}</span>}
            <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="font-extrabold text-lg text-slate-900" dir="ltr">{(parseFloat(p.price) / (currency === 'new' ? 100 : 1)).toLocaleString()} {currencyLabel}</span>
            </div>
            {!isOutOfStock && (<button onClick={() => addToCart(p)} disabled={!!isMaxed} className={`mt-3 w-full py-2 rounded-xl text-xs font-bold flex justify-center items-center gap-1 transition-colors ${isMaxed ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}><Plus size={14}/> {isMaxed ? (lang === 'ar' ? 'الحد الأقصى' : 'Max Reached') : (lang === 'ar' ? 'أضف للسلة' : 'Add to Cart')}</button>)}
          </div>
        </div>
      ); })}{filteredProducts.length === 0 && <div className="col-span-full py-20 text-center text-slate-500"><Package className="mx-auto mb-4 text-slate-300" size={48}/><p>{lang === 'ar' ? 'لا توجد منتجات متاحة.' : 'No products available.'}</p></div>}</div>)}</>)}
    </div>
  );
};

export const PublicView = ({ user, refreshUser, lang, t, currency, setCurrency, defaultAddress, footerData }: { user: UserType | null, refreshUser: () => void, lang: string, t: any, currency: 'old' | 'new', setCurrency: (c:'old'|'new')=>void, defaultAddress: string, footerData?: any }) => {
  const [facilities, setFacilities] = useState<Facility[]>([]); const [loading, setLoading] = useState(true); const [searchQuery, setSearchQuery] = useState(''); const [activeTab, setActiveTab] = useState<'pharmacy' | 'clinic' | 'dental_clinic'>('pharmacy'); const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null); const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null); const [currentPage, setCurrentPage] = useState(1); const [openNowPage, setOpenNowPage] = useState(1); const itemsPerPage = 6; 
  const [showShop, setShowShop] = useState(false);
  const [showDoctors, setShowDoctors] = useState<false | 'doctor' | 'dentist'>(false); 

  useEffect(() => { setLoading(true); api.get('/api/public/facilities').then(data => setFacilities(data)).finally(() => setLoading(false)); if (navigator.geolocation) { navigator.geolocation.getCurrentPosition( (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }), (err) => console.log("الموقع غير مفعل") ); } }, []);
  useEffect(() => { setCurrentPage(1); setOpenNowPage(1); }, [activeTab, searchQuery]);
  
  if (showShop) return <PublicShopView onBack={() => setShowShop(false)} facilities={facilities} lang={lang} user={user} refreshUser={refreshUser} currency={currency} setCurrency={setCurrency} defaultAddress={defaultAddress} />;
  
  // تمرير الـ user الحالي إلى دليل الأطباء لكي يستخدمه في التقييم
  if (showDoctors) return <DoctorsDirectoryView onBack={() => setShowDoctors(false)} lang={lang} t={t} filterRole={showDoctors} currency={currency} setCurrency={setCurrency} currentUser={user} />;
  
  const processedFacilities = facilities.filter(f => f.type === activeTab && (f.name.includes(searchQuery) || f.address.includes(searchQuery))).map(f => ({ ...f, isOpenNow: checkIsOpenNow(f), distance: userLocation ? parseFloat(getDistanceKm(userLocation.lat, userLocation.lng, f.latitude, f.longitude)) : null })).sort((a, b) => { if (a.isOpenNow && !b.isOpenNow) return -1; if (!a.isOpenNow && b.isOpenNow) return 1; if (a.distance !== null && b.distance !== null) return a.distance - b.distance; return 0; });
  const currentlyOpen = processedFacilities.filter(f => f.isOpenNow); const totalOpenPages = Math.ceil(currentlyOpen.length / itemsPerPage); const paginatedOpen = currentlyOpen.slice((openNowPage - 1) * itemsPerPage, openNowPage * itemsPerPage); const totalPages = Math.ceil(processedFacilities.length / itemsPerPage); const paginatedFacilities = processedFacilities.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  
  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-600"></div></div>;

  return (
    <div className="w-full flex flex-col min-h-[85vh] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full overflow-x-hidden flex-1 relative">
        <div className="flex justify-end mb-4">
           <CurrencyToggle currency={currency} setCurrency={setCurrency} lang={lang} />
        </div>

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

          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
            {activeTab === 'clinic' && (
              <button onClick={() => setShowDoctors('doctor')} className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-1">
                <User size={20} /> {lang === 'ar' ? 'دليل الأطباء البشري المعتمدين' : 'Medical Doctors Directory'}
              </button>
            )}
            {activeTab === 'dental_clinic' && (
              <button onClick={() => setShowDoctors('dentist')} className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 bg-indigo-500 text-white hover:bg-indigo-600 hover:-translate-y-1">
                <Smile size={20} /> {lang === 'ar' ? 'دليل أطباء الأسنان المعتمدين' : 'Dentists Directory'}
              </button>
            )}
            {activeTab === 'pharmacy' && (
              <button onClick={() => setShowShop(true)} className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold transition-all shadow-md flex items-center justify-center gap-2 bg-slate-900 text-white hover:bg-slate-800 animate-pulse hover:-translate-y-1">
                <ShoppingCart size={20} /> {lang === 'ar' ? 'تسوق الأدوية والمنتجات' : 'Shop Products'}
              </button>
            )}
          </div>
        </header>

        <AnimatePresence>{selectedDoctorId && <DoctorProfileModal doctorId={selectedDoctorId} onClose={() => setSelectedDoctorId(null)} t={t} lang={lang} currency={currency} currentUser={user} />}</AnimatePresence>

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

      <footer className="w-full bg-[#0c5bc6] text-white pt-12 pb-10 mt-auto border-t-[5px] border-blue-400">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-8 text-center lg:text-start">
            
            {(footerData?.appName || footerData?.aboutLink || footerData?.teamLink || footerData?.careersLink) && (
              <div className="flex flex-col items-center lg:items-start">
                {footerData?.appName && <h3 className="text-3xl font-extrabold mb-5 font-mono tracking-wider">{footerData.appName}</h3>}
                <ul className="space-y-3 font-medium text-blue-100">
                  {footerData?.aboutLink && <li><a href={footerData.aboutLink} className="hover:text-white transition-colors">{lang === 'ar' ? 'من نحن' : 'About Us'}</a></li>}
                  {footerData?.teamLink && <li><a href={footerData.teamLink} className="hover:text-white transition-colors">{lang === 'ar' ? 'فريق العمل' : 'Our Team'}</a></li>}
                  {footerData?.careersLink && <li><a href={footerData.careersLink} className="hover:text-white transition-colors">{lang === 'ar' ? 'وظائف' : 'Careers'}</a></li>}
                </ul>
              </div>
            )}

            <div className="flex flex-col items-center lg:items-start sm:border-r border-blue-500/30 lg:border-0 sm:pr-8 pt-8 sm:pt-0">
              <h3 className="text-xl font-bold mb-5 text-blue-50">{lang === 'ar' ? 'ابحث عن طريق' : 'Search By'}</h3>
              <ul className="space-y-3 font-medium text-blue-100">
                <li><button onClick={() => { setShowDoctors('doctor'); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="hover:text-white transition-colors">{lang === 'ar' ? 'التخصص الطبي' : 'Medical Specialty'}</button></li>
                <li><button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="hover:text-white transition-colors">{lang === 'ar' ? 'المنطقة' : 'Area'}</button></li>
              </ul>
            </div>

            {footerData?.doctorJoinLink && (
              <div className="flex flex-col items-center lg:items-start border-t border-blue-500/30 sm:border-0 pt-8 sm:pt-0">
                <h3 className="text-xl font-bold mb-5 text-blue-50">{lang === 'ar' ? 'هل أنت طبيب ؟' : 'Are you a doctor?'}</h3>
                <ul className="space-y-3 font-medium text-blue-100">
                  <li><a href={footerData.doctorJoinLink} className="hover:text-white transition-colors">{lang === 'ar' ? 'انضم إلى أطبائنا' : 'Join our doctors'}</a></li>
                </ul>
              </div>
            )}

            <div className="flex flex-col items-center lg:items-start border-t border-blue-500/30 lg:border-0 pt-8 lg:pt-0">
              {(footerData?.libraryLink || footerData?.contactLink || footerData?.termsLink || footerData?.privacyLink) && (
                <>
                  <h3 className="text-xl font-bold mb-5 text-blue-50">{lang === 'ar' ? 'تحتاج للمساعدة ؟' : 'Need Help?'}</h3>
                  <ul className="space-y-3 font-medium text-blue-100 mb-8 text-center lg:text-start w-full">
                    {footerData?.libraryLink && <li><a href={footerData.libraryLink} className="hover:text-white transition-colors">{lang === 'ar' ? 'مكتبة طبية' : 'Medical Library'}</a></li>}
                    {footerData?.contactLink && <li><a href={footerData.contactLink} className="hover:text-white transition-colors">{lang === 'ar' ? 'اتصل بنا' : 'Contact Us'}</a></li>}
                    {footerData?.termsLink && <li><a href={footerData.termsLink} className="hover:text-white transition-colors">{lang === 'ar' ? 'شروط الاستخدام' : 'Terms of Use'}</a></li>}
                    {footerData?.privacyLink && <li><a href={footerData.privacyLink} className="hover:text-white transition-colors">{lang === 'ar' ? 'اتفاقية الخصوصية' : 'Privacy Policy'}</a></li>}
                  </ul>
                </>
              )}

              {(footerData?.androidLink || footerData?.iosLink) && (
                <div className="flex flex-col sm:flex-row gap-3 mb-6 w-full justify-center lg:justify-start">
                  {footerData?.androidLink && <a href={footerData.androidLink} download="Taiba-Health.apk" target="_blank" rel="noreferrer" className="hover:opacity-80 transition-opacity"><img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Download APK" className="h-10 object-contain" /></a>}
                  {footerData?.iosLink && <a href={footerData.iosLink} target="_blank" rel="noreferrer" className="hover:opacity-80 transition-opacity"><img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="App Store" className="h-10 object-contain" /></a>}
                </div>
              )}

              <div className="flex items-center justify-center lg:justify-start gap-6 text-blue-100 w-full mt-2">
                {footerData?.twitter && <a href={footerData.twitter} target="_blank" rel="noreferrer" className="hover:text-white hover:scale-110 transition-all"><span className="text-2xl font-bold font-mono">X</span></a>}
                {footerData?.instagram && <a href={footerData.instagram} target="_blank" rel="noreferrer" className="hover:text-white hover:scale-110 transition-all"><svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 1.77-6.98 6.276-.058 1.28-.072 1.688-.072 4.947s.014 3.667.072 4.947c.2 4.502 2.62 6.074 6.98 6.274 1.28.058 1.688.072 4.947.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-1.771 6.979-6.274.059-1.28.073-1.687.073-4.947s-.014-3.667-.073-4.947c-.197-4.504-2.622-6.076-6.979-6.276-1.28-.058-1.689-.072-4.948-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></a>}
                {footerData?.facebook && <a href={footerData.facebook} target="_blank" rel="noreferrer" className="hover:text-white hover:scale-110 transition-all"><svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg></a>}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};