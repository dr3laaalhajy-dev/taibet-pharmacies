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
          <p className="font-bold text-lg text-blue-600">📄 سياسة الخصوصية لتطبيق وموقع "طيبة هيلث" (Taiba Health)</p>
          <p className="text-xs text-slate-500">تاريخ الإصدار: مارس 2026</p>
          <p>مرحباً بك في "طيبة هيلث". نحن نلتزم التزاماً كاملاً بحماية خصوصيتك وبياناتك الطبية والشخصية. توضح هذه السياسة كيفية جمعنا للمعلومات واستخدامها وحمايتها عند استخدامك لتطبيقنا وموقعنا الإلكتروني.</p>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-blue-500 underline-offset-4">1. المعلومات التي نجمعها:</h4>
            <ul className="list-disc pr-6 space-y-2">
              <li><span className="font-bold">بيانات الحساب الأساسية:</span> عند التسجيل (سواء كطبيب، مريض، أو صيدلي)، نقوم بجمع معلومات مثل الاسم، رقم الهاتف، والبريد الإلكتروني.</li>
              <li><span className="font-bold">البيانات الطبية (للمرضى):</span> تشمل الوصفات الطبية (الروشتات) التي يصدرها الطبيب، والأدوية التي يتم صرفها من قِبل الصيدلي. يتم التعامل مع هذه البيانات بسرية طبية تامة.</li>
              <li><span className="font-bold">صلاحيات الجهاز (الكاميرا):</span> يطلب التطبيق الوصول إلى كاميرا الهاتف (للمرضى والصيادلة) فقط لغرض مسح رموز الاستجابة السريعة (QR Codes) لتسهيل قراءة وصرف الوصفات الطبية. نحن لا نقوم بالتقاط، أو تسجيل، أو حفظ أي صور أو مقاطع فيديو على خوادمنا.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-blue-500 underline-offset-4">2. كيف نستخدم معلوماتك؟</h4>
            <ul className="list-disc pr-6 space-y-2">
              <li>لتقديم الخدمات الطبية وتسهيل التواصل بين الطبيب، المريض، والصيدلية.</li>
              <li>لإنشاء رموز (QR Codes) وأكواد نصية قصيرة لحماية الوصفات الطبية وضمان دقة صرف الأدوية.</li>
              <li>لتحسين تجربة المستخدم داخل التطبيق وإصلاح أي أخطاء تقنية.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-blue-500 underline-offset-4">3. مشاركة وحماية البيانات:</h4>
            <ul className="list-disc pr-6 space-y-2">
              <li><span className="font-bold">مشاركة محدودة:</span> لا نقوم ببيع أو تأجير بياناتك لأي طرف ثالث. تتم مشاركة بيانات الوصفة الطبية فقط بين المريض، والطبيب المعالج، والصيدلي الذي يقوم بمسح كود الوصفة لصرفها.</li>
              <li><span className="font-bold">الأمان:</span> نستخدم معايير أمان وتشفير متقدمة في قواعد بياناتنا لحماية معلوماتك من الوصول غير المصرح به.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-blue-500 underline-offset-4">4. حقوق المستخدم:</h4>
            <p> يحق للمستخدم في أي وقت تعديل بياناته الشخصية من خلال إعدادات التطبيق، أو طلب حذف حسابه وبياناته بالكامل عبر التواصل معنا.</p>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              التواصل الدعم: لأي استفسارات قانونية أو تقنية تتعلق بشروط الاستخدام، يُرجى مراسلتنا على:
            </p>
            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Dr. Alaa Alhajy Founder & CEO | Taiba Health
            </p>
            <span className="text-blue-600 underline font-mono">alaa_alhajy@taiba-health.com</span> ✉️
          </div>


        </div>
      )
    },
    terms: {
      title: lang === 'ar' ? 'شروط الاستخدام' : 'Terms of Use',
      text: (
        <div className="space-y-6 text-slate-700 dark:text-slate-300 leading-relaxed" dir="rtl">
          <p className="font-bold text-lg text-indigo-600">📄 اتفاقية شروط الاستخدام لتطبيق وموقع "طيبة هيلث" (Taiba Health)</p>
          <p className="text-xs text-slate-500">تاريخ الإصدار: مارس 2026</p>

          <p>مرحباً بك في "طيبة هيلث". باستخدامك لتطبيقنا وموقعنا الإلكتروني، فإنك توافق صراحةً على الالتزام بالشروط والأحكام التالية. إذا كنت لا توافق على أي جزء من هذه الشروط، يُرجى التوقف عن استخدام المنصة فوراً.</p>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-indigo-500 underline-offset-4">1. طبيعة الخدمة:</h4>
            <p>"طيبة هيلث" هي منصة تقنية تهدف إلى تسهيل إدارة الوصفات الطبية (الروشتات) إلكترونياً بين الأطباء، المرضى، والصيادلة عبر رموز الاستجابة السريعة (QR Codes) والأكواد النصية القصيرة. التطبيق ليس مزوداً للرعاية الصحية المباشرة، ولا يحل محل الاستشارة الطبية الطارئة.</p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-indigo-500 underline-offset-4">2. مسؤوليات المستخدمين:</h4>
            <ul className="list-disc pr-6 space-y-2">
              <li><span className="font-bold">الأطباء:</span> أنت مسؤول مسؤولية كاملة عن صحة ودقة الوصفات الطبية التي تصدرها عبر التطبيق، وعن تشخيص حالة المريض وتحديد الجرعات المناسبة.</li>
              <li><span className="font-bold">الصيادلة:</span> أنت مسؤول عن التحقق من هوية المريض والوصفة الطبية (عبر مسح الـ QR أو إدخال الكود القصير) وصرف الأدوية المطابقة تماماً لما دونه الطبيب، والالتزام بقوانين صرف الأدوية في بلدك.</li>
              <li><span className="font-bold">المرضى:</span> أنت مسؤول عن الحفاظ على سرية الكود الخاص بوصفتك الطبية (QR أو الكود النصي) وعدم مشاركته إلا مع الصيدلي المعتمد لصرف الدواء.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-indigo-500 underline-offset-4">3. إخلاء المسؤولية الطبية (Medical Disclaimer):</h4>
            <p>تطبيق "طيبة هيلث" ومطوروه لا يتحملون أي مسؤولية قانونية أو طبية ناتجة عن:</p>
            <ul className="list-disc pr-6 space-y-2">
              <li>أخطاء في التشخيص الطبي أو كتابة الأدوية من قِبل الطبيب.</li>
              <li>أخطاء في صرف الأدوية من قِبل الصيدلي.</li>
              <li>أي مضاعفات صحية يتعرض لها المريض نتيجة استخدام الأدوية الموصوفة. يقع العبء الطبي والقانوني بالكامل على عاتق الممارسين الصحيين (الأطباء والصيادلة) المستخدمين للمنصة.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-indigo-500 underline-offset-4">4. الاستخدام غير المشروع:</h4>
            <p>يُمنع منعاً باتاً استخدام المنصة لـ:</p>
            <ul className="list-disc pr-6 space-y-2">
              <li>إصدار وصفات طبية وهمية أو مزورة.</li>
              <li>صرف أدوية خاضعة للرقابة الصارمة (مثل المخدرات الطبية) دون الالتزام بالقوانين المحلية المنظمة لذلك.</li>
              <li>محاولة اختراق التطبيق أو التلاعب بقاعدة البيانات والأكواد الخاصة بالمرضى.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-indigo-500 underline-offset-4">5. حقوق الملكية الفكرية:</h4>
            <p>جميع حقوق الملكية الفكرية الخاصة بتصميم التطبيق، الأكواد البرمجية، العلامة التجارية "طيبة هيلث"، والشعارات هي ملكية حصرية لإدارة التطبيق ولا يجوز نسخها أو إعادة استخدامها دون إذن كتابي.</p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-indigo-500 underline-offset-4">6. إنهاء الاستخدام:</h4>
            <p>نحتفظ بالحق في إيقاف أو حظر حساب أي مستخدم (طبيب، صيدلي، أو مريض) يثبت انتهاكه لهذه الشروط أو استخدامه للتطبيق في أغراض غير قانونية، وذلك دون سابق إنذار.</p>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              التواصل الدعم: لأي استفسارات قانونية أو تقنية تتعلق بشروط الاستخدام، يُرجى مراسلتنا على:
            </p>
            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Dr. Alaa Alhajy Founder & CEO | Taiba Health
            </p>
            <span className="text-blue-600 underline font-mono">alaa_alhajy@taiba-health.com</span> ✉️

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
