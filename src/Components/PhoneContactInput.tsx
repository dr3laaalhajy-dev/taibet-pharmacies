import React, { useState, useEffect } from 'react';
import { Phone, MessageCircle, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface PhoneValue {
  phone: string;
  whatsapp: string;
  hasSeparateWhatsapp: boolean;
}

interface PhoneContactInputProps {
  value: PhoneValue;
  onChange: (value: PhoneValue) => void;
  lang: 'ar' | 'en';
  label?: string;
}

const COUNTRIES = [
  { code: '+963', flag: '🇸🇾', name_ar: 'سوريا', name_en: 'Syria' },
  { code: '+966', flag: '🇸🇦', name_ar: 'السعودية', name_en: 'Saudi Arabia' },
  { code: '+971', flag: '🇦🇪', name_ar: 'الإمارات', name_en: 'UAE' },
  { code: '+965', flag: '🇰🇼', name_ar: 'الكويت', name_en: 'Kuwait' },
  { code: '+974', flag: '🇶🇦', name_ar: 'قطر', name_en: 'Qatar' },
  { code: '+968', flag: '🇴🇲', name_ar: 'عمان', name_en: 'Oman' },
  { code: '+973', flag: '🇧🇭', name_ar: 'البحرين', name_en: 'Bahrain' },
  { code: '+962', flag: '🇯🇴', name_ar: 'الأردن', name_en: 'Jordan' },
  { code: '+961', flag: '🇱🇧', name_ar: 'لبنان', name_en: 'Lebanon' },
  { code: '+20', flag: '🇪🇬', name_ar: 'مصر', name_en: 'Egypt' },
  { code: '+218', flag: '🇱🇾', name_ar: 'ليبيا', name_en: 'Libya' },
  { code: '+212', flag: '🇲🇦', name_ar: 'المغرب', name_en: 'Morocco' },
  { code: '+216', flag: '🇹🇳', name_ar: 'تونس', name_en: 'Tunisia' },
  { code: '+213', flag: '🇩🇿', name_ar: 'الجزائر', name_en: 'Algeria' },
  { code: '+249', flag: '🇸🇩', name_ar: 'السودان', name_en: 'Sudan' },
  { code: '+964', flag: '🇮🇶', name_ar: 'العراق', name_en: 'Iraq' },
  { code: '+90', flag: '🇹🇷', name_ar: 'تركيا', name_en: 'Turkey' },
];

const CountrySelector = ({ selected, onSelect, lang }: { selected: string, onSelect: (code: string) => void, lang: 'ar' | 'en' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const current = COUNTRIES.find(c => c.code === selected) || COUNTRIES[0];

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-full px-3 flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors rounded-l-xl rtl:border-r-0 rtl:border-l rtl:rounded-l-none rtl:rounded-r-xl"
        dir="ltr"
      >
        <span className="text-xl">{current.flag}</span>
        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{current.code}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-2 z-50 max-h-64 overflow-y-auto"
            >
              {COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { onSelect(c.code); setIsOpen(false); }}
                  className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{c.flag}</span>
                    <div className="text-left rtl:text-right">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{lang === 'ar' ? c.name_ar : c.name_en}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{c.code}</p>
                    </div>
                  </div>
                  {selected === c.code && <Check size={14} className="text-blue-600" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export const PhoneContactInput: React.FC<PhoneContactInputProps> = ({ value, onChange, lang, label }) => {
  const [phoneCode, setPhoneCode] = useState('+963');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappCode, setWhatsappCode] = useState('+963');
  const [whatsappNumber, setWhatsappNumber] = useState('');

  // Initial parse if value comes with codes
  useEffect(() => {
    const parseNumber = (full: string) => {
      const match = COUNTRIES.find(c => full?.startsWith(c.code));
      if (match) return { code: match.code, num: full.slice(match.code.length) };
      return { code: '+963', num: full || '' };
    };

    const p = parseNumber(value.phone);
    setPhoneCode(p.code);
    setPhoneNumber(p.num);

    const w = parseNumber(value.whatsapp);
    setWhatsappCode(w.code);
    setWhatsappNumber(w.num);
  }, []);

  const updateParent = (pC: string, pN: string, wC: string, wN: string, sep: boolean) => {
    onChange({
      phone: pC + pN,
      whatsapp: sep ? wC + wN : pC + pN,
      hasSeparateWhatsapp: sep
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Phone Input */}
      <div>
        {label && <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{label}</label>}
        <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-visible focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-sm">
          <CountrySelector selected={phoneCode} onSelect={(c) => { setPhoneCode(c); updateParent(c, phoneNumber, whatsappCode, whatsappNumber, value.hasSeparateWhatsapp); }} lang={lang} />
          <div className="flex-1 flex items-center px-3 gap-2">
            <Phone size={18} className="text-slate-400 shrink-0" />
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => { 
                const val = e.target.value.replace(/\D/g, '');
                setPhoneNumber(val); 
                updateParent(phoneCode, val, whatsappCode, whatsappNumber, value.hasSeparateWhatsapp); 
              }}
              className="w-full py-3 bg-transparent outline-none text-slate-800 dark:text-slate-200 font-bold tracking-wider"
              placeholder="09... / 5... / 1... "
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* Toggle */}
      <label className="flex items-center gap-3 cursor-pointer group select-none py-1">
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only"
            checked={value.hasSeparateWhatsapp}
            onChange={(e) => {
               const checked = e.target.checked;
               updateParent(phoneCode, phoneNumber, whatsappCode, whatsappNumber, checked);
            }}
          />
          <div className={`w-10 h-5 rounded-full transition-colors ${value.hasSeparateWhatsapp ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${value.hasSeparateWhatsapp ? 'translate-x-5' : ''}`} />
        </div>
        <span className="text-sm font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
          {lang === 'ar' ? 'لدي رقم واتساب مختلف' : 'I have a different WhatsApp number'}
        </span>
      </label>

      {/* Conditional WhatsApp Input */}
      <AnimatePresence>
        {value.hasSeparateWhatsapp && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-visible"
          >
            <div className="pt-2">
              <label className="block text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                {lang === 'ar' ? 'رقم الواتساب' : 'WhatsApp Number'}
              </label>
              <div className="flex bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/30 rounded-xl overflow-visible focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all shadow-sm">
                <CountrySelector selected={whatsappCode} onSelect={(c) => { setWhatsappCode(c); updateParent(phoneCode, phoneNumber, c, whatsappNumber, true); }} lang={lang} />
                <div className="flex-1 flex items-center px-3 gap-2">
                  <MessageCircle size={18} className="text-emerald-500 shrink-0" />
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => { 
                      const val = e.target.value.replace(/\D/g, '');
                      setWhatsappNumber(val); 
                      updateParent(phoneCode, phoneNumber, whatsappCode, val, true); 
                    }}
                    className="w-full py-3 bg-transparent outline-none text-slate-800 dark:text-slate-200 font-bold tracking-wider"
                    placeholder="09..."
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
