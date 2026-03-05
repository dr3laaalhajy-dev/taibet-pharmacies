import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { api } from '../api-client';
import { UserType } from '../types';

export const WalletRequestsManager = ({ user, lang }: { user: UserType, lang: 'ar' | 'en' }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🟢 1. حالة النافذة المنبثقة للتأكيد (الزر الخفي)
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, id: number | null, action: 'approve' | 'reject' | null}>({isOpen: false, id: null, action: null});

  const loadRequests = async () => {
    try {
      const data = await api.get('/api/admin/wallet-requests');
      setRequests(data);
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل تحميل الطلبات' : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, []);

  // 🟢 2. هذه الدالة تفتح النافذة فقط (لا تكلم السيرفر)
  const handleAction = (id: number, action: 'approve' | 'reject') => {
    setConfirmModal({ isOpen: true, id, action });
  };

  // 🟢 3. هذه الدالة تكلم السيرفر (وتعمل فقط عندما يضغط المستخدم "تأكيد" داخل النافذة)
  const executeAction = async () => {
    if (!confirmModal.id || !confirmModal.action) return;
    try { 
      await api.patch(`/api/admin/wallet-requests/${confirmModal.id}`, { action: confirmModal.action }); 
      loadRequests(); 
      toast.success(lang === 'ar' ? 'تمت العملية بنجاح' : 'Success');
      setConfirmModal({ isOpen: false, id: null, action: null }); // إغلاق النافذة
    } catch (err: any) { 
      toast.error(err.error || (lang === 'ar' ? 'حدث خطأ' : 'Error')); 
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold animate-pulse">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">{lang === 'ar' ? 'طلبات المحفظة' : 'Wallet Requests'}</h2>
      
      {requests.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 font-medium">
          {lang === 'ar' ? 'لا يوجد طلبات معلقة حالياً.' : 'No pending requests.'}
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map(req => (
            <div key={req.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="font-bold text-slate-900">{req.user_name} <span className="text-xs text-slate-500">({req.user_email})</span></p>
                <p className="text-sm font-bold mt-2">
                  <span className={req.type === 'deposit' ? 'text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md' : 'text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md'}>
                    {req.type === 'deposit' ? (lang === 'ar' ? 'إيداع (شحن)' : 'Deposit') : (lang === 'ar' ? 'سحب كاش' : 'Withdrawal')}
                  </span>
                  <span className="mx-3 text-slate-300">|</span>
                  <span className="text-lg text-slate-900" dir="ltr">{req.amount}ل.س جديدة</span>
                </p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                {/* أزرار القبول والرفض التي تفتح النافذة */}
                <button onClick={() => handleAction(req.id, 'approve')} className="flex-1 md:flex-none px-6 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-sm font-bold transition-colors shadow-sm">
                  {lang === 'ar' ? 'قبول' : 'Approve'}
                </button>
                <button onClick={() => handleAction(req.id, 'reject')} className="flex-1 md:flex-none px-6 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-bold transition-colors">
                  {lang === 'ar' ? 'رفض' : 'Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🟢 4. تصميم نافذة التأكيد الأنيقة (تظهر في المنتصف) */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center relative">
              
              <button onClick={() => setConfirmModal({isOpen: false, id: null, action: null})} className="absolute top-4 left-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20}/>
              </button>
              
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${confirmModal.action === 'approve' ? 'bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-100' : 'bg-red-100 text-red-600 shadow-lg shadow-red-100'}`}>
                {confirmModal.action === 'approve' ? <CheckCircle size={40} /> : <XCircle size={40} />}
              </div>
              
              <h3 className="text-2xl font-bold mb-2 text-slate-900">
                {lang === 'ar' ? 'تأكيد الإجراء' : 'Confirm Action'}
              </h3>
              
              <p className="text-slate-500 mb-8 font-medium">
                {lang === 'ar' ? `هل أنت متأكد أنك تريد ${confirmModal.action === 'approve' ? 'الموافقة على' : 'رفض'} هذا الطلب؟` : `Are you sure you want to ${confirmModal.action} this request?`}
              </p>
              
              <div className="flex gap-3">
                <button onClick={() => setConfirmModal({isOpen: false, id: null, action: null})} className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button onClick={executeAction} className={`flex-1 py-3.5 rounded-xl font-bold text-white transition-colors shadow-md ${confirmModal.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}>
                  {lang === 'ar' ? 'تأكيد' : 'Confirm'}
                </button>
              </div>
              
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};