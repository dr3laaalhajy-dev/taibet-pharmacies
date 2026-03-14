import React, { useState, useEffect } from 'react';
import { api } from '../api-client';
import { toast } from 'react-hot-toast';
import { Users, Plus, Trash2, User, UserCheck, Calendar, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FamilyMember {
  id: number;
  name: string;
  relation: string;
  birth_date: string;
  gender: string;
}

export const FamilyMembersManager = ({ lang }: { lang: 'ar' | 'en' }) => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    relation: 'أخرى',
    birth_date: '',
    gender: 'ذكر'
  });

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/family');
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل جلب أفراد العائلة' : 'Failed to fetch family members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.post('/api/family', form);
      toast.success(lang === 'ar' ? 'تمت إضافة فرد العائلة بنجاح' : 'Family member added successfully');
      setShowAddModal(false);
      setForm({ name: '', relation: 'أخرى', birth_date: '', gender: 'ذكر' });
      fetchMembers();
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل إرسال المسافات' : 'Error saving member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا الفرد؟' : 'Are you sure you want to delete this member?')) return;
    try {
      await api.delete(`/api/family/${id}`);
      toast.success(lang === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
      fetchMembers();
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل الحذف' : 'Deletion failed');
    }
  };

  if (loading && members.length === 0) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="text-indigo-500" /> {lang === 'ar' ? 'أفراد العائلة' : 'Family Members'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">{lang === 'ar' ? 'إدارة أفراد عائلتك لتمكين طلب الأدوية لهم بسهولة.' : 'Manage family members to easily order medications for them.'}</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg">
          <Plus size={20} /> {lang === 'ar' ? 'إضافة فرد' : 'Add Member'}
        </button>
      </div>

      {members.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center border border-dashed border-slate-300 dark:border-slate-700 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-700">
            <Users size={32} className="text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'لا يوجد أفراد عائلة مضافين' : 'No family members added'}</h3>
          <p className="text-slate-500 max-w-xs mx-auto text-sm">{lang === 'ar' ? 'قم بإضافة أفراد عائلتك الآن لتتمكن من اختيارهم عند رفع الوصفات الطبية.' : 'Add members now to select them when uploading prescriptions.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {members.map(member => (
              <motion.div key={member.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 relative group">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${member.gender === 'ذكر' || member.gender === 'Male' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : 'bg-pink-50 text-pink-600 dark:bg-pink-900/30'}`}>
                  <User size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 dark:text-white truncate">{member.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md font-medium">{member.relation}</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1"><Calendar size={12} /> {member.birth_date ? new Date(member.birth_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : (lang === 'ar' ? 'غير محدد' : 'N/A')}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(member.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Member Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-md relative">
              <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={20} /></button>
              <div className="text-center mb-6">
                 <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100"><Users size={32} /></div>
                 <h3 className="text-xl font-bold dark:text-white">{lang === 'ar' ? 'إضافة فرد عائلة جديد' : 'Add New Family Member'}</h3>
              </div>
              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}</label>
                  <input required className="w-full px-4 py-3 border dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder={lang === 'ar' ? "مثلاً: أحمد علي" : "e.g., John Doe"} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'الجنس' : 'Gender'}</label>
                    <select className="w-full px-4 py-3 border dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white" value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                      <option value="ذكر">{lang === 'ar' ? 'ذكر' : 'Male'}</option>
                      <option value="أنثى">{lang === 'ar' ? 'أنثى' : 'Female'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'صلة القرابة' : 'Relation'}</label>
                    <select className="w-full px-4 py-3 border dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white" value={form.relation} onChange={e => setForm({...form, relation: e.target.value})}>
                      <option value="ابن">{lang === 'ar' ? 'ابن / ابنة' : 'Child'}</option>
                      <option value="زوج">{lang === 'ar' ? 'زوج / زوجة' : 'Spouse'}</option>
                      <option value="اب">{lang === 'ar' ? 'أب / أم' : 'Parent'}</option>
                      <option value="اخ">{lang === 'ar' ? 'أخ / أخت' : 'Sibling'}</option>
                      <option value="أخرى">{lang === 'ar' ? 'أخرى' : 'Other'}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{lang === 'ar' ? 'تاريخ الميلاد' : 'Birth Date'}</label>
                  <input type="date" className="w-full px-4 py-3 border dark:border-slate-700 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white" value={form.birth_date} onChange={e => setForm({...form, birth_date: e.target.value})} />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 mt-4">
                  {isSubmitting ? <span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent inline-block"></span> : (lang === 'ar' ? 'حفظ البيانات' : 'Save Member')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
