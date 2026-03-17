import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { Package, UploadCloud, Edit2, Trash2 } from 'lucide-react';
import { UserType, Facility, Product } from '../types';
import { api, uploadImageToImgBB } from '../api-client';
import { formatCurrency } from '../utils/currency';
import { getErrorMessage } from '../helpers';

export const ProductsManager = ({ user, facilities, lang, t }: { user: UserType, facilities: Facility[], lang: string, t: any }) => {
  const [products, setProducts] = useState<Product[]>([]); const [form, setForm] = useState<Partial<Product>>({ name: '', price: '', quantity: 1, max_per_user: undefined, pharmacy_id: facilities[0]?.id || 0 }); const [editingId, setEditingId] = useState<number | null>(null); const [uploadingImage, setUploadingImage] = useState(false); const [loading, setLoading] = useState(true); const [adminFilter, setAdminFilter] = useState<number | 'all'>('all');
  const loadProducts = () => { api.get('/api/products').then(setProducts).finally(() => setLoading(false)); };
  useEffect(() => { loadProducts(); if(facilities.length > 0 && !form.pharmacy_id) setForm(prev => ({...prev, pharmacy_id: facilities[0].id})); }, [facilities]);
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; setUploadingImage(true); try { const url = await uploadImageToImgBB(file); setForm({ ...form, image_url: url }); } catch (err: any) { toast.error(getErrorMessage(err, lang, t)); } finally { setUploadingImage(false); } };
  const handleSave = async (e: React.FormEvent) => { e.preventDefault(); if (!form.pharmacy_id) return toast.error(t.selectPharmacyFirst); try { if (editingId) await api.put(`/api/products/${editingId}`, form); else await api.post('/api/products', form); setForm({ name: '', price: '', quantity: 1, max_per_user: undefined, pharmacy_id: form.pharmacy_id, image_url: '' }); setEditingId(null); loadProducts(); toast.success(t.saveSuccess); } catch (err: any) { toast.error(getErrorMessage(err, lang, t) || t.saveFailed); } };
  
  if (loading) return <div>{t.loading}</div>;
  if (facilities.length === 0 && user.role !== 'admin') return <div className="text-center py-20 text-slate-500">{t.noActivePharmacy}</div>;
  const displayProducts = adminFilter === 'all' ? products : products.filter(p => p.pharmacy_id === adminFilter);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-8">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 dark:text-white"><Package className="text-emerald-500"/> {editingId ? t.editProduct : t.addProduct}</h3>
          <form onSubmit={handleSave} className="space-y-4 text-slate-800 dark:text-slate-200">
            {user.role === 'admin' && <div><label className="block text-xs font-bold text-slate-500 mb-1">{t.pharmacyTitle}</label><select required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none dark:bg-slate-800" value={form.pharmacy_id} onChange={e=>setForm({...form, pharmacy_id: parseInt(e.target.value)})}>{facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>}
            <div><label className="block text-xs font-bold text-slate-500 mb-1">{t.productName}</label><input required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none dark:bg-slate-800" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-slate-500 mb-1">{t.price}</label><input required type="number" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none dark:bg-slate-800" value={form.price} onChange={e=>setForm({...form, price: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">{t.totalQuantity}</label><input required type="number" min="0" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none dark:bg-slate-800" value={form.quantity} onChange={e=>setForm({...form, quantity: parseInt(e.target.value)})} /></div>
            </div>
            <div><label className="block text-xs font-bold text-slate-500 mb-1">{t.maxPerUser}</label><input type="number" min="1" placeholder={t.emptyNoLimit} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-xs dark:bg-slate-800" value={form.max_per_user || ''} onChange={e=>setForm({...form, max_per_user: e.target.value ? parseInt(e.target.value) : undefined})} /></div>
            <div><label className="block text-xs font-bold text-slate-500 mb-1">{t.productImage}</label><div className="flex items-center gap-3"><label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer ${uploadingImage ? 'bg-slate-50 border-slate-300 dark:bg-slate-800' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20'}`}>{uploadingImage ? <span className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full"></span> : <UploadCloud size={20}/>}<span className="text-sm font-bold">{uploadingImage ? t.uploading : t.uploadImage}</span><input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage}/></label>{form.image_url && <img src={form.image_url} className="w-12 h-12 rounded-xl object-cover border dark:border-slate-700"/>}</div></div>
            <div className="flex gap-2 pt-4">
              {editingId && <button type="button" onClick={() => {setEditingId(null); setForm({ name: '', price: '', quantity: 1, max_per_user: undefined, pharmacy_id: facilities[0]?.id || 0, image_url: '' });}} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 dark:text-white">{t.cancel}</button>}
              <button type="submit" disabled={uploadingImage} className="flex-1 py-3 rounded-xl font-bold bg-slate-900 text-white disabled:opacity-50 dark:bg-indigo-600">{t.save}</button>
            </div>
          </form>
        </div>
      </div>
      <div className="lg:col-span-2">
        {user.role === 'admin' && (
          <div className="mb-6 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <label className="font-bold text-slate-700 dark:text-slate-300">{t.filterPharmacies}</label>
            <select className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 outline-none dark:bg-slate-800 dark:text-white" value={adminFilter} onChange={e => setAdminFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}><option value="all">{t.allProducts}</option>{facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayProducts.map(p => (
            <div key={p.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
              {p.image_url ? <img src={p.image_url} className="w-16 h-16 rounded-xl object-cover border dark:border-slate-700"/> : <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400"><Package size={24}/></div>}
              <div className="flex-1 min-w-0">
                {user.role === 'admin' && <span className="text-[10px] text-emerald-600 block">{p.pharmacy_name}</span>}
                <h4 className="font-bold text-sm truncate dark:text-white">{p.name}</h4>
                <div className="flex justify-between items-center mt-2 text-xs">
                  <span className="font-bold dark:text-indigo-400" dir="ltr">{formatCurrency(parseFloat(p.price), 'new', lang)}</span>
                  <span className={`px-2 py-1 rounded-md font-bold ${p.quantity > 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30'}`}>{p.quantity > 0 ? `${t.quantityLabel}: ${p.quantity}` : t.outOfStock}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1 border-r border-slate-100 dark:border-slate-800 pr-2">
                <button onClick={() => { setEditingId(p.id); setForm(p); }} className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"><Edit2 size={14}/></button>
                <button onClick={() => { if(window.confirm(t.confirmDelete)) api.delete(`/api/products/${p.id}`).then(loadProducts); }} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400"><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
          {displayProducts.length === 0 && <div className="col-span-full text-center py-12 text-slate-500 dark:text-slate-400">{t.noProductsFound}</div>}
        </div>
      </div>
    </div>
  );
};
// force update files