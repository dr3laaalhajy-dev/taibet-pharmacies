import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Pill, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MedicineAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  lang: 'ar' | 'en';
}

export const MedicineAutocomplete: React.FC<MedicineAutocompleteProps> = ({
  value,
  onChange,
  placeholder,
  lang
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400);
    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchMedicines = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://api.fda.gov/drug/label.json?search=openfda.brand_name:*${debouncedQuery}*&limit=10`
        );
        const data = await response.json();
        
        if (data.results) {
          const names = data.results.flatMap((result: any) => {
            const brands = result.openfda?.brand_name || [];
            const generics = result.openfda?.generic_name || [];
            return [...brands, ...generics];
          });
          
          // Unique and filtered names
          const uniqueNames = Array.from(new Set(names.map((n: string) => n.charAt(0) + n.slice(1).toLowerCase()))) as string[];
          setSuggestions(uniqueNames.slice(0, 8));
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error('FDA API Error:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMedicines();
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (name: string) => {
    setQuery(name);
    onChange(name);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setIsOpen(true);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative group">
        <input
          required
          type="text"
          className="w-full p-2.5 pr-10 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-800 dark:text-white dark:bg-slate-800 transition-all placeholder:font-normal placeholder:text-slate-400"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder || (lang === 'ar' ? 'ابحث عن الدواء...' : 'Search medicine...')}
          dir="ltr"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading ? (
            <Loader2 size={16} className="text-blue-500 animate-spin" />
          ) : (
            <Search size={16} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (suggestions.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-[100] w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden mt-1 max-h-60 overflow-y-auto"
          >
            <div className="p-1">
              <p className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 rounded-lg mb-1">
                {lang === 'ar' ? 'مقترحات OpenFDA' : 'OpenFDA Suggestions'}
              </p>
              {suggestions.map((name, idx) => (
                <motion.button
                  key={idx}
                  type="button"
                  whileHover={{ backgroundColor: "rgba(59, 130, 246, 0.05)" }}
                  onClick={() => handleSelect(name)}
                  className="w-full px-3 py-2.5 text-left flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group/item"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover/item:bg-blue-600 group-hover/item:text-white transition-colors">
                      <Pill size={14} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{name}</span>
                  </div>
                  {query.toLowerCase() === name.toLowerCase() && (
                    <Check size={14} className="text-emerald-500" />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
