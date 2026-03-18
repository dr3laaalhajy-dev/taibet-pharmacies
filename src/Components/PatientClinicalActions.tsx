import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { 
  User, X, FileText, HeartPulse, ShieldAlert, Stethoscope, 
  Mic, Package, Plus, Trash2, Printer, Image as ImageIcon, 
  UploadCloud, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useReactToPrint } from 'react-to-print';
import { api, uploadImageToImgBB } from '../api-client';
import { PrescriptionPrintTemplate } from './PrescriptionPrintTemplate';
import { MedicineAutocomplete } from './MedicineAutocomplete';

interface PatientClinicalActionsProps {
  patientId: number | string;
  familyMemberId?: number | string;
  appointmentId?: number | string;
  patientName: string;
  familyMemberName?: string;
  lang: 'ar' | 'en';
  user: any;
  facility: any;
  t: any;
  onClose?: () => void;
  isPanel?: boolean; // If true, render as a side panel without backdrops
}

export const PatientClinicalActions: React.FC<PatientClinicalActionsProps> = ({
  patientId,
  familyMemberId,
  appointmentId,
  patientName,
  familyMemberName,
  lang,
  user,
  facility,
  t,
  onClose,
  isPanel = false
}) => {
  const [activeTab, setActiveTab] = useState<'ehr' | 'prescription'>('prescription');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [ehr, setEhr] = useState<any>({});
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [medicines, setMedicines] = useState([{ id: Date.now(), name: '', dosage: '', frequency: '', duration: '' }]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // 🟢 ميزة طباعة الوصفة الطبية
  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onAfterPrint: () => {
      setShowPrintTemplate(false);
      if (onClose && !isPanel) onClose();
    }
  });
  const [showPrintTemplate, setShowPrintTemplate] = useState(false);
  const [prescriptionId, setPrescriptionId] = useState<number | string>(0);

  useEffect(() => {
    if (showPrintTemplate && prescriptionId) {
      setTimeout(() => {
        handlePrint();
      }, 500);
    }
  }, [showPrintTemplate, prescriptionId]);

  // 🟢 حساب العمر الذكي
  const calculateAge = (dob: string, fallbackAge: any) => {
    if (!dob) return fallbackAge ? `${fallbackAge} ${t.yrs || 'Yrs'}` : t.na || 'N/A';
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return fallbackAge ? `${fallbackAge} ${t.yrs || 'Yrs'}` : t.na || 'N/A';
    const today = new Date();
    let ageYears = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      ageYears--;
    }
    if (ageYears >= 1) {
      return `${ageYears} ${t.yrs || 'Yrs'}`;
    } else {
      const diffTime = today.getTime() - birthDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return t.newborn || 'Newborn';
      return `${diffDays} ${t.daysCount || 'Days'}`;
    }
  };

  useEffect(() => {
    const targetId = familyMemberId || patientId;
    if (targetId) {
      setLoading(true);
      setAttachments([]);
      api.get(`/api/medical-records/${targetId}`).then(res => {
        if (res && res.id) {
          setEhr(res);
          try {
            const parsed = typeof res.attachments === 'string' ? JSON.parse(res.attachments) : res.attachments;
            if (Array.isArray(parsed)) setAttachments(parsed);
          } catch (e) {
            console.error("Error parsing attachments:", e);
            setAttachments([]);
          }
        }
      }).catch(() => { }).finally(() => setLoading(false));
    }
  }, [patientId, familyMemberId]);

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAttachment(true);
    try {
      const url = await uploadImageToImgBB(file);
      if (url) {
        const newAttachments = [...attachments, url];
        setAttachments(newAttachments);
        if (appointmentId) {
          await api.patch(`/api/appointments/${appointmentId}/attachments`, { attachments: newAttachments });
        }
        toast.success(t.attachmentSuccess || 'Uploaded!');
      }
    } catch (err) {
      toast.error(t.attachmentFail || 'Failed!');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const startDictation = () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast.error(t.voiceNotSupported || 'Not Supported');
      return;
    }
    // @ts-ignore
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setDiagnosis((prev) => prev ? prev + ' ' + transcript : transcript);
    };
    recognition.onerror = () => {
      setIsListening(false);
      toast.error(t.micError || 'Error');
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const addMedicine = () => setMedicines([...medicines, { id: Date.now(), name: '', dosage: '', frequency: '', duration: '' }]);
  const updateMedicine = (id: number, field: string, value: string) => setMedicines(medicines.map(m => m.id === id ? { ...m, [field]: value } : m));
  const removeMedicine = (id: number) => setMedicines(medicines.filter(m => m.id !== id));

  const savePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (medicines.length === 0 || !medicines[0].name.trim()) return toast.error(t.addOneMedicine || 'Add one med');
    setSubmitting(true);
    try {
      const targetId = familyMemberId || patientId;
      const res = await api.post('/api/prescriptions', { patient_id: targetId, appointment_id: appointmentId, diagnosis, medicines, notes });
      toast.success(t.prescriptionSuccess || 'Saved!');
      const px = res.prescription?.[0];
      setPrescriptionId(px?.short_code || px?.id || Date.now());
      setShowPrintTemplate(true);
    } catch (err) { 
      toast.error(t.prescriptionFail || 'Error'); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const content = (
    <>
      <div className="bg-white dark:bg-slate-900 p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center z-10 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="text-blue-600 dark:text-blue-400" />
            {familyMemberName ? `${familyMemberName} (${t.via || 'via'} ${patientName})` : patientName}
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">#{familyMemberId || patientId} {t.patientMedicalFile || 'Medical File'}</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-500 hover:text-red-500 rounded-full transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="flex bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <button 
          onClick={() => setActiveTab('prescription')} 
          className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'prescription' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <FileText size={18} /> {t.writePrescription || 'Write Rx'}
        </button>
        <button 
          onClick={() => setActiveTab('ehr')} 
          className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'ehr' ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <HeartPulse size={18} /> {t.viewFullEhr || 'View EHR'}
        </button>
      </div>

      <div className="hidden">
        {showPrintTemplate && (
          <PrescriptionPrintTemplate
            ref={printRef}
            doctorName={user?.name || ''}
            doctorSpecialty={user?.specialty || ''}
            facilityName={facility?.name || ''}
            facilityAddress={facility?.address || ''}
            facilityPhone={facility?.phone || ''}
            patientName={patientName}
            patientAge={String(calculateAge(ehr?.dob, ehr?.age))}
            date={new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
            diagnosis={diagnosis}
            medicines={medicines}
            notes={notes}
            prescriptionId={prescriptionId}
            lang={lang}
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex justify-center py-20"><span className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></span></div>
        ) : activeTab === 'ehr' ? (
          <div className="space-y-6">
            {!ehr.id ? (
              <div className="text-center py-16 text-slate-400">
                <ShieldAlert size={56} className="mx-auto mb-4 opacity-50 text-orange-400" />
                <p className="font-bold text-lg">{t.noEhrYet || 'No EHR yet'}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
                    <p className="text-xs text-slate-400 mb-1">{t.age || 'Age'}</p>
                    <h4 className="font-black text-slate-800 dark:text-white text-lg">
                      {calculateAge(ehr?.dob, ehr?.age)}
                    </h4>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm text-center"><p className="text-xs text-slate-400 mb-1">{t.genderLabel || t.gender || 'Gender'}</p><h4 className="font-black text-slate-800 dark:text-white text-lg">{ehr?.gender || '---'}</h4></div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm text-center"><p className="text-xs text-slate-400 mb-1">{t.bloodType || 'Blood Type'}</p><h4 className="font-black text-red-600 dark:text-red-400 text-xl" dir="ltr">{ehr?.blood_type || '---'}</h4></div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm text-center"><p className="text-xs text-slate-400 mb-1">{t.maritalStatus || 'Marital'}</p><h4 className="font-bold text-slate-800 dark:text-white text-md">{ehr?.marital_status || '---'} {ehr?.children_count > 0 ? `(${ehr?.children_count} ${t.children || ''})` : ''}</h4></div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2"><h4 className="text-xs font-bold text-slate-400 mb-1 uppercase">{t.pastMedicalHistory || 'Past Meds'}</h4><p className="text-base font-bold text-slate-800 dark:text-slate-200">{ehr?.past_medical_history || t.none || '---'}</p></div>
                  <div><h4 className="text-xs font-bold text-slate-400 mb-1 uppercase">{t.pastSurgeries || 'Surgeries'}</h4><p className="text-base font-bold text-slate-800 dark:text-slate-200">{ehr?.past_surgeries || t.none || '---'}</p></div>
                  <div><h4 className="text-xs font-bold text-slate-400 mb-1 uppercase">{t.allergies || 'Allergies'}</h4><p className="text-base font-bold text-slate-800 dark:text-slate-200">{ehr?.allergies || t.none || '---'}</p></div>
                  <div className="md:col-span-2"><h4 className="text-xs font-bold text-slate-400 mb-1 uppercase">{t.familyHistory || 'Family History'}</h4><p className="text-sm font-medium text-slate-800 dark:text-slate-300">{ehr?.family_history || t.none || '---'}</p></div>

                  {ehr.special_habits && (
                    <div className="md:col-span-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase">{t.specialHabits || 'Habits'}</h4>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{ehr?.special_habits}</p>
                    </div>
                  )}
                </div>

                {ehr.gender === 'أنثى' && ehr.menstrual_history && (
                  <div className="bg-pink-50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-900/30 p-5 rounded-2xl">
                    <h4 className="text-sm font-bold text-pink-600 dark:text-pink-400 mb-3">{t.womenHealth || 'Women Health'}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {(() => {
                        try {
                          const wh = typeof ehr.menstrual_history === 'string' ? JSON.parse(ehr.menstrual_history) : ehr.menstrual_history;
                          return (
                            <>
                                <div><span className="block text-xs text-pink-500/70 mb-1">{t.cycleRegularity || 'Cycle'}</span><span className="font-bold dark:text-white">{wh.cycle}</span></div>
                                <div><span className="block text-xs text-pink-500/70 mb-1">{t.lastPeriodDate || 'LMP'}</span><span className="font-bold dark:text-white">{wh.LMP || '---'}</span></div>
                                <div><span className="block text-xs text-pink-500/70 mb-1">{t.bleedingDuration || 'Duration'}</span><span className="font-bold dark:text-white">{wh.flow_duration ? wh.flow_duration + ' ' + (t.daysSuffix || '') : '---'}</span></div>
                                <div><span className="block text-xs text-pink-500/70 mb-1">{t.pregnanciesCount || 'Gravida'}</span><span className="font-bold dark:text-white">{wh.gravida || 0}</span></div>
                              </>
                            );
                          } catch (e) { return <p>{t.dataError || 'Error'}</p>; }
                      })()}
                    </div>
                  </div>
                )}

                {ehr.medication_list && Array.isArray(ehr.medication_list) && ehr.medication_list.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-5 rounded-2xl mt-6">
                    <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-3">{t.currentMeds || 'Current Meds'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {ehr.medication_list.map((med: any, idx: number) => (
                        <div key={idx} className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm flex justify-between items-center border border-blue-50 dark:border-slate-700">
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-sm" dir="ltr">{med.name}</span>
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{med.dose} - {med.freq}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {attachments && attachments.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-900/10 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl mt-6">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2"><ImageIcon size={16} /> {t.medicalAttachments || 'Attachments'}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {attachments.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noreferrer" className="block relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:opacity-80 transition-opacity bg-white">
                          <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex justify-between items-center bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-4 rounded-2xl">
                  <div>
                    <h4 className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5"><UploadCloud size={16} /> {t.addNewAttachment || 'Add File'}</h4>
                    <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">{t.uploadNotice || 'Photo only'}</p>
                  </div>
                  <label className="cursor-pointer bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition flex items-center gap-2">
                    {uploadingAttachment ? <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span> : <Plus size={16} />}
                    {t.upload || 'Upload'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleAttachmentUpload} disabled={uploadingAttachment} />
                  </label>
                </div>
              </>
            )}
          </div>
        ) : (
          <form id="prescriptionForm" onSubmit={savePrescription} className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm relative">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-emerald-900 dark:text-emerald-400 flex items-center gap-2"><Stethoscope size={16} /> {t.diagnosis || 'Diagnosis'}</label>
                <button type="button" onClick={startDictation} title={t.voiceDictation || 'Voice'} className={`p-2 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50'}`}>
                  <Mic size={18} />
                </button>
              </div>
              <textarea required rows={3} className="w-full p-3 border border-emerald-200 dark:border-emerald-800 rounded-xl outline-none focus:border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10 dark:text-white" placeholder={t.diagnosisPlaceholder || 'Enter diagnosis'} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><Package size={18} className="text-blue-500" /> {t.prescribedMedicines || 'Medicines'}</h3>
                <button type="button" onClick={addMedicine} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-blue-100 dark:hover:bg-blue-900/50"><Plus size={14} /> {t.addMedicine || 'Add'}</button>
              </div>

              <div className="space-y-3">
                {medicines.map((med) => (
                  <div key={med.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row gap-3 relative group">
                    {medicines.length > 1 && <button type="button" onClick={() => removeMedicine(med.id)} className="absolute top-2 left-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 size={16} /></button>}
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">{t.medicineName || 'Medicine'}</label>
                      <MedicineAutocomplete 
                        value={med.name} 
                        onChange={(val) => updateMedicine(med.id, 'name', val)} 
                        lang={lang}
                        placeholder="Panadol 500mg"
                      />
                    </div>
                    <div className="w-full md:w-32"><label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">{t.dosageValue || 'Dose'}</label><input className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 dark:bg-slate-800 dark:text-white" value={med.dosage} onChange={e => updateMedicine(med.id, 'dosage', e.target.value)} placeholder={t.dosageValue || 'Dose'} /></div>
                    <div className="w-full md:w-32"><label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">{t.frequencyValue || 'Freq'}</label><input className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 dark:bg-slate-800 dark:text-white" value={med.frequency} onChange={e => updateMedicine(med.id, 'frequency', e.target.value)} placeholder={t.frequencyValue || 'Freq'} /></div>
                    <div className="w-full md:w-32"><label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">{t.durationValue || 'Duration'}</label><input className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 dark:bg-slate-800 dark:text-white" value={med.duration} onChange={e => updateMedicine(med.id, 'duration', e.target.value)} placeholder={t.durationValue || 'Duration'} /></div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t.additionalInstructions || 'Instructions'}</label>
              </div>
              <textarea rows={2} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-slate-900 dark:text-white" placeholder={t.instructionsPlaceholder || 'Additional notes'} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </form>
        )}
      </div>

      <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex gap-3">
        {onClose && <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">{t.close || 'Close'}</button>}
        {activeTab === 'prescription' && (
          <div className="flex-1 flex gap-2 w-full">
            <button type="submit" form="prescriptionForm" disabled={submitting} className="flex-1 py-3 rounded-xl font-bold bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-200 dark:shadow-none flex justify-center items-center gap-2 transition-all">{submitting ? <span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span> : <FileText size={18} />}{t.issuePrescription || 'Issue Rx'}</button>
            <button type="button" onClick={() => { setPrescriptionId(Date.now()); setShowPrintTemplate(true); }} className="px-4 py-3 rounded-xl font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm flex items-center justify-center gap-2 transition-all shrink-0">
              <Printer size={18} className="text-blue-500" /> <span className="hidden sm:inline">{t.print || 'Print'}</span>
            </button>
          </div>
        )}
      </div>
    </>
  );

  if (isPanel) {
    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[80]">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }} 
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="bg-slate-50 dark:bg-slate-950 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {content}
      </motion.div>
    </div>
  );
};
