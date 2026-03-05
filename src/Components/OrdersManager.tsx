import React, { useState, useEffect } from 'react';
import { CheckCircle, Trash2, Clock, FileText } from 'lucide-react';
import { UserType, Facility, Order } from '../types';
import { api } from '../api-client'; // 👈 تم التصحيح هنا

export const OrdersManager = ({ user, facilities, lang }: { user: UserType, facilities: Facility[], lang: string }) => {
  const [orders, setOrders] = useState<Order[]>([]); 
  const [loading, setLoading] = useState(true); 
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'past'>('pending'); 
  const [adminFilter, setAdminFilter] = useState<number | 'all'>('all');

  const loadOrders = () => { api.get('/api/orders').then(setOrders).finally(() => setLoading(false)); };
  useEffect(() => { loadOrders(); }, []);

  const updateStatus = async (id: number, status: string) => { 
    if(!window.confirm('تأكيد تغيير الحالة؟')) return; 
    try { await api.patch(`/api/orders/${id}/status`, { status }); loadOrders(); } 
    catch(err) { alert('خطأ'); } 
  };

  if (loading) return <div className="p-10 text-center">جاري التحميل...</div>;

  const filteredOrders = adminFilter === 'all' ? orders : orders.filter(o => o.pharmacy_name === facilities.find(f => f.id === adminFilter)?.name);
  const displayOrders = filteredOrders.filter(o => activeSubTab === 'pending' ? o.status === 'pending' : o.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <button onClick={() => setActiveSubTab('pending')} className={`px-6 py-3 rounded-xl font-bold ${activeSubTab === 'pending' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>طلبات جديدة</button>
        <button onClick={() => setActiveSubTab('past')} className={`px-6 py-3 rounded-xl font-bold ${activeSubTab === 'past' ? 'bg-slate-900 text-white' : 'bg-white border'}`}>الأرشيف</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {displayOrders.map(o => (
          <div key={o.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex justify-between mb-4">
              <div><h4 className="font-bold text-lg">{o.customer_name}</h4><p className="text-sm text-slate-500">{o.customer_phone}</p></div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${o.status === 'pending' ? 'bg-yellow-100' : 'bg-emerald-100'}`}>{o.status}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl mb-4">
              {o.items.map((item, i) => (<div key={i} className="flex justify-between text-sm mb-1"><span>{item.name} x{item.qty}</span><span>{parseFloat(item.price)*item.qty} ل.س</span></div>))}
              <div className="border-t mt-2 pt-2 font-bold flex justify-between text-blue-600"><span>المجموع:</span><span>{o.total_price} ل.س</span></div>
            </div>
            <div className="flex gap-2">
              {o.status === 'pending' ? (
                <><button onClick={() => updateStatus(o.id, 'completed')} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold">قبول</button>
                <button onClick={() => updateStatus(o.id, 'cancelled')} className="px-4 bg-red-50 text-red-600 rounded-xl"><Trash2 size={18}/></button></>
              ) : (
                (user.role === 'admin') && <button onClick={async () => {if(window.confirm('حذف؟')) {await api.delete(`/api/orders/${o.id}`); loadOrders();}}} className="text-red-500 text-sm font-bold underline">حذف السجل</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};