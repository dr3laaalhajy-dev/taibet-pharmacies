import React from 'react';
import { X, Check } from 'lucide-react';

export const SuccessModal = ({ isOpen, onClose, title, message }) => {
  if (!isOpen) return null; // إذا كانت الحالة "مغلقة"، لا تعرض شيئاً

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-6 relative shadow-2xl animate-in zoom-in duration-200">
        
        {/* زر الإغلاق X وشعار العيادة */}
        <div className="flex justify-between items-start mb-6">
          <button onClick={onClose} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors">
            <X size={24} />
          </button>
          <div className="text-right leading-tight select-none">
            <span className="block font-extrabold text-slate-800 text-sm">Taibet</span>
            <span className="block font-extrabold text-slate-800 text-sm">Health</span>
            <span className="block text-slate-400 text-xs">Services</span>
          </div>
        </div>

        {/* أيقونة الصح الخضراء */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-b from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-200 border-4 border-white">
            <Check size={40} className="text-white" strokeWidth={3} />
          </div>
        </div>

        {/* النصوص */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">{title}</h2>
          {message && <p className="text-slate-500 font-medium">{message}</p>}
        </div>

        {/* زر حسناً */}
        <div className="flex justify-center">
          <button onClick={onClose} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-10 rounded-full shadow-md transition-all">
            حسناً
          </button>
        </div>

      </div>
    </div>
  );
};