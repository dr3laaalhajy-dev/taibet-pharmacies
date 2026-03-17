import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, MapPin, Phone, User, Activity, Search, Clock, MessageCircle, CheckCircle, Stethoscope, BriefcaseMedical, ShoppingCart, Store, Package, ShoppingBag, ArrowRight, Minus, XCircle, Smile, Star, Calendar, Users, MessageSquare, FileText, ShieldAlert, Brain, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Facility, Product, CartItem, UserType, DAYS_OF_WEEK_AR, DAYS_OF_WEEK_EN, SPECIALTIES } from '../types';
import { api } from '../api-client';
import { checkIsOpenNow, formatTime12h, getDistanceKm } from '../helpers';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';
import { uploadImageToImgBB } from '../api-client';
import WhyChooseUs from './WhyChooseUs';

const CurrencyToggle = ({ currency, setCurrency, lang }: { currency: 'old' | 'new', setCurrency: (c: 'old' | 'new') => void, lang: string }) => (
  <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-sm rounded-full p-1 flex items-center border border-slate-200 dark:border-slate-700 w-fit transition-colors">
    <button onClick={() => setCurrency('new')} className={`px-3 md:px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-all ${currency === 'new' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>{getCurrencySymbol('new', lang)}</button>
    <button onClick={() => setCurrency('old')} className={`px-3 md:px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-all ${currency === 'old' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>{getCurrencySymbol('old', lang)}</button>
  </div>
);

const StarRating = ({ rating, size = 16, className = "" }: { rating: number, size?: number, className?: string }) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={size} className={star <= Math.round(rating) ? "text-yellow-400 fill-current" : "text-slate-300 dark:text-slate-600"} />
      ))}
    </div>
  );
};

