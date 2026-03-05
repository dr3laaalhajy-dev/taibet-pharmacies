import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { WalletRequest, UserType } from '../types';
import { api } from '../api-client';

export const WalletRequestsManager = ({ user, lang }: { user: UserType, lang: string }) => {
  const [requests, setRequests] = useState<WalletRequest[]>([]); const [loading, setLoading] = useState(true);
  const loadRequests = () => { api.get('/api/admin/wallet-requests').then(setRequests).finally(() => setLoading(false)); };
  useEffect(() => { loadRequests(); }, []);
const handleAction = (id: number, action: 'approve' | 'reject') => {
    // إظهار نافذة التأكيد المصغرة الأنيقة
    toast((t) => (
      <div className="flex flex-col gap-4 text-center">
        <p className="font-bold text-lg text-slate-800">
          {lang === 'ar' ? 'تأكيد الإجراء؟' : 'Confirm action?'}
        </p>
        <div className="flex justify-center gap-3">
          
          {/* زر حسناً (يحتوي على كود الاتصال بالسيرفر) */}
          <button 
            onClick={async () => { 
              toast.dismiss(t.id); // إخفاء النافذة أولاً
              try { 
                await api.patch(`/api/admin/wallet-requests/${id}`, { action }); 
                loadRequests(); 
                toast.success(lang === 'ar' ? 'تمت العملية بنجاح' : 'Success'); // رسالة نجاح خضراء بدلاً من الصمت
              } catch (err) { 
                toast.error(lang === 'ar' ? 'حدث خطأ' : 'Error'); // رسالة خطأ حمراء بدلاً من alert
              }
            }} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold transition-colors"
          >
            {lang === 'ar' ? 'حسناً' : 'Confirm'}
          </button>

          {/* زر إلغاء (يقوم فقط بإخفاء النافذة) */}
          <button 
            onClick={() => toast.dismiss(t.id)} 
            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2 rounded-xl font-bold transition-colors"
          >
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>

        </div>
      </div>
    ), { duration: Infinity }); // Infinity تعني أن النافذة لن تختفي حتى يضغط المستخدم على أحد الزرين
  };
  if (loading) return <div>{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-6">{lang === 'ar' ? 'طلبات المحفظة (شحن / سحب)' : 'Wallet Requests'}</h2>
      {requests.map(r => (
        <div key={r.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-1 text-xs font-bold rounded-lg ${r.type === 'deposit' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {r.type === 'deposit' ? (lang === 'ar' ? 'إيداع / شحن +' : 'Deposit') : (lang === 'ar' ? 'سحب كاش -' : 'Withdrawal')}
              </span>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : r.status === 'approved' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                {r.status === 'pending' ? 'قيد الانتظار' : r.status === 'approved' ? 'مكتمل' : 'مرفوض'}
              </span>
            </div>
            <h4 className="font-bold text-slate-900">{r.user_name} <span className="text-xs text-slate-400">({r.user_email})</span></h4>
            <p className="text-lg font-extrabold text-slate-800" dir="ltr">{r.amount} ل.س</p>
          </div>
          {r.status === 'pending' && (
            <div className="flex flex-col gap-2">
              <button onClick={() => handleAction(r.id, 'approve')} className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-600 text-sm flex items-center justify-center gap-1"><CheckCircle size={16}/> {lang === 'ar' ? 'موافقة' : 'Approve'}</button>
              <button onClick={() => handleAction(r.id, 'reject')} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-100 text-sm flex items-center justify-center gap-1"><XCircle size={16}/> {lang === 'ar' ? 'رفض' : 'Reject'}</button>
            </div>
          )}
        </div>
      ))}
      {requests.length === 0 && <p className="text-slate-500 text-center py-10">{lang === 'ar' ? 'لا يوجد طلبات.' : 'No requests.'}</p>}
    </div>
  );
};