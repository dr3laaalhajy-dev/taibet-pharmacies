import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, X, Clock, Trash2 } from 'lucide-react';
import { api } from '../api-client';
import { UserType, SUPER_ADMINS } from '../types';

export const WalletRequestsManager = ({ user, lang }: { user: UserType, lang: 'ar' | 'en' }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, id: number | null, action: 'approve' | 'reject' | null}>({isOpen: false, id: null, action: null});

  const isSuperAdmin = SUPER_ADMINS.includes(user.email);

  const loadRequests = async () => {
    try { const data = await api.get('/api/admin/wallet-requests'); setRequests(data); } 
    catch (err) { toast.error(lang === 'ar' ? 'فشل التحميل' : 'Failed to load'); } 
    finally { setLoading(false); }
  };

  useEffect(() => { loadRequests(); }, []);

  const handleAction = (id: number, action: 'approve' | 'reject') => setConfirmModal({ isOpen: true, id, action });

  const executeAction = async () => {
    if (!confirmModal.id || !confirmModal.action) return;
    try { 
      await api.patch(`/api/admin/wallet-requests/${confirmModal.id}`, { action: confirmModal.action }); 
      loadRequests(); toast.success('تمت العملية بنجاح'); setConfirmModal({ isOpen: false, id: null, action: null }); 
    } catch (err: any) { toast.error(err.error || 'حدث خطأ'); }
  };

  const deleteRecord = async (id: number) => {
    if(!window.confirm('هل أنت متأكد من حذف هذا السجل نهائياً؟')) return;
    try { await api.delete(`/api/admin/wallet-requests/${id}`); loadRequests(); toast.success('تم حذف السجل'); } 
    catch (err) { toast.error('خطأ في الحذف'); }
  };

  // فلترة الطلبات (مع إخفاء السجلات التي مر عليها 60 يوماً تلقائياً)
  const sixtyDaysAgo = new Date(); sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  const pendingRequests = requests.filter(req => req.status === 'pending');
  const historyRequests = requests.filter(req => req.status !== 'pending' && new Date(req.created_at || new Date()) >= sixtyDaysAgo);

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold animate-pulse">جاري التحميل...</div>;

  const currentList = tab === 'pending' ? pendingRequests : historyRequests;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">{lang === 'ar' ? 'طلبات المحفظة' : 'Wallet Requests'}</h2>
        <div className="flex bg-slate-200 p-1 rounded-xl">
          <button onClick={() => setTab('pending')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors ${tab === 'pending' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}>طلبات معلقة ({pendingRequests.length})</button>
          <button onClick={() => setTab('history')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors ${tab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}>سجل الطلبات</button>
        </div>
      </div>
      
      {currentList.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border text-center text-slate-500 font-medium">لا توجد طلبات هنا.</div>
      ) : (
        <div className="grid gap-4">
          {currentList.map(req => (
            <div key={req.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="font-bold text-slate-900">{req.user_name} <span className="text-xs text-slate-500">({req.user_email})</span></p>
                <p className="text-sm font-bold mt-2">
                  <span className={req.type === 'deposit' ? 'text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md' : 'text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md'}>{req.type === 'deposit' ? 'إيداع' : 'سحب'}</span>
                  <span className="mx-3 text-slate-300">|</span><span className="text-lg text-slate-900" dir="ltr">{req.amount} ل.س</span>
                </p>
              </div>
              
              {tab === 'pending' ? (
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => handleAction(req.id, 'approve')} className="flex-1 px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold">قبول</button>
                  <button onClick={() => handleAction(req.id, 'reject')} className="flex-1 px-6 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold">رفض</button>
                </div>
              ) : (
                <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                  <span className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${req.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {req.status === 'approved' ? <CheckCircle size={16}/> : <XCircle size={16}/>}
                    {req.status === 'approved' ? 'تم القبول' : 'تم الرفض'}
                  </span>
                  {isSuperAdmin && (
                    <button onClick={() => deleteRecord(req.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={20}/></button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* نافذة التأكيد */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-8 rounded-3xl w-full max-w-sm text-center">
              <h3 className="text-2xl font-bold mb-4">{confirmModal.action === 'approve' ? 'تأكيد القبول' : 'تأكيد الرفض'}</h3>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setConfirmModal({isOpen: false, id: null, action: null})} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-600">إلغاء</button>
                <button onClick={executeAction} className={`flex-1 py-3 text-white rounded-xl font-bold ${confirmModal.action === 'approve' ? 'bg-emerald-600' : 'bg-red-600'}`}>تأكيد</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};