const DoctorProfileModal = ({ doctorId, facilityId, onClose, t, lang, currency, currentUser, openChatWithUser }: { doctorId: number, facilityId?: number, onClose: () => void, t: any, lang: string, currency: 'old' | 'new', currentUser: UserType | null, openChatWithUser?: (id: number) => void }) => {
  const [doctor, setDoctor] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [userComment, setUserComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const [bookingDate, setBookingDate] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | number>('me');

  const fetchDoctorData = async () => {
    setLoading(true);
    try {
      // 1. جلب كل الأطباء (الرابط الذي نعرف أنه يعمل 100%) والبحث عن هذا الطبيب تحديداً
      const docsRes: any = await api.get('/api/public/doctors');
      let docsList = docsRes?.data || docsRes;
      if (docsList?.doctors) docsList = docsList.doctors;
      if (!Array.isArray(docsList)) docsList = [];

      let myDoctor = docsList.find((d: any) => d.id === doctorId);

      if (myDoctor) {
        // 2. جلب كل العيادات والبحث عن العيادة التي تتبع لهذا الطبيب
        const facRes: any = await api.get('/api/public/facilities');
        let facList = facRes?.data || facRes;
        if (facList?.facilities) facList = facList.facilities;
        if (!Array.isArray(facList)) facList = [];

        // 3. ربط العيادة بالطبيب لكي تظهر في الشاشة
        myDoctor.facilities = facList.filter((f: any) => f.doctor_id === doctorId);

        // إرسال البيانات النهائية للشاشة
        setDoctor(myDoctor);
      } else {
        setDoctor(null);
      }
    } catch (err) {
      console.error("❌ خطأ في الجلب:", err);
      setDoctor(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchChildren = async () => {
    try {
      const res = await api.get('/api/users/children');
      setChildren(res.children || []);
    } catch (err) { console.error("Error fetching children:", err); }
  };

  useEffect(() => {
    fetchDoctorData();
    if (currentUser) fetchChildren();
  }, [doctorId]);
  if (!doctorId) return null;

  const fee = doctor?.consultation_price || doctor?.facilities?.[0]?.consultation_fee || 0;
  const primaryFacility = facilityId ? doctor?.facilities?.find((f: any) => f.id === facilityId) : doctor?.facilities?.[0];

  const submitReview = async () => {
    if (!currentUser) return toast.error(lang === 'ar' ? 'يجب تسجيل الدخول لتقييم الطبيب' : 'Please login to submit a review');
    if (userRating === 0) return toast.error(lang === 'ar' ? 'الرجاء اختيار عدد النجوم' : 'Please select stars');

    setSubmittingReview(true);
    try {
      await api.post(`/api/public/doctors/${doctorId}/review`, { rating: userRating, comment: userComment });
      toast.success(lang === 'ar' ? 'شكراً لتقييمك! تم الحفظ بنجاح' : 'Thank you! Review saved');
      fetchDoctorData();
      setUserRating(0); setUserComment('');
    } catch (err: any) { toast.error(err.error || 'حدث خطأ'); }
    finally { setSubmittingReview(false); }
  };

  const submitBooking = async () => {
    if (!currentUser) return toast.error(lang === 'ar' ? 'يجب تسجيل الدخول للحجز' : 'Please login to book');
    if (!bookingDate) return toast.error(lang === 'ar' ? 'الرجاء اختيار تاريخ الحجز' : 'Please select a date');

    const selectedDayIdx = new Date(bookingDate).getDay().toString();
    const facilitySchedule = primaryFacility?.working_hours?.[selectedDayIdx];
    if (!facilitySchedule?.isOpen) return toast.error(lang === 'ar' ? 'العيادة مغلقة في هذا اليوم حسب الجدول الأسبوعي.' : 'Clinic is closed on this day.');

    setIsBooking(true);
    try {
      await api.post('/api/appointments/book', {
        doctor_id: doctorId,
        facility_id: primaryFacility.id,
        appointment_date: bookingDate,
        family_member_id: selectedPatientId === 'me' ? null : selectedPatientId
      });
      toast.success(lang === 'ar' ? 'تم تأكيد حجزك بنجاح! ننتظرك في العيادة.' : 'Booking confirmed! See you at the clinic.');
      setShowBookingForm(false); setBookingDate('');
    } catch (err: any) { toast.error(err.error || (lang === 'ar' ? 'حدث خطأ أثناء الحجز' : 'Booking failed')); }
    finally { setIsBooking(false); }
  };

  const handleOpenChat = () => {
    if (!currentUser) { toast.error(lang === 'ar' ? 'يجب تسجيل الدخول أولاً للتواصل مع الطبيب.' : 'Please login to chat with the doctor.'); return; }
    if (openChatWithUser) { openChatWithUser(doctorId); onClose(); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-50 dark:bg-slate-950 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col transition-colors">
        <div className="bg-white dark:bg-slate-900 p-4 border-b dark:border-slate-800 flex justify-between items-center sticky top-0 z-10 transition-colors">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{lang === 'ar' ? 'الملف الشخصي والحجز' : 'Profile & Booking'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><XCircle size={24} className="text-slate-400 dark:text-slate-500" /></button>
        </div>

        {loading ? (<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-600"></div></div>) : doctor ? (
          <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-6 items-start transition-colors">
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-4xl font-bold shrink-0 shadow-sm overflow-hidden border-2 border-white dark:border-slate-700 outline outline-1 outline-slate-200 dark:outline-slate-700">
                  {doctor.profile_picture || primaryFacility?.image_url ? <img src={doctor.profile_picture || primaryFacility?.image_url} className="w-full h-full object-cover" /> : <User size={48} className="opacity-40" />}
                </div>
                <div className="flex-1 w-full">
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                      {/* 🚨 إصلاح مشكلة NaN في الاسم هنا 🚨 */}
                      <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">
                        {lang === 'ar' ? 'دكتور' : 'Dr.'} {doctor?.name ? doctor.name : (doctor?.id || 'غير محدد')}
                      </h2>
                      <p className="text-blue-600 dark:text-blue-400 font-bold mb-3">{doctor.specialty ? (t[doctor.specialty] || doctor.specialty) : (doctor.role === 'dentist' ? (lang === 'ar' ? 'طبيب أسنان' : 'Dentist') : t.doctor)}</p>
                    </div>
                    <button onClick={handleOpenChat} className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-xl text-sm font-bold border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-sm">
                      <MessageSquare size={16} /> <span className="hidden sm:inline">{lang === 'ar' ? 'تواصل معي' : 'Chat'}</span>
                    </button>
                  </div>

                  {/* 🚨 إصلاح مشكلة NaN في التقييم هنا 🚨 */}
                  <div className="flex items-center gap-2 mb-4">
                    <StarRating rating={Number(doctor?.average_rating || 0)} size={18} />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {Number(doctor?.average_rating || 0).toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({doctor?.reviews_count || 0} {lang === 'ar' ? 'تقييمات' : 'reviews'})
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><User className="text-blue-500" /> {lang === 'ar' ? 'معلومات عن الطبيب' : 'About Doctor'}</h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6 whitespace-pre-line">{doctor.about || doctor.notes || (lang === 'ar' ? 'لا توجد نبذة تعريفية حالياً.' : 'No bio available.')}</p>

                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Stethoscope className="text-blue-500" /> {lang === 'ar' ? 'الأعراض والخدمات' : 'Services & Symptoms'}</h4>
                <div className="flex flex-wrap gap-2">
                  {primaryFacility?.services ? (
                    primaryFacility.services.split(/[\n,]+/).map((s: string, i: number) => s.trim() && <span key={i} className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-bold text-sm rounded-lg border border-blue-100 dark:border-blue-800">{s.trim()}</span>)
                  ) : (
                    <span className="text-sm text-slate-400 dark:text-slate-500">{lang === 'ar' ? 'لم يقم الطبيب بإضافة الخدمات بعد.' : 'No services listed.'}</span>
                  )}
                </div>

                {doctor.faqs && doctor.faqs.length > 0 && (
                  <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <MessageCircle className="text-emerald-500" />
                      {lang === 'ar' ? 'أسئلة طبية شائعة يطرحها المرضى' : 'Medical FAQs'}
                    </h4>
                    <div className="space-y-3">
                      {doctor.faqs.map((faq: any, idx: number) => (
                        <div key={faq.id || idx} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden transition-all">
                          <button onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)} className="w-full text-left px-4 py-4 font-bold text-slate-800 dark:text-slate-200 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <span className={lang === 'ar' ? 'text-right' : 'text-left'}>{faq.question}</span>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${expandedFaq === faq.id ? 'bg-blue-600 text-white' : 'bg-blue-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400'}`}>
                              {expandedFaq === faq.id ? <Minus size={14} /> : <Plus size={14} />}
                            </div>
                          </button>
                          <AnimatePresence>
                            {expandedFaq === faq.id && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 pb-4 text-slate-600 dark:text-slate-400 text-sm leading-relaxed border-t border-slate-200 dark:border-slate-700 pt-3">
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

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-6 border border-blue-100 dark:border-slate-700 shadow-sm transition-colors">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{lang === 'ar' ? 'ما رأيك في تجربتك مع الطبيب؟' : 'Rate your experience'}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{lang === 'ar' ? 'تقييمك يساعد المرضى الآخرين في اتخاذ القرار الصحيح.' : 'Your review helps others make better choices.'}</p>

                {currentUser ? (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} onClick={() => setUserRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} className="focus:outline-none transition-transform hover:scale-110">
                          <Star size={32} className={(hoverRating || userRating) >= star ? "text-yellow-400 fill-current" : "text-slate-300 dark:text-slate-600"} />
                        </button>
                      ))}
                    </div>
                    {/* 🚨 إضافة id و name لحقل التقييم 🚨 */}
                    <textarea
                      id="doctorReviewComment" name="doctorReviewComment"
                      placeholder={lang === 'ar' ? "أضف تعليقاً يصف تجربتك (اختياري)..." : "Write a comment (optional)..."}
                      className="w-full px-4 py-3 rounded-xl border border-blue-200 dark:border-slate-600 focus:border-blue-500 outline-none resize-none bg-white dark:bg-slate-900 dark:text-white"
                      rows={3} value={userComment} onChange={e => setUserComment(e.target.value)}
                    ></textarea>
                    <button onClick={submitReview} disabled={submittingReview || userRating === 0} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50">
                      {submittingReview ? '...' : (lang === 'ar' ? 'إرسال التقييم' : 'Submit Review')}
                    </button>
                  </div>
                ) : (
                  <div className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-xl text-center border border-white dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'يجب تسجيل الدخول كـ مريض لتتمكن من التقييم.' : 'Please login to rate.'}</p>
                  </div>
                )}
              </div>

            </div>

            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-slate-800 shadow-lg overflow-hidden sticky top-6 transition-colors">
                <div className="bg-blue-600 dark:bg-blue-700 text-white text-center py-3 font-bold">{lang === 'ar' ? 'معلومات الحجز' : 'Booking Info'}</div>
                <div className="p-5">
                  <div className="flex justify-between items-center text-center border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                    <div><Activity className="mx-auto text-emerald-500 mb-1" /><span className="block text-xs text-slate-400 dark:text-slate-500 mb-1">{lang === 'ar' ? 'سعر الكشف' : 'Consultation'}</span><span className="font-bold text-slate-800 dark:text-white">{formatCurrency(fee, currency, lang)}</span></div>
                    <div className="border-r border-slate-100 dark:border-slate-800 h-10"></div>
                    <div><Clock className="mx-auto text-orange-500 mb-1" /><span className="block text-xs text-slate-400 dark:text-slate-500 mb-1">{lang === 'ar' ? 'مدة الانتظار' : 'Wait Time'}</span><span className="font-bold text-slate-800 dark:text-white">{primaryFacility?.waiting_time || '15 دقيقة'}</span></div>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2 leading-tight">
                      <MapPin className="text-red-500 shrink-0 mt-1" size={18} />
                      <span>
                        <span className="font-bold block mb-1 dark:text-white">
                          {primaryFacility?.name || (lang === 'ar' ? 'لم يتم تسجيل عيادة للطبيب' : 'No clinic registered')}
                        </span>
                        <span className="text-xs text-slate-500">
                          {primaryFacility?.address || (lang === 'ar' ? 'العنوان غير متوفر' : 'Address not available')}
                        </span>
                      </span>
                    </p>
                  </div>

                  <h5 className="text-center font-bold text-slate-900 dark:text-white mb-3">{lang === 'ar' ? 'مواعيد العمل:' : 'Working Hours:'}</h5>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 mb-6 space-y-2 max-h-[150px] overflow-y-auto text-sm text-center">
                    {/* فحص ذكي: هل توجد أوقات عمل مفتوحة فعلاً؟ */}
                    {primaryFacility?.working_hours && Object.values(primaryFacility.working_hours).some((day: any) => day.isOpen) ? (
                      (lang === 'en' ? DAYS_OF_WEEK_EN : DAYS_OF_WEEK_AR).map((day, idx) => {
                        const daySchedule = primaryFacility.working_hours[idx.toString()];
                        if (!daySchedule?.isOpen) return null;
                        return (
                          <div key={idx} className="flex justify-between border-b border-slate-200 dark:border-slate-700 last:border-0 pb-1">
                            <span className="font-bold text-slate-800 dark:text-slate-300">{day}</span>
                            <span dir="ltr" className="text-blue-700 dark:text-blue-400 font-mono font-bold">
                              {formatTime12h(daySchedule.start, lang)} - {formatTime12h(daySchedule.end, lang)}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-slate-400 dark:text-slate-500 py-3 font-medium">
                        {lang === 'ar' ? 'لا يوجد مواعيد عمل مسجلة حالياً' : 'No working hours registered yet'}
                      </div>
                    )}
                  </div>

                  {showBookingForm ? (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 p-4 rounded-xl mb-4">
                      {children.length > 0 && (
                        <div className="mb-4">
                          <label className="block text-sm font-bold text-blue-900 dark:text-blue-300 mb-3">{lang === 'ar' ? 'لمن هذا الموعد؟' : 'Who is this appointment for?'}</label>
                          <div className="space-y-2">
                            <label className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedPatientId === 'me' ? 'border-blue-600 bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'}`}>
                              <input type="radio" name="selectedPatient" value="me" checked={selectedPatientId === 'me'} onChange={() => setSelectedPatientId('me')} className="w-4 h-4 accent-blue-600" />
                              <span className="text-sm font-bold">{lang === 'ar' ? 'لي شخصياً' : 'For Me'}</span>
                            </label>
                            {children.map(child => (
                              <label key={child.id} className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedPatientId === child.id ? 'border-blue-600 bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'}`}>
                                <input type="radio" name="selectedPatient" value={child.id} checked={selectedPatientId === child.id} onChange={() => setSelectedPatientId(child.id)} className="w-4 h-4 accent-blue-600" />
                                <span className="text-sm font-bold">{lang === 'ar' ? `طفلي: ${child.name}` : `Child: ${child.name}`}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      <label className="block text-sm font-bold text-blue-900 dark:text-blue-300 mb-2">{lang === 'ar' ? 'اختر تاريخ الحجز:' : 'Select Date:'}</label>
                      {/* 🚨 إضافة id و name لحقل التاريخ 🚨 */}
                      <input
                        id="appointmentDate" name="appointmentDate"
                        type="date" min={new Date().toISOString().split('T')[0]}
                        className="w-full p-3 rounded-lg border border-blue-300 dark:border-slate-600 outline-none focus:border-blue-600 bg-white dark:bg-slate-900 dark:text-white mb-4 font-bold"
                        value={bookingDate} onChange={e => setBookingDate(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button onClick={submitBooking} disabled={isBooking || !bookingDate} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">{lang === 'ar' ? 'تأكيد' : 'Confirm'}</button>
                        <button onClick={() => setShowBookingForm(false)} className="px-4 py-2.5 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                      </div>
                    </motion.div>
                  ) : (
                    <button onClick={() => {
                      if (!currentUser) return toast.error(lang === 'ar' ? 'يجب تسجيل الدخول كـ مريض للحجز' : 'Please login to book');
                      if (!primaryFacility) return toast.error(lang === 'ar' ? 'الطبيب لا يملك عيادة متاحة للحجز حالياً' : 'Doctor has no available clinics for booking');
                      setShowBookingForm(true);
                    }}
                      className={`block w-full text-white text-center py-4 rounded-xl font-bold transition-colors shadow-md flex items-center justify-center gap-2 ${!primaryFacility ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                      disabled={!primaryFacility}
                    >
                      <Calendar size={20} /> {lang === 'ar' ? 'حجز موعد في العيادة' : 'Book Appointment'}
                    </button>
                  )}

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

const DoctorsDirectoryView = ({ onBack, lang, t, filterRole, currency, setCurrency, currentUser, openChatWithUser }: { onBack: () => void, lang: string, t: any, filterRole: 'doctor' | 'dentist', currency: 'old' | 'new', setCurrency: (c: 'old' | 'new') => void, currentUser: UserType | null, openChatWithUser?: (id: number) => void }) => {
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

  const directoryTitle = filterRole === 'dentist' ? (lang === 'ar' ? 'دليل أطباء الأسنان' : 'Dentists Directory') : (lang === 'ar' ? 'دليل الأطباء البشري' : 'Medical Doctors Directory');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full animate-in fade-in duration-500 min-h-[80vh]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-bold transition-colors"><ArrowRight size={20} /> {lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</button>
        <CurrencyToggle currency={currency} setCurrency={setCurrency} lang={lang} />
      </div>

      <div className="text-center mb-12">
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border ${filterRole === 'dentist' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800'}`}>
          {filterRole === 'dentist' ? <ToothIcon size={40} /> : <Stethoscope size={40} />}
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4">{directoryTitle}</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">{lang === 'ar' ? 'تصفح قائمة الأطباء المعتمدين، ابحث بالاسم، وقارن أسعار الكشفية لتحجز موعدك بسهولة.' : 'Browse certified doctors and compare fees.'}</p>
      </div>

      <div className={`bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mb-12 grid grid-cols-1 ${filterRole === 'doctor' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6 relative z-10 transition-colors`}>
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'البحث بالاسم' : 'Search by Name'}</label>
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" className="w-full pr-12 pl-4 py-3.5 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-transparent focus:border-blue-500 outline-none transition-colors dark:text-white" placeholder={lang === 'ar' ? 'اسم الطبيب...' : 'Doctor name...'} value={searchName} onChange={e => setSearchName(e.target.value)} />
          </div>
        </div>

        {filterRole === 'doctor' && (
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'التخصص الطبي' : 'Specialty'}</label>
            <select className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-blue-500 outline-none transition-colors cursor-pointer dark:text-white" value={searchSpecialty} onChange={e => setSearchSpecialty(e.target.value)}>
              <option value="">{lang === 'ar' ? 'جميع التخصصات' : 'All Specialties'}</option>
              {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex justify-between">
            <span>{lang === 'ar' ? 'سعر الكشف (الحد الأقصى)' : 'Max Consultation Fee'}</span>
            <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">{formatCurrency(maxPrice, currency, lang)}</span>
          </label>
          <input type="range" min="0" max="300000" step="5000" className="w-full mt-3 accent-blue-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer" value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} />
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
              <div key={doctor.id} onClick={() => setSelectedDoctorId(doctor.id)} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer text-center group flex flex-col h-full relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                  <Star size={12} className="fill-current" /> {Number(doctor.average_rating).toFixed(1)}
                </div>
                <div className="w-24 h-24 mx-auto bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-3xl font-bold mb-4 shadow-sm group-hover:scale-110 transition-transform overflow-hidden outline outline-4 outline-slate-50 dark:outline-slate-800">
                  {doctor.profile_picture ? <img src={doctor.profile_picture} className="w-full h-full object-cover" /> : <User size={40} className="opacity-40" />}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 line-clamp-1">{lang === 'ar' ? 'د.' : 'Dr.'} {doctor?.name?.trim() ? doctor.name : doctor.id}</h3>
                <p className={`text-sm font-bold mb-4 ${filterRole === 'dentist' ? 'text-indigo-600 dark:text-indigo-400' : 'text-blue-600 dark:text-blue-400'}`}>{doctor.specialty ? (t[doctor.specialty] || doctor.specialty) : (doctor.role === 'dentist' ? (lang === 'ar' ? 'طبيب أسنان' : 'Dentist') : t.doctor)}</p>

                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">{lang === 'ar' ? 'سعر الكشف' : 'Fee'}</span>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg">{formatCurrency(fee, currency, lang)}</span>
                  </div>
                  <button className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl text-sm font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">{lang === 'ar' ? 'عرض الملف والحجز' : 'View Profile & Book'}</button>
                </div>
              </div>
            )
          })}
          {filteredDoctors.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center">
              <Search size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'لا يوجد أطباء يطابقون بحثك' : 'No doctors match your search'}</h3>
              <p>{lang === 'ar' ? 'حاول تغيير شروط البحث لتشمل نتائج أكثر.' : 'Try adjusting your filters.'}</p>
            </div>
          )}
        </div>
      )}
      <AnimatePresence>
        {selectedDoctorId && <DoctorProfileModal doctorId={selectedDoctorId} onClose={() => setSelectedDoctorId(null)} t={t} lang={lang} currency={currency} currentUser={currentUser} openChatWithUser={openChatWithUser} />}
      </AnimatePresence>
    </div>
  );
};

const PublicShopView = ({ onBack, facilities, lang, user, refreshUser, currency, setCurrency, defaultAddress }: { onBack: () => void, facilities: Facility[], lang: string, user: UserType | null, refreshUser: () => void, currency: 'old' | 'new', setCurrency: (c: 'old' | 'new') => void, defaultAddress: string }) => {
  const [products, setProducts] = useState<Product[]>([]); const [searchQuery, setSearchQuery] = useState(''); const [selectedPharmacyId, setSelectedPharmacyId] = useState<number | null>(null); const [loading, setLoading] = useState(true); const [cart, setCart] = useState<CartItem[]>([]); const [showCart, setShowCart] = useState(false); const [orderSuccess, setOrderSuccess] = useState(false);
  const [lastOrderShortCode, setLastOrderShortCode] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet'>('cash');
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [prescriptionImage, setPrescriptionImage] = useState<File | null>(null);
  const [isUploadingPrescription, setIsUploadingPrescription] = useState(false);

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
    if (cart.length === 0) return;
    if (!user) { toast.error(lang === 'ar' ? 'يجب تسجيل الدخول للطلب.' : 'Please login to order.'); return; }
    if (paymentMethod === 'wallet' && parseFloat(user.wallet_balance || '0') < cartTotal) { toast.error(lang === 'ar' ? 'رصيد المحفظة غير كافٍ!' : 'Insufficient balance.'); return; }

    try {
      const res = await api.post('/api/public/orders', {
        pharmacy_id: selectedPharmacyId,
        customer_name: user.name,
        customer_phone: user.phone || 'بدون رقم',
        delivery_address: defaultAddress || 'بدون عنوان',
        items: cart,
        total_price: cartTotal.toString(),
        payment_method: paymentMethod
      });
      setLastOrderShortCode(res.short_code || null);
      setOrderSuccess(true); setCart([]); setShowCart(false);
      if (paymentMethod === 'wallet') refreshUser();
    } catch (err: any) { toast.error(err.error || (lang === 'ar' ? 'فشل إرسال الطلب' : 'Failed to submit order')); }
  };

  const submitPrescriptionOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error(lang === 'ar' ? 'يجب تسجيل الدخول لرفع الوصفة.' : 'Please login to upload a prescription.'); return; }
    if (!prescriptionImage) { toast.error(lang === 'ar' ? 'الرجاء اختيار صورة الوصفة' : 'Please select an image'); return; }

    setIsUploadingPrescription(true);
    try {
      const imageUrl = await uploadImageToImgBB(prescriptionImage);
      if (!imageUrl) throw new Error("فشل رفع الصورة");

      const res = await api.post('/api/public/orders', {
        pharmacy_id: selectedPharmacyId,
        customer_name: user.name,
        customer_phone: user.phone || 'بدون رقم',
        delivery_address: defaultAddress || 'بدون عنوان',
        items: [{ product_id: -1, name: lang === 'ar' ? 'وصفة طبية (صورة)' : 'Prescription (Image)', price: '0', qty: 1, image_url: imageUrl }],
        total_price: '0',
        payment_method: 'cash',
        prescription_image_url: imageUrl,
        status: 'pending_pricing'
      });
      setLastOrderShortCode(res.short_code || null);
      setOrderSuccess(true);
      setShowPrescriptionModal(false);
      setPrescriptionImage(null);
    } catch (err: any) {
      toast.error(lang === 'ar' ? 'فشل إرسال الوصفة' : 'Failed to submit prescription');
    } finally {
      setIsUploadingPrescription(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full animate-in fade-in duration-500 min-h-[80vh]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold transition-colors"><ArrowRight size={20} /> {lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</button>
        <CurrencyToggle currency={currency} setCurrency={setCurrency} lang={lang} />
      </div>

      {selectedPharmacyId && cart.length > 0 && !showCart && (<button onClick={() => setShowCart(true)} className="fixed bottom-8 left-8 bg-slate-900 dark:bg-emerald-600 text-white p-4 rounded-full shadow-2xl z-50 flex items-center justify-center animate-bounce hover:bg-slate-800"><ShoppingCart size={24} /><span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{cart.length}</span></button>)}
      <AnimatePresence>
        {showCart && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="bg-white dark:bg-slate-900 w-full md:w-[400px] h-full shadow-2xl flex flex-col">
              <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950"><h2 className="text-xl font-bold dark:text-white flex items-center gap-2"><ShoppingCart className="text-emerald-500" /> {lang === 'ar' ? 'سلة المشتريات' : 'Shopping Cart'}</h2><button onClick={() => setShowCart(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 dark:text-slate-400 rounded-full"><XCircle size={24} /></button></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {cart.map(item => (
                  <div key={item.product_id} className="flex items-center gap-4 bg-white dark:bg-slate-800 p-3 border dark:border-slate-700 rounded-2xl shadow-sm">
                    {item.image_url ? <img src={item.image_url} className="w-16 h-16 object-cover rounded-xl" /> : <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center"><Package size={20} className="dark:text-slate-400" /></div>}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm line-clamp-1 dark:text-slate-200">{item.name}</h4>
                      <p className="text-emerald-600 dark:text-emerald-400 font-bold text-sm" dir="ltr">{formatCurrency(parseFloat(item.price), currency, lang)}</p>
                      <div className="flex items-center gap-3 mt-2"><button onClick={() => updateQty(item.product_id, 1, item.max_per_user || item.quantity, item.quantity)} className="bg-slate-100 dark:bg-slate-700 dark:text-slate-300 p-1 rounded-md hover:bg-slate-200"><Plus size={14} /></button><span className="font-bold text-sm dark:text-slate-200">{item.qty}</span><button onClick={() => updateQty(item.product_id, -1, item.max_per_user || item.quantity, item.quantity)} className="bg-slate-100 dark:bg-slate-700 dark:text-slate-300 p-1 rounded-md hover:bg-slate-200"><Minus size={14} /></button></div>
                    </div>
                    <button onClick={() => removeFromCart(item.product_id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg"><Trash2 size={18} /></button>
                  </div>
                ))}
              </div>
              <div className="p-6 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <div className="flex justify-between items-center mb-4 text-lg font-bold dark:text-white">
                  <span>{lang === 'ar' ? 'المجموع الكلي:' : 'Total:'}</span>
                  <span dir="ltr" className="text-emerald-600 dark:text-emerald-400">{formatCurrency(cartTotal, currency, lang)}</span>
                </div>

                <div className="mb-4 bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">{lang === 'ar' ? 'سيتم التوصيل إلى:' : 'Delivery to:'}</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-start gap-2">
                    <MapPin size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    {defaultAddress || (lang === 'ar' ? 'يرجى إضافة عنوان من الإعدادات!' : 'Please add address in settings!')}
                  </p>
                </div>

                <div className="flex gap-2 mb-4">
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer font-bold text-sm transition-colors ${paymentMethod === 'cash' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <input type="radio" className="hidden" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} />
                    💵 {lang === 'ar' ? 'عند الاستلام' : 'Cash'}
                  </label>
                  <label className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 cursor-pointer font-bold text-sm transition-colors ${paymentMethod === 'wallet' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <input type="radio" className="hidden" checked={paymentMethod === 'wallet'} onChange={() => setPaymentMethod('wallet')} />
                    <div className="flex items-center gap-1">💳 {lang === 'ar' ? 'المحفظة' : 'Wallet'}</div>
                    {user && <span className="text-[10px] font-mono">{formatCurrency(parseFloat(user.wallet_balance || '0'), currency, lang)}</span>}
                  </label>
                </div>

                <button onClick={submitOrder} disabled={!defaultAddress} className="w-full bg-emerald-500 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{lang === 'ar' ? 'تأكيد وإرسال الطلب' : 'Confirm Order'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Prescription Modal */}
      <AnimatePresence>
        {showPrescriptionModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-md relative">
              <button onClick={() => setShowPrescriptionModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><XCircle size={24} /></button>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100"><FileText size={32} /></div>
                <h3 className="text-xl font-bold dark:text-white mb-2">{lang === 'ar' ? 'اطلب وصفتك بصورة' : 'Upload Prescription'}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'التقط صورة واضحة للوصفة الطبية، وسيقوم الصيدلي بتسعيرها لك.' : 'Take a clear picture of your prescription, and the pharmacist will price it for you.'}</p>
              </div>
              <form onSubmit={submitPrescriptionOrder}>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center mb-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer relative overflow-hidden group">
                  <input type="file" accept="image/*" onChange={(e) => { if (e.target.files && e.target.files[0]) setPrescriptionImage(e.target.files[0]) }} className="absolute inset-0 opacity-0 cursor-pointer z-10" required />
                  {prescriptionImage ? (
                    <div className="flex items-center gap-3 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      <CheckCircle className="text-emerald-500 shrink-0" />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate text-left w-full" dir="ltr">{prescriptionImage.name}</span>
                    </div>
                  ) : (
                    <div className="text-slate-500 dark:text-slate-400">
                      <BriefcaseMedical className="mx-auto mb-2 text-slate-400 group-hover:text-blue-500 transition-colors" size={32} />
                      <p className="font-bold text-sm">{lang === 'ar' ? 'اضغط لاختيار صورة الوصفة' : 'Click to select prescription image'}</p>
                    </div>
                  )}
                </div>


                {!defaultAddress && (
                  <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                    <ShieldAlert size={16} /> {lang === 'ar' ? 'يرجى إضافة عنوان أولاً للإرسال.' : 'Please add delivery address first.'}
                  </div>
                )}
                <button type="submit" disabled={isUploadingPrescription || !defaultAddress || !prescriptionImage} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {isUploadingPrescription ? <><span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span> {lang === 'ar' ? 'جاري الرفع...' : 'Uploading...'}</> : (lang === 'ar' ? 'إرسال للصيدلية' : 'Submit to Pharmacy')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="text-center mb-12"><div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100 dark:border-emerald-800"><ShoppingBag size={40} /></div><h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4">{lang === 'ar' ? <>السوق <span className="text-emerald-500">الطبي</span></> : <>Medical <span className="text-emerald-500">Store</span></>}</h1><p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">{selectedPharmacy ? (lang === 'ar' ? `تسوق منتجات ${selectedPharmacy.name} واطلبها مباشرة.` : `Shop ${selectedPharmacy.name} products directly.`) : (lang === 'ar' ? 'اختر صيدلية من القائمة أدناه لبدء التسوق وتصفح المنتجات المتاحة لديها.' : 'Choose a pharmacy below to start shopping.')}</p></div>
      {orderSuccess && (
        <div className="max-w-2xl mx-auto bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 p-6 rounded-3xl text-center mb-8">
          <CheckCircle size={40} className="mx-auto mb-3 text-emerald-500" />
          <h3 className="text-xl font-bold mb-2">{lang === 'ar' ? 'تم إرسال طلبك بنجاح!' : 'Order submitted successfully!'}</h3>
          {lastOrderShortCode && (
            <div className="mt-4 mb-4">
              <p className="text-sm font-bold text-slate-500 mb-1">{lang === 'ar' ? 'كود المتابعة الخاص بك:' : 'Your tracking code:'}</p>
              <div className="inline-block bg-white dark:bg-slate-800 px-6 py-2 rounded-xl border-2 border-emerald-500 font-mono text-2xl font-black text-emerald-600 tracking-widest shadow-sm">
                {lastOrderShortCode}
              </div>
            </div>
          )}
          <p>{lang === 'ar' ? 'سيتواصل معك الصيدلي قريباً.' : 'The pharmacist will contact you soon.'}</p>
        </div>
      )}
      {!selectedPharmacyId ? (<div className="mb-16"><h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2"><Store className="text-indigo-500" /> {lang === 'ar' ? 'الصيدليات المتاحة للتسوق' : 'Pharmacies Available for Shopping'}</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{ecommercePharmacies.map(ph => (<div key={ph.id} onClick={() => { setSelectedPharmacyId(ph.id); setSearchQuery(''); }} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md transition-all flex items-center gap-4">{ph.image_url ? <img src={ph.image_url} className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100 dark:border-slate-700" /> : <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center shrink-0"><Store size={24} /></div>}<div><h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-1">{ph.name}</h3><p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin size={12} /> {ph.address}</p><span className="text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-md font-bold mt-2 inline-block">{lang === 'ar' ? 'اضغط لبدء التسوق' : 'Click to shop'}</span></div></div>))}{ecommercePharmacies.length === 0 && <div className="col-span-full text-center py-10 text-slate-500 dark:text-slate-400">{lang === 'ar' ? 'لا توجد صيدليات مفعلة حالياً.' : 'No pharmacies available right now.'}</div>}</div></div>) : (<><div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800"><div className="flex items-center gap-3"><Store className="text-indigo-500" /><h2 className="font-bold text-indigo-900 dark:text-indigo-300 text-lg">{lang === 'ar' ? `منتجات ${selectedPharmacy?.name}` : `${selectedPharmacy?.name} Products`}</h2></div><div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto"><button onClick={() => setShowPrescriptionModal(true)} className="text-xs font-bold bg-blue-600 text-white px-4 py-2.5 rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"><BriefcaseMedical size={16} /> {lang === 'ar' ? 'اطلب وصفتك بصورة' : 'Upload Prescription'}</button><button onClick={() => { setSelectedPharmacyId(null); setSearchQuery(''); }} className="text-xs font-bold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-4 py-2.5 rounded-lg shadow-sm border border-indigo-200 dark:border-indigo-700 w-full sm:w-auto text-center">{lang === 'ar' ? 'تغيير الصيدلية' : 'Change Pharmacy'}</button></div></div><div className="max-w-2xl mx-auto relative mb-12"><Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="text" placeholder={lang === 'ar' ? "ابحث عن دواء أو منتج..." : "Search for a product..."} className="w-full pr-12 pl-4 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-transparent focus:border-emerald-500 outline-none shadow-sm text-lg transition-colors dark:text-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>{loading ? (<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500"></div></div>) : (<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">{filteredProducts.map(p => {
        const inCart = cart.find(i => i.product_id === p.id); const isMaxed = inCart && inCart.qty >= (p.max_per_user || p.quantity); const isOutOfStock = p.quantity <= 0; return (
          <div key={p.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-lg transition-shadow group flex flex-col">
            <div className="aspect-square bg-slate-50 dark:bg-slate-800 relative overflow-hidden">{p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600"><Package size={48} /></div>}{isOutOfStock && <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm flex items-center justify-center"><span className="bg-red-500 text-white font-bold px-4 py-1.5 rounded-full text-sm shadow-md rotate-[-12deg]">{lang === 'ar' ? 'نفذت الكمية' : 'Out of Stock'}</span></div>}</div>
            <div className="p-4 flex flex-col flex-1">
              <h3 className="font-bold text-slate-900 dark:text-slate-200 line-clamp-2 text-sm md:text-base leading-snug mb-2">{p.name}</h3>
              {p.max_per_user && <span className="text-[10px] text-red-500 dark:text-red-400 mb-2 block font-bold">{lang === 'ar' ? `الحد الأقصى للفرد: ${p.max_per_user}` : `Max per user: ${p.max_per_user}`}</span>}
              <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="font-extrabold text-lg text-slate-900 dark:text-white" dir="ltr">{formatCurrency(parseFloat(p.price), currency, lang)}</span>
              </div>
              {!isOutOfStock && (<button onClick={() => addToCart(p)} disabled={!!isMaxed} className={`mt-3 w-full py-2 rounded-xl text-xs font-bold flex justify-center items-center gap-1 transition-colors ${isMaxed ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'}`}><Plus size={14} /> {isMaxed ? (lang === 'ar' ? 'الحد الأقصى' : 'Max Reached') : (lang === 'ar' ? 'أضف للسلة' : 'Add to Cart')}</button>)}
            </div>
          </div>
        );
      })}{filteredProducts.length === 0 && <div className="col-span-full py-20 text-center text-slate-500 dark:text-slate-400"><Package className="mx-auto mb-4 text-slate-300 dark:text-slate-600" size={48} /><p>{lang === 'ar' ? 'لا توجد منتجات متاحة.' : 'No products available.'}</p></div>}</div>)}</>)}
    </div>
  );
};
import { mdiPill, mdiStethoscope, mdiToothOutline } from '@mdi/js';
import Icon from '@mdi/react';

// 🟢 أيقونة الصيدليات - حبة دواء احترافية
const PharmacyIcon = ({ size = 24, className = "" }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <Icon
      path={mdiPill}
      size={size / 24}
      color="currentColor"
      rotate={45} // جعلنا الحبة مائلة قليلاً لتبدو أكثر حيوية وتصميماً
    />
  </div>
);

// 2. أيقونة العيادات الطبية (سماعة طبيب احترافية)
const ClinicIcon = ({ size = 24, className = "" }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <Icon path={mdiStethoscope} size={size / 24} color="currentColor" />
  </div>
);

// 3. أيقونة السن (التي اخترناها سوياً)
const ToothIcon = ({ size = 24, className = "" }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <Icon path={mdiToothOutline} size={size / 24} color="currentColor" />
  </div>
);
// 🟢 مكون العداد المتحرك (نسخة مصغرة ومتجاوبة مع سحب الهاتف)
const AnimatedCounter = ({ target, label, icon: Icon, delay = 0 }: { target: number, label: string, icon: any, delay?: number }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 2000;
    const increment = target / (duration / 16);
    const timer = setTimeout(() => {
      const counter = setInterval(() => {
        start += increment;
        if (start >= target) { clearInterval(counter); setCount(target); }
        else { setCount(Math.ceil(start)); }
      }, 16);
      return () => clearInterval(counter);
    }, delay);
    return () => clearTimeout(timer);
  }, [target, delay]);

  return (
    <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm text-center transform hover:-translate-y-1 transition-transform duration-300 min-w-[120px] lg:min-w-0 flex-1 shrink-0 snap-center">
      <div className="w-10 h-10 md:w-12 md:h-12 mx-auto bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-3">
        <Icon size={20} className="md:w-6 md:h-6" />
      </div>
      <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-1" dir="ltr">+{count.toLocaleString()}</h3>
      <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-bold">{label}</p>
    </div>
  );
};

export const PublicView = ({ user, refreshUser, lang, t, currency, setCurrency, defaultAddress, footerData, openChatWithUser, openLegal }: { user: UserType | null, refreshUser: () => void, lang: string, t: any, currency: 'old' | 'new', setCurrency: (c: 'old' | 'new') => void, defaultAddress: string, footerData?: any, openChatWithUser?: (id: number) => void, openLegal: (type: 'privacy' | 'terms') => void }) => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // 🤖 AI Chatbot States
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'ai' | 'user', content: string }[]>([{ role: 'ai', content: lang === 'ar' ? 'مرحباً، أنا المساعد الطبي الذكي الخاص بك. صِف لي أعراضك الطبية وسأقوم بتوجيهك للطبيب المناسب، أو إلى قسم الطوارئ في الحالات الحرجة.' : 'Hello, I am your Medical AI Assistant. Describe your symptoms and I will guide you to the right specialist.' }]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  // 🟢 الصفحة الرئيسية هي الافتراضية الآن
  const [activeTab, setActiveTab] = useState<'home' | 'pharmacy' | 'clinic' | 'dental_clinic'>('home');
  const [topDoctors, setTopDoctors] = useState<any[]>([]);
  const [stats, setStats] = useState({ clinics: 0, dental_clinics: 0, pharmacies: 0, bookings: 0, patients: 0 });

  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [openNowPage, setOpenNowPage] = useState(1);
  const itemsPerPage = 6;
  const [showShop, setShowShop] = useState(false);
  const [showDoctors, setShowDoctors] = useState<false | 'doctor' | 'dentist'>(false);




  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    const updatedMessages = [...messages, { role: 'user' as const, content: userMsg }];
    setMessages(updatedMessages);
    setChatInput('');
    setIsAiTyping(true);
    try {
      // 🟢 إرسال تاريخ المحادثة للخادم لضمان سياق المحادثة
      const res = await api.post('/api/ai/triage', {
        message: userMsg,
        history: messages.slice(1) // إرسال كل الرسائل باستثناء رسالة الترحيب الأولى
      });
      if (res && res.reply) {
        if (res.isEmergency) {
          // 🚨 عرض تنبيه طوارئ بطريقة واضحة
          setMessages(prev => [...prev, {
            role: 'ai',
            content: '🚨 ' + (lang === 'ar'
              ? 'تحذير طوارئ! هذه حالة تستوجب إسعافاً فورياً. توجه لأقرب طوارئ أو اتصل بالإسعاف فوراً!'
              : 'EMERGENCY! This requires immediate medical attention. Go to the nearest ER or call an ambulance NOW!')
          }]);
        } else {
          setMessages(prev => [...prev, { role: 'ai', content: res.reply }]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: lang === 'ar' ? 'عذراً حدث خطأ بالاتصال بالذكاء الاصطناعي.' : 'Sorry, an AI connection error occurred.' }]);
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'ai', content: e?.error || (lang === 'ar' ? 'عذراً حدث خطأ بالاتصال بالذكاء الاصطناعي.' : 'Sorry, an AI connection error occurred.') }]);
    } finally {
      setIsAiTyping(false);
      // التمرير لأسفل المحادثة تلقائياً
      setTimeout(() => {
        const container = document.getElementById('chat-messages-container');
        if (container) container.scrollTop = container.scrollHeight;
      }, 100);
    }
  };

  const CHAT_SUGGESTIONS = lang === 'ar' ? [
    '🦠 عندي صداع شديد، ما التخصص المناسب?',
    '💊 كيف آخذ دواء أوميبرازول بشكل صحيح?',
    '🩺 كيف اتابع طلب دواءي?',
    '🍎 نصائح لمريض سكري'
  ] : [
    '🦠 I have a severe headache, what specialist should I see?',
    '💊 How do I take Omeprazole correctly?',
    '🩺 How can I track my medication order?',
    '🍎 Wellness tips for diabetics'
  ];

  useEffect(() => {
    // شاشة التحميل الأولية لمدة ثانيتين
    const timer = setTimeout(() => setIsInitialLoading(false), 2000);

    setLoading(true);
    // جلب المنشآت
    api.get('/api/public/facilities').then(data => setFacilities(data));
    api.get('/api/public/stats').then(data => setStats(data)).catch(() => { });

    // 🟢 جلب الأطباء وحساب أفضل 5 بناءً على معادلة رياضية ذكية
    api.get('/api/public/doctors').then(docs => {
      const rankedDoctors = docs.map((doc: any) => {
        // المعادلة: (متوسط التقييم × 10) + (عدد المراجعات × 2) = النقاط
        const score = (Number(doc.average_rating || 0) * 10) + (Number(doc.reviews_count || 0) * 2);
        return { ...doc, popularityScore: score };
      });
      // ترتيب تنازلي وأخذ أول 5
      rankedDoctors.sort((a: any, b: any) => b.popularityScore - a.popularityScore);
      setTopDoctors(rankedDoctors.slice(0, 5));
    }).finally(() => setLoading(false));

    if (navigator.geolocation) { navigator.geolocation.getCurrentPosition((pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }), (err) => console.log("الموقع غير مفعل")); }

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => { setCurrentPage(1); setOpenNowPage(1); }, [activeTab, searchQuery]);

  // 🟢 شاشة التحميل الافتتاحية (Splash Screen)
  if (isInitialLoading) return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 flex flex-col items-center justify-center transition-colors">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1, rotate: [0, -10, 10, 0] }} transition={{ duration: 0.8 }} className="relative mb-6">
        <div className="absolute inset-0 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
        <img src="/logo.png" alt="Logo" className="w-32 h-32 md:w-40 md:h-40 object-contain relative z-10 drop-shadow-2xl" />
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
        {t.appName}
      </motion.h1>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-8 flex gap-2">
        <span className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
        <span className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
        <span className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
      </motion.div>
    </div>
  );

  if (showShop) return <PublicShopView onBack={() => setShowShop(false)} facilities={facilities} lang={lang} user={user} refreshUser={refreshUser} currency={currency} setCurrency={setCurrency} defaultAddress={defaultAddress} />;
  if (showDoctors) return <DoctorsDirectoryView onBack={() => setShowDoctors(false)} lang={lang} t={t} filterRole={showDoctors} currency={currency} setCurrency={setCurrency} currentUser={user} openChatWithUser={openChatWithUser} />;

  const processedFacilities = facilities.filter(f => f.type === activeTab && (f.name.includes(searchQuery) || f.address.includes(searchQuery))).map(f => ({ ...f, isOpenNow: checkIsOpenNow(f), distance: userLocation ? parseFloat(getDistanceKm(userLocation.lat, userLocation.lng, f.latitude, f.longitude)) : null })).sort((a, b) => { if (a.isOpenNow && !b.isOpenNow) return -1; if (!a.isOpenNow && b.isOpenNow) return 1; if (a.distance !== null && b.distance !== null) return a.distance - b.distance; return 0; });
  const currentlyOpen = processedFacilities.filter(f => f.isOpenNow); const totalOpenPages = Math.ceil(currentlyOpen.length / itemsPerPage); const paginatedOpen = currentlyOpen.slice((openNowPage - 1) * itemsPerPage, openNowPage * itemsPerPage); const totalPages = Math.ceil(processedFacilities.length / itemsPerPage); const paginatedFacilities = processedFacilities.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-600"></div></div>;

  return (
    <div className="w-full flex flex-col min-h-[85vh] relative transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full overflow-x-hidden flex-1 relative">

        {/* الهيدر الرئيسي متاح دائماً */}
        <header className="mb-12 text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="inline-block px-5 py-2 mb-6 text-sm font-bold tracking-widest text-emerald-700 dark:text-emerald-400 uppercase bg-emerald-50 dark:bg-emerald-900/30 rounded-full border border-emerald-200 dark:border-emerald-800 shadow-sm">
            {t.communityHealth}
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
            {t.welcomeTitle}
          </h1>
          <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed mb-10">
            {t.welcomeSubtitle}
          </p>

          {/* الأزرار الثلاثة الرئيسية */}
          <div className="flex justify-center gap-4 flex-wrap max-w-3xl mx-auto">
            <button onClick={() => setActiveTab('pharmacy')} className={`flex-1 min-w-[150px] px-6 py-5 rounded-3xl font-black transition-all shadow-lg flex flex-col items-center gap-3 ${activeTab === 'pharmacy' ? 'bg-emerald-500 text-white scale-105' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-slate-200 dark:border-slate-700'}`}>
              <PharmacyIcon size={28} className={activeTab === 'pharmacy' ? 'text-white' : 'text-emerald-500'} />
              {t.pharmaciesTab}
            </button>
            <button onClick={() => setActiveTab('clinic')} className={`flex-1 min-w-[150px] px-6 py-5 rounded-3xl font-black transition-all shadow-lg flex flex-col items-center gap-3 ${activeTab === 'clinic' ? 'bg-blue-600 text-white scale-105' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-slate-700'}`}>
              <Stethoscope size={28} className={activeTab === 'clinic' ? 'text-white' : 'text-blue-600'} />
              {t.clinicsTab}
            </button>
            <button onClick={() => setActiveTab('dental_clinic')} className={`flex-1 min-w-[150px] px-6 py-5 rounded-3xl font-black transition-all shadow-lg flex flex-col items-center gap-3 ${activeTab === 'dental_clinic' ? 'bg-indigo-500 text-white scale-105' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-slate-200 dark:border-slate-700'}`}>
              <ToothIcon size={28} className={activeTab === 'dental_clinic' ? 'text-white' : 'text-indigo-500'} />
              {t.dentalClinicsTab}
            </button>
          </div>
        </header>

        {/* 🟢 محتوى الصفحة الرئيسية (عندما لا يتم اختيار قسم) */}
        {activeTab === 'home' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-16">

            {/* أشهر 5 أطباء */}
            {topDoctors.length > 0 && (
              <div className="mb-12 border-t border-slate-100 dark:border-slate-800 pt-12">
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 flex items-center justify-center gap-2"><Star className="text-yellow-400 fill-yellow-400" /> {t.topDoctorsTitle} <Star className="text-yellow-400 fill-yellow-400" /></h2>
                  <p className="text-slate-500">{t.topDoctorsSubtitle}</p>
                </div>

                {/* حاوية مرنة للتحكم بالعرض مع ميزة السحب للموبايل وبداية من اليمين للكمبيوتر */}
                <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-6 px-4 -mx-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {topDoctors.map((doc, idx) => (
                    <div key={doc.id} onClick={() => setSelectedDoctorId(doc.id)} className="w-[140px] md:w-[160px] shrink-0 snap-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer text-center relative overflow-hidden group flex flex-col">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-orange-500"></div>
                      <div className="absolute top-2 right-2 w-5 h-5 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-black flex items-center justify-center shadow-sm">#{idx + 1}</div>

                      <div className="w-14 h-14 mx-auto bg-slate-50 dark:bg-slate-800 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mb-2 overflow-hidden outline outline-2 outline-slate-100 dark:outline-slate-700 mt-2 shrink-0">
                        {doc.profile_picture ? <img src={doc.profile_picture} className="w-full h-full object-cover" /> : <User size={28} className="opacity-40" />}
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1 line-clamp-1">{lang === 'ar' ? 'د.' : 'Dr.'} {doc?.name?.trim() ? doc.name : doc.id}</h3>
                      <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-3">{doc.specialty ? (t[doc.specialty] || doc.specialty) : (doc.role === 'dentist' ? (lang === 'ar' ? 'أسنان' : 'Dentist') : t.doctor)}</p>

                      <div className="flex items-center justify-center gap-1 text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 py-1 rounded-lg mt-auto">
                        <Star size={12} className="fill-current" />
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">{Number(doc.average_rating).toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <WhyChooseUs lang={lang} t={t} />

            {/* 🟢 عنوان قسم الإحصائيات */}
            <div className="text-center mb-10 mt-20">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-3">
                <Activity size={32} className="text-blue-600 hidden sm:block" />
                {t.platformStatsTitle}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-3 font-medium max-w-xl mx-auto">
                {t.platformStatsSubtitle}
              </p>
            </div>

            {/* 🟢 العدادات الإحصائية الحقيقية (في مستوى واحد) */}
            <div className="w-full mt-8">
              <div className="flex lg:grid lg:grid-cols-5 gap-3 overflow-x-auto pb-4 ...">
                <AnimatedCounter
                  target={facilities.filter(f => f.type === 'clinic').length}
                  label={t.clincCount}
                  icon={ClinicIcon} delay={0}
                />
                <AnimatedCounter
                  target={facilities.filter(f => f.type === 'dental_clinic').length}
                  label={t.dentalCount}
                  icon={ToothIcon} delay={200}
                />
                <AnimatedCounter
                  target={facilities.filter(f => f.type === 'pharmacy').length}
                  label={t.pharmacyCount}
                  icon={PharmacyIcon} delay={400} // 👈 هنا ستظهر حبة الدواء الأنيقة
                />


                <AnimatedCounter target={stats.bookings || 0} label={t.bookingsCount} icon={Calendar} delay={600} />
                <AnimatedCounter target={stats.patients || 0} label={t.patientsCount} icon={Users} delay={800} />
              </div>
            </div>


          </motion.div>
        )}

        {/* 🟢 محتوى القوائم (عند اختيار صيدلية أو عيادة) */}
        {activeTab !== 'home' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-8 border-t border-slate-200 dark:border-slate-800">

            {/* شريط البحث والعودة */}
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
              <button onClick={() => setActiveTab('home')} className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-colors w-full md:w-auto">
                <ArrowRight size={18} /> {t.backToHome}
              </button>

              <div className="flex-1 relative group">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder={t.searchPlaceholderMain} className="w-full pr-12 pl-4 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-blue-600 outline-none transition-colors dark:text-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>

              <div className="flex justify-center md:justify-end">
                <CurrencyToggle currency={currency} setCurrency={setCurrency} lang={lang} />
              </div>
            </div>

            {/* الأزرار الفرعية للأقسام */}
            <div className="mb-10 flex flex-col sm:flex-row justify-center items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
              {activeTab === 'clinic' && (
                <button onClick={() => setShowDoctors('doctor')} className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-1">
                  <User size={18} /> {lang === 'ar' ? 'تصفح دليل الأطباء البشري المعتمدين' : 'Medical Doctors Directory'}
                </button>
              )}
              {activeTab === 'dental_clinic' && (
                <button onClick={() => setShowDoctors('dentist')} className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 bg-indigo-500 text-white hover:bg-indigo-600 hover:-translate-y-1">
                  <Smile size={18} /> {lang === 'ar' ? 'تصفح دليل أطباء الأسنان المعتمدين' : 'Dentists Directory'}
                </button>
              )}
              {activeTab === 'pharmacy' && (
                <button onClick={() => setShowShop(true)} className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 hover:-translate-y-1">
                  <ShoppingCart size={18} /> {lang === 'ar' ? 'الدخول للسوق الطبي وطلب الأدوية' : 'Shop Products'}
                </button>
              )}
            </div>

            <div className="flex flex-col gap-12 md:gap-16 mb-16">

              {/* قسم المناوبين الآن */}
              <div className="w-full">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3"><div className={`w-3 h-3 rounded-full animate-pulse ${activeTab === 'clinic' ? 'bg-blue-600' : 'bg-emerald-500'}`} /> {activeTab === 'pharmacy' ? t.pharmaciesOnCall : (activeTab === 'clinic' ? t.clinicsOnCall : t.dentistsOnCall)}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedOpen.length > 0 ? paginatedOpen.map(f => (
                    <div key={`open-${f.id}`} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-emerald-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all flex flex-col h-full">
                      <div className="absolute top-4 left-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-3 py-1 rounded-full animate-pulse">{t.openNow}</div>
                      <div className="flex items-center gap-4 mb-4 mt-2">
                        {f.image_url ? <img src={f.image_url} alt={f.name} className="w-14 h-14 object-cover rounded-xl shrink-0 shadow-sm border border-slate-100 dark:border-slate-700" /> : <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${activeTab === 'clinic' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800'}`}>{f.type === 'clinic' ? <Stethoscope size={24} /> : (f.type === 'dental_clinic' ? <ToothIcon size={24} /> : <Activity size={24} />)}</div>}
                        <div><h3 className="text-xl font-bold text-slate-900 dark:text-white line-clamp-1">{f.name}</h3>{(f.type === 'clinic' || f.type === 'dental_clinic') && f.specialty && <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block mt-0.5">{t[f.specialty] || f.specialty}</span>}{f.pharmacist_name && <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1"><User size={12} /> {f.pharmacist_name}</span>}{f.distance !== null && <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1.5 block">{lang === 'ar' ? `تبعد عنك: ${f.distance} كم` : `${f.distance} km away`} 📍</span>}</div>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-2 mb-4"><MapPin size={16} className="shrink-0" /> <span className="truncate">{f.address}</span></p>

                      <div className="mt-auto">
                         {f.doctor_id && (f.type === 'clinic' || f.type === 'dental_clinic') && (
                          <div className="flex items-center justify-center gap-2 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 p-2.5 rounded-xl text-sm font-bold mb-3 border border-orange-100 dark:border-orange-800">
                            <Users size={16} />
                            {t.waitingNow}
                            <span className="bg-orange-600 text-white px-2 py-0.5 rounded-md mx-1">{f.waiting_patients || 0}</span>
                            {t.waitingPatients}
                          </div>
                        )}

                        <div className="flex gap-2">
                          {f.doctor_id && (f.type === 'clinic' || f.type === 'dental_clinic') && (
                            <button onClick={() => { setSelectedDoctorId(f.doctor_id!); setSelectedFacilityId(f.id); }} className="flex-1 bg-blue-600 text-white border border-blue-600 text-center py-3 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">{lang === 'ar' ? 'احجز موعدك' : 'Book Appt'}</button>
                          )}
                          <a href={`tel:${f.phone}`} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-center py-3 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1"><Phone size={14} /> {t.callPharmacy}</a>
                        </div>
                      </div>
                    </div>
                  )) : (<div className="col-span-full text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 text-slate-500"><Clock className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} /><p className="text-slate-500 font-medium">{t.noFacilitiesOpen}</p></div>)}
                </div>
                {totalOpenPages > 1 && (<div className="flex justify-center items-center gap-4 mt-8"><button disabled={openNowPage === 1} onClick={() => setOpenNowPage(prev => prev - 1)} className="px-6 py-2.5 rounded-xl font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors">{t.previous}</button><span className="font-bold text-slate-500 text-sm" dir="ltr">{openNowPage} / {totalOpenPages}</span><button disabled={openNowPage === totalOpenPages} onClick={() => setOpenNowPage(prev => prev + 1)} className="px-6 py-2.5 rounded-xl font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors">{t.next}</button></div>)}
              </div>

              {/* الجدول الأسبوعي */}
              <div className="w-full">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3"><Calendar className="text-slate-400 dark:text-slate-500" /> {t.weeklySchedule}</h2>
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden w-full">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-right min-w-[800px]"><thead className="bg-slate-50/50 dark:bg-slate-800/50"><tr><th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{activeTab === 'pharmacy' ? t.directoryPharmacy : t.directoryClinic}</th>{(lang === 'en' ? DAYS_OF_WEEK_EN : DAYS_OF_WEEK_AR).map((day, idx) => (<th key={idx} className={`px-2 py-4 text-[10px] font-bold text-center uppercase tracking-widest ${new Date().getDay() === idx ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500'}`}>{day}</th>))}<th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">{t.actions}</th></tr></thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {paginatedFacilities.map((f, idx) => {
                          const isOpenNow = f.isOpenNow;
                          return (
                            <motion.tr key={`schedule-${f.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                              <td className="px-6 py-4"><div className="flex flex-col"><span className="font-bold text-slate-900 dark:text-slate-200 text-base">{f.name}</span>{(f.type === 'clinic' || f.type === 'dental_clinic') && f.specialty && <span className="text-[10px] font-bold text-blue-500 mt-0.5">{t[f.specialty] || f.specialty}</span>}<span className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin size={10} /> {f.address}</span><div className="mt-2">{isOpenNow ? <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-full">{t.openNow}</span> : <span className="px-2 py-0.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-full">{t.closedNow}</span>}</div></div></td>
                              {(lang === 'en' ? DAYS_OF_WEEK_EN : DAYS_OF_WEEK_AR).map((day, dIdx) => { const daySchedule = f.working_hours && f.working_hours[dIdx.toString()]; const isToday = new Date().getDay() === dIdx; return <td key={dIdx} className={`px-2 py-4 text-center border-x border-slate-50/50 dark:border-slate-800/50 ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>{daySchedule?.isOpen ? <div className="flex flex-col items-center justify-center"><span className={`text-[10px] font-mono font-bold ${isToday ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`} dir="ltr">{formatTime12h(daySchedule.start, lang)}</span><span className="text-[8px] text-slate-400 my-0.5">-</span><span className={`text-[10px] font-mono font-bold ${isToday ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`} dir="ltr">{formatTime12h(daySchedule.end, lang)}</span></div> : <span className="text-[10px] text-slate-300 dark:text-slate-600 font-bold">{lang === 'ar' ? 'عطلة' : 'Off'}</span>}</td>; })}
                              <td className="px-6 py-4 text-center">{f.doctor_id ? <button onClick={() => { setSelectedDoctorId(f.doctor_id!); setSelectedFacilityId(f.id); }} className="px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-1 mx-auto">{lang === 'ar' ? 'عرض الملف' : 'Profile'}</button> : <span className="text-slate-300 dark:text-slate-600 text-xs">---</span>}</td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (<div className="flex justify-center items-center gap-4 p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"><button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="px-6 py-2.5 rounded-xl font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors">{lang === 'ar' ? 'السابق' : 'Prev'}</button><span className="font-bold text-slate-500 text-sm" dir="ltr">{currentPage} / {totalPages}</span><button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="px-6 py-2.5 rounded-xl font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors">{lang === 'ar' ? 'التالي' : 'Next'}</button></div>)}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {/* 🟢 قسم الخريطة التفاعلية الشاملة */}
        {processedFacilities.length > 0 && (
          <div className="w-full bg-white dark:bg-slate-900 p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative z-0">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <MapPin className="text-blue-500" size={28} />
              {activeTab === 'pharmacy' ? t.pharmaciesOnMap : (activeTab === 'clinic' ? t.clinicsOnMap : t.dentistsOnMap)}
            </h2>
            <div className="h-[400px] w-full rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 relative z-0">
              <MapContainer
                // نأخذ إحداثيات أول عنصر في القائمة كمركز للخريطة
                center={[parseFloat(processedFacilities[0]?.latitude || '35.1318'), parseFloat(processedFacilities[0]?.longitude || '36.7578')]}
                zoom={14}
                style={{ height: '100%', width: '100%', zIndex: 1 }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {/* رسم الدبابيس لكل عيادة /صيدلية مفلترة */}
                {processedFacilities.map((f) => {
                  if (!f.latitude || !f.longitude) return null;
                  return (
                    <Marker
                      key={`map-marker-${f.id}`}
                      position={[parseFloat(f.latitude), parseFloat(f.longitude)]}
                    >
                      <Popup>
                        <div className="text-center min-w-[150px] p-1">
                          <strong className="block mb-1 text-sm text-slate-800">{f.name}</strong>
                          {(f.type === 'clinic' || f.type === 'dental_clinic') && f.specialty && (
                            <span className="text-[11px] font-bold text-blue-600 block mb-2">{t[f.specialty] || f.specialty}</span>
                          )}

                          {/* 🟢 الإضافة الجديدة: حالة الدوام (مفتوح / مغلق) */}
                          <div className="mb-2">
                            {f.isOpenNow ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
                                {t.openNow}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                                {t.closedNow}
                              </span>
                            )}
                          </div>
                          {/* 🔴 نهاية الإضافة */}

                          <span className="text-xs text-slate-500 block mb-3 line-clamp-2">{f.address}</span>
                          <div className="flex gap-2 justify-center">
                            <a href={`tel:${f.phone}`} className="bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold no-underline hover:bg-emerald-600 transition-colors w-full">
                              {t.callPharmacy}
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
        )}

        <AnimatePresence>
          {selectedDoctorId && <DoctorProfileModal doctorId={selectedDoctorId} facilityId={selectedFacilityId || undefined} onClose={() => { setSelectedDoctorId(null); setSelectedFacilityId(null); }} t={t} lang={lang} currency={currency} currentUser={user} openChatWithUser={openChatWithUser} />}
        </AnimatePresence>
      </div>

      {/* الفوتر */}
      <footer className="w-full bg-[#0c5bc6] dark:bg-slate-950 text-white pt-12 pb-10 mt-auto border-t-[5px] border-blue-400 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-wrap justify-between gap-y-12 gap-x-8 text-center lg:text-start">

            <div className="flex flex-col items-center lg:items-start pt-8 sm:pt-0 flex-1 min-w-[200px]">
              <h3 className="text-xl font-bold mb-5 text-blue-50 dark:text-slate-200">{lang === 'ar' ? 'ابحث عن طريق' : 'Search By'}</h3>
              <ul className="space-y-3 font-medium text-blue-100 dark:text-slate-400">
                <li><button onClick={() => { setShowDoctors('doctor'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors">{lang === 'ar' ? 'التخصص الطبي' : 'Medical Specialty'}</button></li>
                <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white transition-colors">{lang === 'ar' ? 'المنطقة' : 'Area'}</button></li>
              </ul>
            </div>

            <div className="flex flex-col items-center lg:items-start pt-8 lg:pt-0 flex-1 min-w-[200px]">
              <h3 className="text-xl font-bold mb-5 text-blue-50 dark:text-slate-200">{lang === 'ar' ? 'روابط هامة' : 'Important Links'}</h3>
              <ul className="space-y-3 font-medium text-blue-100 dark:text-slate-400 mb-8 text-center lg:text-start w-full">
                <li><button onClick={() => openLegal('privacy')} className="hover:text-white transition-colors">{lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}</button></li>
                <li><button onClick={() => openLegal('terms')} className="hover:text-white transition-colors">{lang === 'ar' ? 'شروط الاستخدام' : 'Terms of Use'}</button></li>
              </ul>
            </div>

            {(footerData?.appName || footerData?.aboutLink || footerData?.teamLink || footerData?.careersLink) && (
              <div className="flex flex-col items-center lg:items-start flex-1 min-w-[200px]">
                {footerData?.appName && <h3 className="text-3xl font-extrabold mb-5 font-mono tracking-wider">{footerData.appName}</h3>}
                <ul className="space-y-3 font-medium text-blue-100 dark:text-slate-400">
                  {footerData?.aboutLink && <li><a href={footerData.aboutLink} className="hover:text-white transition-colors">{lang === 'ar' ? 'من نحن' : 'About Us'}</a></li>}
                  {footerData?.teamLink && <li><a href={footerData.teamLink} className="hover:text-white transition-colors">{lang === 'ar' ? 'فريق العمل' : 'Our Team'}</a></li>}
                  {footerData?.careersLink && <li><a href={footerData.careersLink} className="hover:text-white transition-colors">{lang === 'ar' ? 'وظائف' : 'Careers'}</a></li>}
                </ul>
              </div>
            )}

            {footerData?.doctorJoinLink && (
              <div className="flex flex-col items-center lg:items-start pt-8 sm:pt-0 flex-1 min-w-[200px]">
                <h3 className="text-xl font-bold mb-5 text-blue-50 dark:text-slate-200">{lang === 'ar' ? 'هل أنت طبيب ؟' : 'Are you a doctor?'}</h3>
                <ul className="space-y-3 font-medium text-blue-100 dark:text-slate-400">
                  <li><a href={footerData.doctorJoinLink} className="hover:text-white transition-colors">{lang === 'ar' ? 'انضم إلى أطبائنا' : 'Join our doctors'}</a></li>
                </ul>
              </div>
            )}

            {(footerData?.libraryLink || footerData?.contactLink) && (
              <div className="flex flex-col items-center lg:items-start pt-8 lg:pt-0 flex-1 min-w-[200px]">
                <h3 className="text-xl font-bold mb-5 text-blue-50 dark:text-slate-200">{lang === 'ar' ? 'تحتاج للمساعدة ؟' : 'Need Help?'}</h3>
                <ul className="space-y-3 font-medium text-blue-100 dark:text-slate-400 mb-8 text-center lg:text-start w-full">
                  {footerData?.libraryLink && <li><a href={footerData.libraryLink} className="hover:text-white transition-colors">{lang === 'ar' ? 'مكتبة طبية' : 'Medical Library'}</a></li>}
                  {footerData?.contactLink && <li><a href={footerData.contactLink} className="hover:text-white transition-colors">{lang === 'ar' ? 'اتصل بنا' : 'Contact Us'}</a></li>}
                </ul>
              </div>
            )}

            <div className="flex flex-col items-center lg:items-start pt-8 lg:pt-0 flex-1 min-w-full lg:min-w-[300px] lg:max-w-md">
              <div className="flex flex-col sm:flex-row gap-4 mb-8 w-full justify-center lg:justify-start">
                <a
                  href="/taiba-health-v4.apk"
                  download="taiba-health-v4.apk"
                  className="flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-bold shadow-lg transition-transform hover:-translate-y-1 w-full sm:w-auto"
                >
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0004.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 0 0-.1521-.5676.416.416 0 0 0-.5676.1521l-2.022 3.503C15.548 8.1633 13.852 7.747 12 7.747c-1.852 0-3.548.4163-5.1371 1.2028L4.841 5.4467a.416.416 0 0 0-.5676-.1521.416.416 0 0 0-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
                  </svg>
                  {lang === 'ar' ? ' تنزيل لأجهزة أندرويد ' : 'Download for Android'}
                </a>

                {footerData?.iosLink && (
                  <a href={footerData.iosLink} target="_blank" rel="noreferrer" className="hover:opacity-80 transition-opacity flex items-center justify-center w-full sm:w-auto">
                    <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="App Store" className="h-12 object-contain" />
                  </a>
                )}
              </div>

              <div className="flex items-center justify-center lg:justify-start gap-6 text-blue-100 dark:text-slate-400 w-full mt-2">
                {footerData?.twitter && <a href={footerData.twitter} target="_blank" rel="noreferrer" className="hover:text-white hover:scale-110 transition-all"><span className="text-2xl font-bold font-mono">X</span></a>}
                {footerData?.instagram && <a href={footerData.instagram} target="_blank" rel="noreferrer" className="hover:text-white hover:scale-110 transition-all"><svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 1.77-6.98 6.276-.058 1.28-.072 1.688-.072 4.947s.014 3.667.072 4.947c.2 4.502 2.62 6.074 6.98 6.274 1.28.058 1.688.072 4.947.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-1.771 6.979-6.274.059-1.28.073-1.687.073-4.947s-.014-3.667-.073-4.947c-.197-4.504-2.622-6.076-6.979-6.276-1.28-.058-1.689-.072-4.948-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg></a>}
                {footerData?.facebook && <a href={footerData.facebook} target="_blank" rel="noreferrer" className="hover:text-white hover:scale-110 transition-all"><svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" /></svg></a>}
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* 🤖 AI Chatbot Widget */}
      <div className="fixed bottom-4 left-4 md:bottom-6 md:left-6 z-50 flex flex-col items-start pointer-events-none" style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
        <AnimatePresence>
          {chatOpen && (
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-blue-100 dark:border-slate-800 w-80 md:w-96 mb-4 flex flex-col overflow-hidden pointer-events-auto">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-800 dark:to-indigo-900 p-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-2xl backdrop-blur-sm"><Brain size={24} /></div>
                  <div>
                    <h3 className="font-bold text-sm">{lang === 'ar' ? 'المساعد الطبي الذكي' : 'AI Triage Assistant'}</h3>
                    <p className="text-[10px] text-blue-100 font-medium">{lang === 'ar' ? 'توجيه مبدئي ذكي وسريع' : 'Smart and quick triage'}</p>
                  </div>
                </div>
                <button onClick={() => setChatOpen(false)} className="hover:bg-white/20 hover:rotate-90 p-1.5 rounded-full transition-all"><X size={18} /></button>
              </div>

              <div className="p-4 h-[350px] overflow-y-auto space-y-4 bg-slate-50 dark:bg-slate-950 flex flex-col scroll-smooth" id="chat-messages-container">
                {messages.map((m, i) => {
                  const isEmergencyMsg = m.role === 'ai' && m.content.startsWith('🚨');
                  return (
                    <div key={i} className={`flex ${m.role === 'user' ? (lang === 'ar' ? 'justify-end' : 'justify-start') : (lang === 'ar' ? 'justify-start' : 'justify-end')} w-full`}>
                      <div className={`max-w-[90%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isEmergencyMsg
                        ? 'bg-red-600 text-white font-bold border-2 border-red-400 animate-pulse rounded-xl w-full text-center'
                        : m.role === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-sm rtl:rounded-tr-2xl rtl:rounded-tl-sm'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm rtl:rounded-tl-2xl rtl:rounded-tr-sm font-medium'
                        }`}>
                        {m.content}
                      </div>
                    </div>
                  );
                })}
                {/* 🟢 اقتراحات سريعة تظهر عند بداية المحادثة */}
                {messages.length === 1 && !isAiTyping && (
                  <div className="flex flex-col gap-2 mt-2">
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold">{lang === 'ar' ? 'جرب السؤال عن:' : 'Or try asking:'}</p>
                    {CHAT_SUGGESTIONS.map((s, i) => (
                      <button key={i} onClick={() => { setChatInput(s.slice(2)); }} className="text-right rtl:text-right text-[12px] bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors font-medium shadow-sm">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                {isAiTyping && (
                  <div className={`flex ${lang === 'ar' ? 'justify-start' : 'justify-end'} w-full`}>
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl rounded-tl-sm rtl:rounded-tl-2xl rtl:rounded-tr-sm shadow-sm flex gap-1.5 items-center w-fit">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2 relative z-10">
                <input type="text" disabled={isAiTyping} className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all dark:text-white disabled:opacity-50" placeholder={lang === 'ar' ? 'اكتب أعراضك هنا...' : 'Type symptoms...'} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendChat()} />
                <button disabled={isAiTyping || !chatInput.trim()} onClick={handleSendChat} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shrink-0 shadow-sm flex items-center justify-center">
                  <Send size={18} className={lang === 'ar' ? '-scale-x-100' : ''} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={() => setChatOpen(!chatOpen)} className={`pointer-events-auto relative shadow-2xl p-4 md:p-5 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 ${chatOpen ? 'bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rotate-90 scale-90' : 'bg-gradient-to-tr from-blue-600 to-indigo-600 hover:shadow-blue-500/30'} text-white group`}>
          {!chatOpen && <span className="absolute -top-1 -right-1 flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-sky-500"></span></span>}
          {chatOpen ? <X size={26} className="animate-in fade-in spin-in" /> : <Brain size={28} className="animate-in fade-in group-hover:animate-pulse" />}
        </button>
      </div>

    </div>
  );
};