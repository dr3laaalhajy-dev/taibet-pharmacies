import React, { useState, useEffect } from 'react';
import { Package, UploadCloud, Edit2, Trash2, Plus } from 'lucide-react';
import { UserType, Facility, Product } from '../types';
import { api, uploadImageToImgBB } from '../api-client'; // 👈 تم التصحيح هنا

export const ProductsManager = ({ user, facilities, lang }: { user: UserType, facilities: Facility[], lang: string }) => {
  const [products, setProducts] = useState<Product[]>([]); 
  const [form, setForm] = useState<Partial<Product>>({ name: '', price: '', quantity: 1, max_per_user: undefined, pharmacy_id: facilities[0]?.id || 0 }); 
  const [editingId, setEditingId] = useState<number | null>(null); 
  const [uploadingImage, setUploadingImage] = useState(false); 
  const [loading, setLoading] = useState(true); 
  const [adminFilter, setAdminFilter] = useState<number | 'all'>('all');

  const loadProducts = () => { api.get('/api/products').then(setProducts).finally(() => setLoading(false)); };
  useEffect(() => { loadProducts(); if(facilities.length > 0 && !form.pharmacy_id) setForm(prev => ({...prev, pharmacy_id: facilities[0].id})); }, [facilities]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { 
    const file = e.target.files?.[0]; if (!file) return; 
    setUploadingImage(true); 
    try { const url = await uploadImageToImgBB(file); setForm({ ...form, image_url: url }); } 
    catch (err: any) { alert(err.message); } 
    finally { setUploadingImage(false); } 
  };

  const handleSave = async (e: React.FormEvent) => { 
    e.preventDefault(); if (!form.pharmacy_id) return alert('اختر صيدلية'); 
    try { 
      if (editingId) await api.put(`/api/products/${editingId}`, form); 
      else await api.post('/api/products', form); 
      setForm({ name: '', price: '', quantity: 1, max_per_user: undefined, pharmacy_id: form.pharmacy_id, image_url: '' }); 
      setEditingId(null); loadProducts(); 
    } catch (err: any) { alert(err.error || 'فشل الحفظ'); } 
  };
  
  if (loading) return <div className="p-10 text-center">جاري التحميل...</div>;

  const displayProducts = adminFilter === 'all' ? products : products.filter(p => p.pharmacy_id === adminFilter);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm sticky top-8">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Package className="text-emerald-500"/> {editingId ? 'تعديل المنتج' : 'إضافة منتج'}</h3>
          <form onSubmit={handleSave} className="space-y-4">
            {user.role === 'admin' && (
              <div><label className="block text-xs font-bold text-slate-500 mb-1">الصيدلية</label>
              <select required className="w-full px-4 py-3 rounded-xl border border-slate-200" value={form.pharmacy_id} onChange={e=>setForm({...form, pharmacy_id: parseInt(e.target.value)})}>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select></div>
            )}
            <div><label className="block text-xs font-bold text-slate-500 mb-1">اسم المنتج</label><input required className="w-full px-4 py-3 rounded-xl border" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-slate-500 mb-1">السعر</label><input required type="number" className="w-full px-4 py-3 rounded-xl border" value={form.price} onChange={e=>setForm({...form, price: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">الكمية</label><input required type="number" className="w-full px-4 py-3 rounded-xl border" value={form.quantity} onChange={e=>setForm({...form, quantity: parseInt(e.target.value)})} /></div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">صورة المنتج</label>
              <div className="flex items-center gap-3">
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer bg-emerald-50 text-emerald-700">
                  {uploadingImage ? <span className="animate-spin h-5 w-5 border-2 border-emerald-500 rounded-full border-t-transparent"></span> : <UploadCloud size={20}/>}
                  <span className="text-sm font-bold">{uploadingImage ? 'جاري الرفع...' : 'رفع صورة'}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage}/>
                </label>
                {form.image_url && <img src={form.image_url} className="w-12 h-12 rounded-xl object-cover border"/>}
              </div>
            </div>
            <button type="submit" disabled={uploadingImage} className="w-full py-4 rounded-xl font-bold bg-slate-900 text-white mt-4">{editingId ? 'تحديث' : 'حفظ المنتج'}</button>
          </form>
        </div>
      </div>
      <div className="lg:col-span-2">
        {user.role === 'admin' && (
          <select className="w-full mb-6 px-4 py-3 rounded-xl border" value={adminFilter} onChange={e => setAdminFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}>
            <option value="all">كل الصيدليات</option>
            {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayProducts.map(p => (
            <div key={p.id} className="bg-white p-4 rounded-2xl border flex items-center gap-4">
              {p.image_url ? <img src={p.image_url} className="w-16 h-16 rounded-xl object-cover"/> : <div className="w-16 h-16 bg-slate-50 flex items-center justify-center"><Package size={24}/></div>}
              <div className="flex-1">
                <h4 className="font-bold text-sm">{p.name}</h4>
                <p className="text-xs text-emerald-600 font-bold">{p.price} ل.س</p>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => { setEditingId(p.id); setForm(p); }} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 size={16}/></button>
                <button onClick={() => { if(window.confirm('حذف؟')) api.delete(`/api/products/${p.id}`).then(loadProducts); }} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};