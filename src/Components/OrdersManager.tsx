import React, { useState, useEffect } from 'react';
import { CheckCircle, Trash2 } from 'lucide-react';
import { UserType, Facility, Order } from '../types';
import { api } from '../api-client';

export const OrdersManager = ({ user, facilities, lang }: { user: UserType, facilities: Facility[], lang: string }) => {
  const [orders, setOrders] = useState<Order[]>([]); const [loading, setLoading] = useState(true); const [activeSubTab, setActiveSubTab] = useState<'pending' | 'past'>('pending'); const [adminFilter, setAdminFilter] = useState<number | 'all'>('all');
  const loadOrders = () => { api.get('/api/orders').then(setOrders).finally(() => setLoading(false)); };
  useEffect(() => { loadOrders(); }, []);
  const updateStatus = async (id: number, status: string) => { if(!window.confirm(lang === 'ar' ? `تأكيد تغيير حالة الطلب؟` : 'Confirm status change?')) return; try { await api.patch(`/api/orders/${id}/status`, { status }); loadOrders(); } catch(err) { alert(lang === 'ar' ? 'حدث خطأ' : 'Error occurred'); } };
  const filteredOrders = adminFilter === 'all' ? orders : orders.filter(o => o.pharmacy_name === facilities.find(f => f.id === adminFilter)?.name);
  const pendingOrders = filteredOrders.filter(o => o.status === 'pending'); const pastOrders = filteredOrders.filter(o => o.status !== 'pending'); const displayOrders = activeSubTab === 'pending' ? pendingOrders : pastOrders;
  if (loading) return <div>{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>;

  return (
    <div>
      {user.role === 'admin' && (
        <div className="mb-6 bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4 max-w-xl">
          <label className="font-bold text-slate-700">{lang === 'ar' ? 'فلتر الصيدليات:' : 'Filter Pharmacies:'}</label>
          <select className="flex-1 px-4 py-2 rounded-xl border border-slate-200 outline-none" value={adminFilter} onChange={e => setAdminFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}><option value="all">{lang === 'ar' ? 'عرض جميع الطلبات' : 'All Orders'}</option>{facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
        </div>
      )}
      <div className="flex gap-4 mb-8">
        <button onClick={() => setActiveSubTab('pending')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${activeSubTab === 'pending' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{lang === 'ar' ? `طلبات جديدة (${pendingOrders.length})` : `New Orders (${pendingOrders.length})`}</button>
        <button onClick={() => setActiveSubTab('past')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${activeSubTab === 'past' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{lang === 'ar' ? 'طلبات سابقة' : 'Past Orders'}</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {displayOrders.map(o => (
          <div key={o.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
              <div>
                <h4 className="font-bold text-lg text-slate-900">{o.customer_name}</h4><p className="text-sm font-mono text-slate-500 mt-1">{o.customer_phone}</p>
                {user.role === 'admin' && <p className="text-[10px] bg-indigo-50 px-2 py-1 rounded text-indigo-700 mt-2 font-bold inline-block">صيدلية: {o.pharmacy_name}</p>}
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${o.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : o.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {o.status === 'pending' ? (lang === 'ar' ? 'قيد الانتظار' : 'Pending') : o.status === 'completed' ? (lang === 'ar' ? 'مكتمل' : 'Completed') : (lang === 'ar' ? 'ملغي' : 'Cancelled')}
                </span>
                <p className="text-[10px] text-slate-400 mt-2" dir="ltr">{new Date(o.created_at).toLocaleString('ar-EG')}</p>
              </div>
            </div>
            <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
              {o.items.map((item, idx) => ( <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-200 pb-2 last:border-0 last:pb-0"><span className="font-medium text-slate-700">{item.name} <span className="text-emerald-600 font-bold ml-1">x{item.qty}</span></span><span className="font-mono text-slate-600 font-bold" dir="ltr">{parseFloat(item.price) * item.qty}ل.س جديدة</span></div> ))}
              <div className="flex justify-between items-center pt-3 border-t border-slate-200 font-bold text-lg"><span>{lang === 'ar' ? 'المجموع الكلي:' : 'Total:'}</span><span dir="ltr" className="text-indigo-600">{o.total_price}ل.س جديدة</span></div>
            </div>
            {o.status === 'pending' ? (
              <div className="flex gap-3">
                <button onClick={() => updateStatus(o.id, 'completed')} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold hover:bg-emerald-600 flex justify-center items-center gap-2 transition-colors"><CheckCircle size={18}/> {lang === 'ar' ? 'قبول وإنهاء' : 'Complete'}</button>
                <button onClick={() => updateStatus(o.id, 'cancelled')} className="px-6 bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors"><Trash2 size={18}/></button>
              </div>
            ) : (
              (user.email.includes('admin') || user.role === 'admin') && (
                <div className="flex justify-end border-t border-slate-100 pt-3">
                  <button onClick={async () => { if(window.confirm('حذف نهائي؟')) { await api.delete(`/api/orders/${o.id}`); loadOrders(); } }} className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Trash2 size={16}/> حذف الطلب السابق</button>
                </div>
              )
            )}
          </div>
        ))}
        {displayOrders.length === 0 && <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-3xl">{lang === 'ar' ? 'لا يوجد طلبات في هذه القائمة.' : 'No orders here.'}</div>}
      </div>
    </div>
  );
};