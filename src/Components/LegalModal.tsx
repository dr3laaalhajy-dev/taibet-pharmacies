import React from 'react';
import { X, Shield, FileText } from 'lucide-react';
import { motion } from 'motion/react';

export const LegalModal = ({ isOpen, onClose, type, lang, t }: { isOpen: boolean, onClose: () => void, type: 'privacy' | 'terms', lang: string, t: any }) => {
  if (!isOpen) return null;

  const content = {
    privacy: {
      title: t.legal.privacyPolicy.title,
      text: (
        <div className="space-y-6 text-slate-700 dark:text-slate-300 leading-relaxed" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <p className="font-bold text-lg text-blue-600">📄 {t.legal.privacyPolicy.title}</p>
          <p className="text-xs text-slate-500">{t.legal.privacyPolicy.date}</p>
          <p className="font-medium text-slate-800 dark:text-slate-200">{t.legal.privacyPolicy.intro}</p>

          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-blue-500 underline-offset-4">{t.legal.privacyPolicy.section1Title}</h4>
              <ul className={`list-disc ${lang === 'ar' ? 'pr-6' : 'pl-6'} space-y-2`}>
                <li><span className="font-bold">{t.legal.privacyPolicy.sectionPoint1Label || t.legal.privacyPolicy.section1Point1.split(':')[0]}:</span> {t.legal.privacyPolicy.section1Point1.split(':')[1]}</li>
                <li><span className="font-bold">{t.legal.privacyPolicy.sectionPoint2Label || t.legal.privacyPolicy.section1Point2.split(':')[0]}:</span> {t.legal.privacyPolicy.section1Point2.split(':')[1]}</li>
                <li><span className="font-bold">{t.legal.privacyPolicy.sectionPoint3Label || t.legal.privacyPolicy.section1Point3.split(':')[0]}:</span> {t.legal.privacyPolicy.section1Point3.split(':')[1]}</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-blue-500 underline-offset-4">{t.legal.privacyPolicy.section2Title}</h4>
              <ul className={`list-disc ${lang === 'ar' ? 'pr-6' : 'pl-6'} space-y-2`}>
                <li>{t.legal.privacyPolicy.section2Point1}</li>
                <li>{t.legal.privacyPolicy.section2Point2}</li>
                <li>{t.legal.privacyPolicy.section2Point3}</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-blue-500 underline-offset-4">{t.legal.privacyPolicy.section3Title}</h4>
              <ul className={`list-disc ${lang === 'ar' ? 'pr-6' : 'pl-6'} space-y-2`}>
                <li><span className="font-bold">{t.legal.privacyPolicy.section3Point1.split(':')[0]}:</span> {t.legal.privacyPolicy.section3Point1.split(':')[1]}</li>
                <li><span className="font-bold">{t.legal.privacyPolicy.section3Point2.split(':')[0]}:</span> {t.legal.privacyPolicy.section3Point2.split(':')[1]}</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-blue-500 underline-offset-4">{t.legal.privacyPolicy.section4Title}</h4>
              <p>{t.legal.privacyPolicy.section4Body}</p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="font-bold text-slate-900 dark:text-white mb-1">
                {t.legal.privacyPolicy.contactTitle}
              </p>
              <p className="font-bold text-slate-900 dark:text-white">
                {t.legal.privacyPolicy.contactBody}
              </p>
            </div>
          </div>
        </div>
      )
    },
    terms: {
      title: t.legal.termsOfUse.title,
      text: (
        <div className="space-y-6 text-slate-700 dark:text-slate-300 leading-relaxed" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <p className="font-bold text-lg text-indigo-600">⚖️ {t.legal.termsOfUse.title}</p>
          <p className="text-xs text-slate-500">{t.legal.termsOfUse.date}</p>
          <p className="font-medium text-slate-800 dark:text-slate-200">{t.legal.termsOfUse.intro}</p>

          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-indigo-500 underline-offset-4">{t.legal.termsOfUse.section1Title}</h4>
              <p>{t.legal.termsOfUse.section1Body}</p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-indigo-500 underline-offset-4">{t.legal.termsOfUse.section2Title}</h4>
              <ul className={`list-disc ${lang === 'ar' ? 'pr-6' : 'pl-6'} space-y-2`}>
                <li><span className="font-bold">{t.legal.termsOfUse.section2Point1.split(':')[0]}:</span> {t.legal.termsOfUse.section2Point1.split(':')[1]}</li>
                <li><span className="font-bold">{t.legal.termsOfUse.section2Point2.split(':')[0]}:</span> {t.legal.termsOfUse.section2Point2.split(':')[1]}</li>
                <li><span className="font-bold">{t.legal.termsOfUse.section2Point3.split(':')[0]}:</span> {t.legal.termsOfUse.section2Point3.split(':')[1]}</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-indigo-500 underline-offset-4">{t.legal.termsOfUse.section3Title}</h4>
              <p className="mb-2">{t.legal.termsOfUse.section3Intro}</p>
              <ul className={`list-disc ${lang === 'ar' ? 'pr-6' : 'pl-6'} space-y-2`}>
                <li>{t.legal.termsOfUse.section3Point1}</li>
                <li>{t.legal.termsOfUse.section3Point2}</li>
                <li>{t.legal.termsOfUse.section3Point3}</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-indigo-500 underline-offset-4">{t.legal.termsOfUse.section4Title}</h4>
              <p className="mb-2">{t.legal.termsOfUse.section4Intro}</p>
              <ul className={`list-disc ${lang === 'ar' ? 'pr-6' : 'pl-6'} space-y-2`}>
                <li>{t.legal.termsOfUse.section4Point1}</li>
                <li>{t.legal.termsOfUse.section4Point2}</li>
                <li>{t.legal.termsOfUse.section4Point3}</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-indigo-500 underline-offset-4">{t.legal.termsOfUse.section5Title}</h4>
              <p>{t.legal.termsOfUse.section5Body}</p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 underline decoration-indigo-500 underline-offset-4">{t.legal.termsOfUse.section6Title}</h4>
              <p>{t.legal.termsOfUse.section6Body}</p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="font-bold text-slate-900 dark:text-white mb-1">
                {t.legal.termsOfUse.contactTitle}
              </p>
              <p className="font-bold text-slate-900 dark:text-white">
                {t.legal.termsOfUse.contactBody}
              </p>
            </div>
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
            {t.iUnderstand}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
