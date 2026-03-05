import React, { useState, useEffect } from 'react';
import { Smile } from 'lucide-react';
import { UserType, Facility } from '../types';
import { api } from '../api';

export const ServicesManager = ({ user, facilities, lang }: { user: UserType, facilities: Facility[], lang: string }) => {
  const [selectedFacility, setSelectedFacility] = useState<number | null>(facilities[0]?.id || null); const [servicesText, setServicesText] = useState(''); const [saving, setSaving] = useState(false); const [msg, setMsg] = useState('');
  useEffect(() => { if (selectedFacility) { const f = facilities.find(fac => fac.id === selectedFacility); setServicesText(f?.services || ''); setMsg(''); } }, [selectedFacility, facilities]);
  const handleSaveServices = async () => { if (!selectedFacility) return; setSaving(true); setMsg(''); const f = facilities.find(fac => fac.id === selectedFacility); if (!f) return; try { await api.put(`/api/pharmacies/${f.id}`, { ...f, services: servicesText }); setMsg(lang === 'ar' ? 'تم حفظ الخدمات بنجاح!' : 'Services saved successfully!'); } catch(err) { setMsg(lang === 'ar' ? 'حدث خطأ أثناء الحفظ.' : 'Error saving services.'); } finally { setSaving(false); } };
  if (facilities.length === 0) return <div className="text-center py-20 text-slate-500">{lang === 'ar' ? 'يرجى إضافة عيادة أولاً.' : 'Please add a clinic first.'}</div>;

  return (
    <div className="max-w-2xl bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-slate-900"><Smile className="text-emerald-500"/> {lang === 'ar' ? 'الخدمات التي أقدمها' : 'Services I Provide'}</h2>
      <p className="text-slate-500 mb-6 text-sm">{lang === 'ar' ? 'اختر العيادة واكتب قائمة الخدمات الطبية التي تقدمها ليتمكن المرضى من رؤيتها.' : 'Select a clinic and write down the services you offer.'}</p>
      {msg && <div className={`p-4 rounded-xl text-sm font-bold mb-4 ${msg.includes('نجاح') || msg.includes('successfully') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>}
      <div className="space-y-4">
        <div><label className="block text-sm font-bold text-slate-700 mb-2">{lang === 'ar' ? 'اختر العيادة:' : 'Select Clinic:'}</label><select className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" value={selectedFacility || ''} onChange={e => setSelectedFacility(parseInt(e.target.value))}>{facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
        <div><label className="block text-sm font-bold text-slate-700 mb-2">{lang === 'ar' ? 'قائمة الخدمات (مثال: تبييض أسنان، زراعة، حشوات):' : 'List of Services:'}</label><textarea rows={6} placeholder={lang === 'ar' ? 'اكتب خدماتك هنا...' : 'Write your services here...'} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" value={servicesText} onChange={e => setServicesText(e.target.value)}></textarea></div>
        <button onClick={handleSaveServices} disabled={saving} className="w-full py-4 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors">{saving ? '...' : (lang === 'ar' ? 'حفظ الخدمات' : 'Save Services')}</button>
      </div>
    </div>
  );
};