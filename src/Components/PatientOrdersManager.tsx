import React, { useState, useEffect } from 'react';
import { api } from '../api-client';
import { toast } from 'react-hot-toast';
import { Clock, FileText, CheckCircle, XCircle } from 'lucide-react';
import { Order } from '../types';

export const PatientOrdersManager = ({ lang }: { lang: 'ar' | 'en' }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/patient/orders');
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل جلب الطلبات' : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAction = async (orderId: number, action: 'accept' | 'reject') => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const newStatus = action === 'accept' ? 'pending' : 'cancelled'; // 'pending' means user approved pricing, pharmacy will now prepare it
      await api.patch(`/api/orders/${orderId}/status`, { status: newStatus });
      toast.success(lang === 'ar' ? (action === 'accept' ? 'تم تأكيد الطلب بنجاح' : 'تم إلغاء الطلب') : (action === 'accept' ? 'Order accepted' : 'Order cancelled'));
      fetchOrders();
    } catch (err) {
      toast.error(lang === 'ar' ? 'حدث خطأ' : 'Error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600"></div></div>;
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center border border-dashed border-slate-300 dark:border-slate-700">
        <FileText size={64} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">{lang === 'ar' ? 'لا يوجد لديك طلبات سابقة' : 'No previous orders'}</h3>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map(order => {
        const isAwaitingApproval = order.status === 'awaiting_approval';
        let statusBadge = null;
        if (order.status === 'pending') statusBadge = <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{lang === 'ar' ? 'قيد التجهيز' : 'Processing'}</span>;
        if (order.status === 'completed') statusBadge = <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">{lang === 'ar' ? 'مكتمل' : 'Completed'}</span>;
        if (order.status === 'cancelled') statusBadge = <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">{lang === 'ar' ? 'ملغي' : 'Cancelled'}</span>;
        if (order.status === 'pending_pricing') statusBadge = <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">{lang === 'ar' ? 'قيد التسعير' : 'Pending Pricing'}</span>;
        if (order.status === 'awaiting_approval') statusBadge = <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">{lang === 'ar' ? 'بانتظار موافقتك' : 'Awaiting Approval'}</span>;

        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

        return (
          <div key={order.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-4 border-b dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-lg dark:text-white">{order.pharmacy_name || (lang === 'ar' ? 'صيدلية' : 'Pharmacy')}</h3>
                <p className="text-xs text-slate-500 mt-1">{new Date(order.created_at).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</p>
              </div>
              <div className="text-right">
                {statusBadge}
                <div className="font-black text-xl text-indigo-600 dark:text-indigo-400 mt-2" dir="ltr">{(parseFloat(order.total_price || '0') / 100).toLocaleString()} <span className="text-xs font-normal">LS</span></div>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'المنتجات / الأدوية:' : 'Items:'}</h4>
              <ul className="space-y-1">
                {Array.isArray(items) && items.map((item, idx) => (
                  <li key={idx} className="text-sm flex justify-between bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                    <span className="dark:text-white">{item.name} <span className="text-slate-500">x{item.qty}</span></span>
                    <span className="font-bold dark:text-white" dir="ltr">{(parseFloat(item.price || '0') * (item.qty || 1) / 100).toLocaleString()} LS</span>
                  </li>
                ))}
              </ul>
            </div>

            {order.prescription_url && (
              <div className="mb-4">
                <a href={order.prescription_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-sm font-bold flex items-center gap-1"><FileText size={16}/> {lang === 'ar' ? 'عرض الوصفة المرفقة' : 'View Attached Prescription'}</a>
              </div>
            )}

            {isAwaitingApproval && (
              <div className="flex gap-3 pt-4 border-t dark:border-slate-800">
                <button onClick={() => handleAction(order.id, 'accept')} disabled={isSubmitting} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                  <CheckCircle size={18} /> {lang === 'ar' ? 'تأكيد الطلب بهذا السعر' : 'Accept Price & Order'}
                </button>
                <button onClick={() => handleAction(order.id, 'reject')} disabled={isSubmitting} className="flex-1 py-3 bg-red-100 text-red-700 rounded-xl font-bold hover:bg-red-200 transition-colors flex items-center justify-center gap-2">
                  <XCircle size={18} /> {lang === 'ar' ? 'رفض السعر وإلغاء' : 'Reject & Cancel'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
