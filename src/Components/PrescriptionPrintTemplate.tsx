import React, { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface Medicine {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface PrescriptionPrintTemplateProps {
  doctorName: string;
  doctorSpecialty: string;
  facilityName: string;
  facilityAddress: string;
  facilityPhone: string;
  patientName: string;
  patientAge: string;
  date: string;
  diagnosis: string;
  medicines: Medicine[];
  notes: string;
  prescriptionId: string | number;
  lang: string;
}

export const PrescriptionPrintTemplate = forwardRef<HTMLDivElement, PrescriptionPrintTemplateProps>((props, ref) => {
  const { doctorName, doctorSpecialty, facilityName, facilityAddress, facilityPhone, patientName, patientAge, date, diagnosis, medicines, notes, prescriptionId, lang } = props;

  // 🟢 The QR Code payload will be a tiny stringified JSON
  const qrPayload = JSON.stringify({
    id: prescriptionId,
    pid: patientName,
    meds: medicines.map(m => m.name)
  });

  return (
    <div ref={ref} className="bg-white text-slate-900 mx-auto w-full p-8" style={{ width: '210mm', minHeight: '297mm', direction: lang === 'ar' ? 'rtl' : 'ltr', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* 🟢 Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-blue-800">{doctorName}</h1>
          <p className="text-lg font-bold text-slate-600 mt-1">{doctorSpecialty}</p>
        </div>
        <div className="text-end">
          <h2 className="text-xl font-bold text-slate-800">{facilityName}</h2>
          <p className="text-sm text-slate-600 mt-1 max-w-[200px]">{facilityAddress}</p>
          <p className="text-sm font-bold text-slate-600 mt-1" dir="ltr">{facilityPhone}</p>
        </div>
      </div>

      {/* 🟢 Patient Info */}
      <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl mb-8 border border-slate-200">
        <div>
          <p className="text-xs text-slate-500 uppercase font-bold">{lang === 'ar' ? 'اسم المريض' : 'Patient Name'}</p>
          <p className="font-bold text-lg">{patientName}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase font-bold">{lang === 'ar' ? 'العمر' : 'Age'}</p>
          <p className="font-bold text-lg">{patientAge}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase font-bold">{lang === 'ar' ? 'التاريخ' : 'Date'}</p>
          <p className="font-bold text-lg block" dir="ltr">{date}</p>
        </div>
      </div>

      {/* 🟢 Body (Rx) */}
      <div className="mb-10 min-h-[400px]">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-4xl font-serif font-black italic text-blue-800">Rx</span>
          </div>
          
          <div className="space-y-6 mt-6 pl-4 rtl:pr-4 rtl:pl-0">
            {medicines.map((med, index) => (
              <div key={index} className="border-b border-dashed border-slate-300 pb-4">
                <div className="flex gap-4">
                  <h3 className="text-xl font-bold uppercase tracking-wider text-slate-800" dir="ltr">{med.name}</h3>
                </div>
                <div className="mt-2 text-slate-600 font-medium flex gap-6 text-sm">
                  {med.dosage && <span>{lang === 'ar' ? 'الجرعة:' : 'Dosage:'} {med.dosage}</span>}
                  {med.frequency && <span>{lang === 'ar' ? 'التكرار:' : 'Frequency:'} {med.frequency}</span>}
                  {med.duration && <span>{lang === 'ar' ? 'المدة:' : 'Duration:'} {med.duration}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {diagnosis && (
          <div className="mt-12 bg-blue-50/50 p-4 border-l-4 border-blue-600 rtl:border-r-4 rtl:border-l-0">
            <p className="text-xs text-blue-800 uppercase font-bold mb-1">{lang === 'ar' ? 'التشخيص / ملاحظات سريرية' : 'Diagnosis'}</p>
            <p className="font-medium text-slate-700">{diagnosis}</p>
          </div>
        )}

        {notes && (
          <div className="mt-6 p-4 border border-slate-200 rounded-lg">
            <p className="text-xs text-slate-500 uppercase font-bold mb-1">{lang === 'ar' ? 'تعليمات إضافية' : 'Additional Instructions'}</p>
            <p className="font-medium text-slate-700">{notes}</p>
          </div>
        )}
      </div>

      {/* 🟢 Footer & QR */}
      <div className="mt-auto pt-8 border-t-2 border-slate-800 flex justify-between items-end">
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 p-2 bg-white border border-slate-200 rounded-xl flex items-center justify-center">
            <QRCodeSVG value={qrPayload} size={110} level="L" includeMargin={false} />
          </div>
          <div className="mt-2 bg-slate-100 px-4 py-1 rounded-lg border border-slate-200">
            <span className="text-sm font-black tracking-widest font-mono text-slate-800">{prescriptionId}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-medium max-w-[150px] text-center">
            {lang === 'ar' ? 'امسح الرمز أو استخدم الكود اليدوي' : 'Scan QR or use manual code'}
          </p>
        </div>

        <div className="text-center">
          <div className="w-48 border-b border-slate-800 mb-2 h-16"></div>
          <p className="uppercase text-xs font-bold text-slate-500">{lang === 'ar' ? 'توقيع الطبيب' : 'Doctor Signature'}</p>
        </div>
      </div>
      
    </div>
  );
});

PrescriptionPrintTemplate.displayName = 'PrescriptionPrintTemplate';
