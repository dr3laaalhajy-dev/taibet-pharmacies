import React from 'react';
import { X, Shield, FileText } from 'lucide-react';
import { motion } from 'motion/react';

export const LegalModal = ({ isOpen, onClose, type, lang }: { isOpen: boolean, onClose: () => void, type: 'privacy' | 'terms', lang: string }) => {
  if (!isOpen) return null;

  const content = {
    privacy: {
      title: lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy',
      text: (
        <div className="space-y-6 text-slate-700 dark:text-slate-300 leading-relaxed" dir="rtl">
          <p className="font-bold text-lg text-blue-600">سياسة الخصوصية لتطبيق وموقع طيبة هيلث (Taiba Health)</p>
          <p className="text-xs text-slate-500">تاريخ الإصدار: مارس 2026</p>
          <p>مرحباً بك في طيبة هيلث. نحن نلتزم التزاماً كاملاً بحماية خصوصيتك وبياناتك الطبية والشخصية.</p>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-blue-500 underline-offset-4">المعلومات التي نجمعها:</h4>
            <ul className="list-disc pr-6 space-y-2">
              <li><span className="font-bold">بيانات الحساب الأساسية:</span> عند التسجيل، نقوم بجمع معلومات مثل الاسم، رقم الهاتف، والبريد الإلكتروني.</li>
              <li><span className="font-bold">البيانات الطبية (للمرضى):</span> تشمل الوصفات الطبية والأدوية. يتم التعامل معها بسرية تامة.</li>
              <li><span className="font-bold">صلاحيات الجهاز:</span> يطلب التطبيق الوصول لكاميرا الهاتف فقط لغرض مسح رموز QR. لا نقوم بحفظ أي صور.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-blue-500 underline-offset-4">كيف نستخدم معلوماتك؟</h4>
            <ul className="list-disc pr-6 space-y-2">
              <li>لتقديم الخدمات الطبية.</li>
              <li>لإنشاء رموز QR وأكواد نصية.</li>
              <li>لتحسين تجربة المستخدم.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-blue-500 underline-offset-4">مشاركة وحماية البيانات:</h4>
            <ul className="list-disc pr-6 space-y-2">
              <li><span className="font-bold">مشاركة محدودة:</span> لا نبيع بياناتك. تشارك الوصفة فقط بين المريض والطبيب والصيدلي.</li>
              <li><span className="font-bold">الأمان:</span> نستخدم معايير تشفير متقدمة.</li>
              <li><span className="font-bold">حقوق المستخدم:</span> يحق للمستخدم تعديل أو حذف بياناته بالتواصل معنا.</li>
            </ul>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800"></div>
            <p className="font-bold text-slate-900 dark:text-white">التواصل الدعم: <span className="text-blue-600 underline font-mono">alaa_alhajy@taiba-health.com</span></p>
          </div>
        </div>
      )
    },
    terms: {
      title: lang === 'ar' ? 'شروط الاستخدام' : 'Terms of Use',
      text: (
        <div className="space-y-6 text-slate-700 dark:text-slate-300 leading-relaxed" dir="rtl">
          <p className="font-bold text-lg text-indigo-600">اتفاقية شروط الاستخدام لتطبيق وموقع طيبة هيلث (Taiba Health)</p>
          <p className="text-xs text-slate-500">تاريخ الإصدار: مارس 2026</p>

          <p><span className="font-bold">طبيعة الخدمة:</span> منصة لتسهيل إدارة الوصفات الطبية إلكترونياً. ليس مزوداً للرعاية المباشرة.</p>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-indigo-500 underline-offset-4">مسؤوليات المستخدمين:</h4>
            <ul className="list-disc pr-6 space-y-2">
              <li><span className="font-bold">الأطباء:</span> مسؤولون عن صحة الوصفات والتشخيص.</li>
              <li><span className="font-bold">الصيادلة:</span> مسؤولون عن التحقق من هوية المريض وصرف الأدوية المطابقة.</li>
              <li><span className="font-bold">المرضى:</span> مسؤولون عن سرية كود الوصفة.</li>
            </ul>
          </div>

          <p><span className="font-bold">إخلاء المسؤولية الطبية:</span> المنصة لا تتحمل مسؤولية الأخطاء الطبية أو مضاعفات الأدوية.</p>

          <p><span className="font-bold">الاستخدام غير المشروع:</span> يُمنع إصدار وصفات وهمية، أو صرف أدوية خاضعة للرقابة دون التزام بالقانون، أو اختراق التطبيق.</p>

          <p><span className="font-bold">حقوق الملكية الفكرية:</span> جميع الحقوق محفوظة لإدارة التطبيق.</p>

          <p><span className="font-bold">إنهاء الاستخدام:</span> نحتفظ بالحق في حظر أي مستخدم ينتهك الشروط.</p>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="font-bold text-slate-900 dark:text-white">التواصل الدعم: <span className="text-blue-600 underline font-mono">alaa_alhajy@taiba-health.com</span></p>
          </div>
        </div>
      )
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[200]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${type === 'privacy' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>
              {type === 'privacy' ? <Shield size={24} /> : <FileText size={24} />}
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">{content[type].title}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-all text-slate-400">
            <X size={24} />
          </button>
        </div>
        <div className="p-8 overflow-y-auto custom-scrollbar">
          {content[type].text}
        </div>
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-center">
          <button onClick={onClose} className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-8 py-3 rounded-2xl font-bold hover:opacity-90 transition-all">
            {lang === 'ar' ? 'فهمت ذلك' : 'I Understand'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
