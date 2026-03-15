import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Trash2, Printer, Eye, DollarSign, Scan, Camera, Image, ExternalLink, Phone, Users } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { UserType, Facility, Order } from '../types';
import { api } from '../api-client';
import toast from 'react-hot-toast';
import { formatCurrency, inputToOldLS, getCurrencySymbol, oldLSToDisplay, CurrencyMode } from '../utils/currency';

export const OrdersManager = ({ user, facilities, lang }: { user: UserType, facilities: Facility[], lang: string }) => {
  const [orders, setOrders] = useState<Order[]>([]); 
  const [loading, setLoading] = useState(true); 
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'past' | 'pricing'>('pending'); 
  const [adminFilter, setAdminFilter] = useState<number | 'all'>('all');
  
  const [pricingOrderId, setPricingOrderId] = useState<number | null>(null);
  const [prescriptionItems, setPrescriptionItems] = useState([{ name: '', qty: 1, price: 0 }]);
  const [isSubmittingPricing, setIsSubmittingPricing] = useState(false);
  const [pricingCurrency, setPricingCurrency] = useState<CurrencyMode>('new'); // currency mode for pharmacist pricing input

  // 🟢 Pharmacy Scanner State
  const [scannedQR, setScannedQR] = useState('');
  const [scannedPrescription, setScannedPrescription] = useState<any>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const requestCameraPermission = async () => {
    try {
      setCameraPermissionError(null);
      // Trigger native permission prompt via standard web API
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop the stream immediately, it's just to check/request permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err: any) {
      console.error("Camera permission error:", err);
      let errorMsg = lang === 'ar' 
        ? 'يجب السماح بالوصول إلى الكاميرا لمسح رموز QR. يرجى منح الإذن من إعدادات التطبيق.' 
        : 'Camera access is required to scan QR codes. Please grant permission in your app settings.';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        // Specifically handled per user request
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = lang === 'ar' ? 'لم يتم العثور على كاميرا في الجهاز.' : 'No camera found on this device.';
      }
      
      setCameraPermissionError(errorMsg);
      return false;
    }
  };

  useEffect(() => {
    const initScanner = async () => {
      if (isScannerOpen) {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) {
          setIsScannerOpen(false);
          return;
        }

        if (!scannerRef.current) {
          scannerRef.current = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
          scannerRef.current.render((decodedText) => {
            handleQRData(decodedText);
            setIsScannerOpen(false); // Close after successful scan
          }, (errorMessage) => {
            // ignore background errors
          });
        }
      } else {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(error => {
            console.error("Failed to clear html5QrcodeScanner. ", error);
          });
          scannerRef.current = null;
        }
      }
    };
    initScanner();
  }, [isScannerOpen]);

  const handleQRData = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.meds && Array.isArray(parsed.meds)) {
        toast.success(lang === 'ar' ? `تم قراءة الوصفة للمريض: ${parsed.pid || ''}` : `Loaded Rx for: ${parsed.pid || ''}`);
        setScannedPrescription({
          id: parsed.id || Date.now(),
          customer_name: parsed.pid || (lang === 'ar' ? 'مريض وافد (مراجعة للصيدلية)' : 'Walk-in Patient'),
          items: parsed.meds.map((m: string) => ({ name: m, qty: 1, price: 0 }))
        });
        setScannedQR('');
      } else {
        toast.error(lang === 'ar' ? 'رمز QR غير صالح لمعيار الروشتات' : 'Invalid Rx QR Code protocol');
      }
    } catch(err) {
      toast.error(lang === 'ar' ? 'لا يمكن قراءة الرمز الممسوح' : 'Cannot parse scanned code');
    }
  };

  const handleScanQRText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedQR.trim()) return;

    const input = scannedQR.trim();
    
    // 🟢 التحقق إذا كان الكود هو "كود قصير" (6 خانات) بدلاً من بيانات QR كاملة
    if (input.length === 6 && !input.startsWith('{')) {
      try {
        const data = await api.get(`/api/prescriptions/short/${input.toUpperCase()}`);
        if (data.type === 'prescription') {
          toast.success(lang === 'ar' ? `تم العثور على الوصفة!` : `Prescription found!`);
          setScannedPrescription({
            id: data.id,
            customer_name: lang === 'ar' ? `مريض (كود: ${input})` : `Patient (Code: ${input})`,
            items: data.meds.map((m: string) => ({ name: m, qty: 1, price: 0 }))
          });
          setScannedQR('');
        } else if (data.type === 'order') {
          toast.success(lang === 'ar' ? `تم العثور على الطلب!` : `Order found!`);
          // Handle order loading if needed, or just toast for now
          // For now, let's treat it as a prescription if that's what's expected here
          setScannedPrescription({
            id: data.id,
            customer_name: data.customer_name,
            items: data.items.map((i: any) => ({ ...i, price: i.price || 0 }))
          });
          setScannedQR('');
        }
      } catch (err: any) {
        toast.error(lang === 'ar' ? 'الكود غير صحيح أو غير موجود' : 'Invalid or missing code');
      }
      return;
    }

    handleQRData(input);
  };

  const loadOrders = () => {
    api.get('/api/orders').then((data: Order[]) => {
      console.log('[OrdersManager] loaded orders count:', data.length);
      data.forEach((o: Order) => console.log(`  Order #${o.id}: status=${o.status}, prescription_image_url=${o.prescription_image_url || 'NULL'}`));
      setOrders(data);
    }).finally(() => setLoading(false));
  };
  
  useEffect(() => { loadOrders(); return () => { if (scannerRef.current) scannerRef.current.clear().catch(()=>{}); }; }, []);
  
  const updateStatus = async (id: number, status: string) => { 
    if(!window.confirm(lang === 'ar' ? `تأكيد تغيير حالة الطلب؟` : 'Confirm status change?')) return; 
    try { await api.patch(`/api/orders/${id}/status`, { status }); loadOrders(); } 
    catch(err) { alert(lang === 'ar' ? 'حدث خطأ' : 'Error occurred'); } 
  };

  const submitPricing = async (orderId: number) => {
    if (prescriptionItems.some(i => !i.name || i.price <= 0 || i.qty <= 0)) {
      return toast.error(lang === 'ar' ? 'الرجاء تعبئة جميع الحقول بشكل صحيح' : 'Please fill all fields correctly');
    }

    setIsSubmittingPricing(true);
    try {
      // Convert prices from pharmacist's chosen currency to Old L.S (DB base)
      const items = prescriptionItems.map(i => ({ 
        ...i, 
        product_id: -1, 
        price: inputToOldLS(i.price, pricingCurrency).toString(),
        image_url: orders.find(o => o.id === orderId)?.prescription_image_url 
      }));
      const total = items.reduce((sum, item) => sum + parseFloat(item.price) * item.qty, 0);
      
      await api.patch(`/api/orders/${orderId}/pricing`, { items, total_price: total.toString() });
      toast.success(lang === 'ar' ? 'تم تسعير الوصفة بنجاح. سيظهر السعر للمريض.' : 'Prescription priced successfully.');
      setPricingOrderId(null);
      setPrescriptionItems([{ name: '', qty: 1, price: 0 }]);
      loadOrders();
    } catch (err: any) {
      toast.error(lang === 'ar' ? 'فشل إرسال التسعيرة' : 'Failed to submit pricing');
    } finally {
      setIsSubmittingPricing(false);
    }
  };

  // 🟢 دالة السحر لطباعة الفاتورة وتحويلها لـ PDF
  const handlePrintInvoice = (o: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert(lang === 'ar' ? 'يرجى السماح بالنوافذ المنبثقة (Pop-ups) للطباعة' : 'Please allow pop-ups to print');

    // تجهيز أسطر الأدوية
    const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
    const itemsHtml = (Array.isArray(items) ? items : []).map(item => `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: center;">${item.qty}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: left;">${formatCurrency(parseFloat(item.price || '0'), 'new', lang)}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: left; font-weight: bold;">${formatCurrency(parseFloat(item.price || '0') * (item.qty || 1), 'new', lang)}</td>
      </tr>
    `).join('');

    // رسم هيكل الفاتورة
    const html = `
      <html dir="${lang === 'ar' ? 'rtl' : 'ltr'}" lang="${lang}">
        <head>
          <title>${lang === 'ar' ? 'فاتورة رقم' : 'Invoice'} #${o.id}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: 900; color: #4f46e5; letter-spacing: -0.5px; }
            .sub-logo { font-size: 14px; color: #64748b; margin-top: 5px; }
            .details-grid { display: flex; justify-content: space-between; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 12px; }
            .details-col { line-height: 1.8; font-size: 14px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 30px; font-size: 14px; }
            th { background-color: #f1f5f9; padding: 12px 8px; text-align: ${lang === 'ar' ? 'right' : 'left'}; color: #475569; border-bottom: 2px solid #e2e8f0; }
            .total-box { font-size: 20px; font-weight: bold; text-align: ${lang === 'ar' ? 'left' : 'right'}; padding-top: 20px; border-top: 2px solid #1e293b; color: #0f172a; }
            .footer { text-align: center; margin-top: 50px; font-size: 13px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            @media print { body { padding: 0; } .no-print { display: none; } @page { margin: 1.5cm; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Taiba Health</div>
            <div class="sub-logo">${lang === 'ar' ? 'نظام إدارة الصيدليات والعيادات' : 'Pharmacies & Clinics Management System'}</div>
            <div style="margin-top: 15px; font-weight: bold; font-size: 18px;">${lang === 'ar' ? 'فاتورة طلب' : 'Order Invoice'} #${o.id}</div>
          </div>
          
          <div class="details-grid">
            <div class="details-col">
              <strong>${lang === 'ar' ? 'الصيدلية المجهزة:' : 'Dispensing Pharmacy:'}</strong> <span style="color: #4f46e5; font-weight: bold;">${o.pharmacy_name || '-'}</span><br>
              <strong>${lang === 'ar' ? 'تاريخ الطلب:' : 'Order Date:'}</strong> <span dir="ltr">${new Date(o.created_at).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
            </div>
            <div class="details-col">
              <strong>${lang === 'ar' ? 'صاحب الطلب:' : 'Order By:'}</strong> ${o.customer_name}<br>
              ${o.family_member_name ? `<strong>${lang === 'ar' ? 'المريض (فرد عائلة):' : 'Patient (Family):'}</strong> <span style="color: #4f46e5; font-weight: bold;">${o.family_member_name} (${o.family_member_relation})</span><br>` : ''}
              <strong>${lang === 'ar' ? 'رقم الهاتف:' : 'Phone Number:'}</strong> <span dir="ltr">${o.customer_phone}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${lang === 'ar' ? 'اسم المادة (الدواء)' : 'Item Name'}</th>
                <th style="text-align: center;">${lang === 'ar' ? 'الكمية' : 'Qty'}</th>
                <th style="text-align: left;">${lang === 'ar' ? 'سعر الإفرادي' : 'Unit Price'}</th>
                <th style="text-align: left;">${lang === 'ar' ? 'المجموع' : 'Total'}</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="total-box">
            ${lang === 'ar' ? 'المبلغ الإجمالي المطلـوب:' : 'Grand Total:'} 
            <span dir="ltr" style="color: #4f46e5; background: #e0e7ff; padding: 5px 15px; border-radius: 8px; margin-left: 10px; display: inline-block;">
              ${formatCurrency(parseFloat(o.total_price || '0'), 'new', lang)}
            </span>
          </div>

          <div class="footer">
            ${lang === 'ar' ? 'نشكر لكم ثقتكم بخدماتنا الطبية. مع تمنياتنا لكم بالصحة والعافية.' : 'Thank you for trusting our medical services. Wishing you good health.'}
            <br>https://www.taiba-health.com/
          </div>

          <script>
            // طباعة تلقائية بمجرد تحميل الصفحة
            window.onload = () => { 
              setTimeout(() => {
                window.print(); 
                window.close(); 
              }, 300);
            }
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const filteredOrders = adminFilter === 'all' ? orders : orders.filter(o => o.pharmacy_name === facilities.find(f => f.id === adminFilter)?.name);
  const pendingOrders = filteredOrders.filter(o => o.status === 'pending'); 
  const pricingOrders = filteredOrders.filter(o => o.status === 'pending_pricing');
  const pastOrders = filteredOrders.filter(o => o.status !== 'pending' && o.status !== 'pending_pricing'); 
  const displayOrders = activeSubTab === 'pending' ? pendingOrders : (activeSubTab === 'pricing' ? pricingOrders : pastOrders);
  
  if (loading) return <div>{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>;

  return (
    <div>
      {user.role === 'admin' && (
        <div className="mb-6 bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4 max-w-xl">
          <label className="font-bold text-slate-700">{lang === 'ar' ? 'فلتر الصيدليات:' : 'Filter Pharmacies:'}</label>
          <select className="flex-1 px-4 py-2 rounded-xl border border-slate-200 outline-none" value={adminFilter} onChange={e => setAdminFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}><option value="all">{lang === 'ar' ? 'عرض جميع الطلبات' : 'All Orders'}</option>{facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
        </div>
      )}
      <div className="flex flex-wrap gap-4 mb-8">
        <button onClick={() => setActiveSubTab('pending')} className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${activeSubTab === 'pending' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{lang === 'ar' ? `طلبات جديدة (${pendingOrders.length})` : `New Orders (${pendingOrders.length})`}</button>
        <button onClick={() => setActiveSubTab('pricing')} className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${activeSubTab === 'pricing' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{lang === 'ar' ? `وصفات للتسعير (${pricingOrders.length})` : `Prescriptions (${pricingOrders.length})`}</button>
        <button onClick={() => setActiveSubTab('past')} className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${activeSubTab === 'past' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{lang === 'ar' ? 'طلبات سابقة' : 'Past Orders'}</button>
      </div>

      {/* 🔴 QR Code Scanner Section */}
      <div className="mb-8 bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="bg-blue-600/20 p-5 rounded-2xl border border-blue-500/30">
            <Scan size={36} className="text-blue-400" />
          </div>
          <div className="flex-1 w-full relative">
            <h3 className="text-xl font-bold mb-2">{lang === 'ar' ? 'صرف وصفة طبية (مسح QR الخاص بالطبيب)' : 'Dispense Prescription (Scan Doctor QR)'}</h3>
            <p className="text-sm text-slate-400 mb-5 max-w-2xl">{lang === 'ar' ? 'قم بتشغيل الكاميرا لمسح الروشتة مباشرة، أو استخدم جهاز قارئ الباركود اليدوي.' : 'Open Camera to scan prescription directly, or use a physical barcode scanner.'}</p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setIsScannerOpen(!isScannerOpen)} 
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition-all ${isScannerOpen ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50'}`}
              >
                <Camera size={20} /> {isScannerOpen ? (lang === 'ar' ? 'إغلاق الكاميرا' : 'Close Camera') : (lang === 'ar' ? 'فتح الكاميرا للمسح' : 'Open Camera to Scan')}
              </button>
              
              <form onSubmit={handleScanQRText} className="relative flex-1">
                <input type="text" value={scannedQR} onChange={e => setScannedQR(e.target.value)} placeholder={lang === 'ar' ? 'أو أدخل الكود يدوياً / قارئ ليزر...' : 'Or use physical scanner...'} className="w-full bg-slate-800 border-[3px] border-slate-700 focus:border-blue-500 rounded-xl px-5 py-3 outline-none text-white font-mono placeholder:text-slate-500 transition-colors shadow-inner" />
                <button type="submit" className="absolute left-2.5 rtl:left-auto rtl:right-2.5 top-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors">{lang === 'ar' ? 'إدخال' : 'Submit'}</button>
              </form>
            </div>

            {isScannerOpen && (
              <div className="mt-6 p-4 bg-white rounded-2xl">
                <div id="qr-reader" className="w-full text-slate-900 overflow-hidden rounded-xl"></div>
              </div>
            )}

            {cameraPermissionError && (
              <div className="mt-4 p-4 bg-red-100 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="bg-red-200 p-2 rounded-lg">
                  <Camera size={20} />
                </div>
                <p className="text-sm font-bold">{cameraPermissionError}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {scannedPrescription && (
        <div className="mb-8 p-6 bg-white border-[3px] border-blue-400 shadow-xl shadow-blue-100 rounded-3xl relative animate-in fade-in slide-in-from-top-4">
          <div className="absolute top-0 right-10 bg-blue-600 text-white px-4 py-1.5 rounded-b-xl text-sm font-bold font-mono tracking-wider shadow-sm">SCANNED-RX-{scannedPrescription.id}</div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="font-bold text-2xl text-slate-900">{scannedPrescription.customer_name}</h4>
              <p className="text-sm font-bold text-blue-600 mt-1">{lang === 'ar' ? 'وصفة ورقية ممسوحة ضوئياً - المريض داخل الصيدلية' : 'Walk-in Scanned Prescription'}</p>
            </div>
            <button onClick={() => setScannedPrescription(null)} className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-xl transition-colors shrink-0"><Trash2 size={24}/></button>
          </div>
          
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
             <h6 className="font-bold mb-5 flex items-center gap-2 text-lg"><DollarSign size={20} className="text-blue-500"/> {lang === 'ar' ? 'تسعير الوصفة الممسوحة:' : 'Price Scanned Prescription:'}</h6>
             {scannedPrescription.items.map((item: any, idx: number) => (
                <div key={idx} className="flex flex-col md:flex-row gap-3 mb-4 p-4 md:p-0 bg-white md:bg-transparent rounded-xl border md:border-0 border-slate-200">
                   <div className="flex-1">
                     <label className="block text-[10px] font-bold text-slate-400 mb-1">{lang==='ar'?'اسم المادة':'Item Name'}</label>
                     <input type="text" placeholder={lang === 'ar' ? 'اسم الدواء' : 'Medicine'} className="w-full p-3.5 text-sm border border-slate-300 rounded-xl outline-none focus:border-blue-500 font-bold bg-white shadow-sm" value={item.name} onChange={e => { const newItems = [...scannedPrescription.items]; newItems[idx].name = e.target.value; setScannedPrescription({...scannedPrescription, items: newItems}); }} />
                   </div>
                   <div className="w-full md:w-28">
                     <label className="block text-[10px] font-bold text-slate-400 mb-1">{lang==='ar'?'الكمية':'Quantity'}</label>
                     <input type="number" min="1" placeholder="Qty" className="w-full p-3.5 text-sm border border-slate-300 rounded-xl outline-none focus:border-blue-500 text-center font-bold bg-white shadow-sm" value={item.qty} onChange={e => { const newItems = [...scannedPrescription.items]; newItems[idx].qty = parseInt(e.target.value) || 1; setScannedPrescription({...scannedPrescription, items: newItems}); }} />
                   </div>
                   <div className="w-full md:w-36">
                     <label className="block text-[10px] font-bold text-slate-400 mb-1">{lang==='ar'?'السعر الإفرادي':'Unit Price'}</label>
                     <input type="number" min="0" placeholder="Price" className="w-full p-3.5 text-sm border border-slate-300 rounded-xl outline-none focus:border-blue-500 text-center font-black text-emerald-700 bg-white shadow-sm" value={item.price} onChange={e => { const newItems = [...scannedPrescription.items]; newItems[idx].price = parseFloat(e.target.value) || 0; setScannedPrescription({...scannedPrescription, items: newItems}); }} />
                   </div>
                   <div className="flex items-end mb-1">
                     <button onClick={() => { if(scannedPrescription.items.length > 1) setScannedPrescription({...scannedPrescription, items: scannedPrescription.items.filter((_: any, i: number) => i !== idx)}) }} className="p-3.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors border border-transparent hover:border-red-100"><Trash2 size={20}/></button>
                   </div>
                </div>
             ))}
             <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-200">
                <button onClick={() => setScannedPrescription({...scannedPrescription, items: [...scannedPrescription.items, { name: '', qty: 1, price: 0 }]})} className="text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-5 py-3 rounded-xl transition-colors relative top-1">+ {lang === 'ar' ? 'إضافة دواء للوصفة' : 'Add Item'}</button>
                <div className="text-center">
                  <span className="block text-xs font-bold text-slate-500 mb-1">{lang === 'ar' ? 'المجموع الكلي المطلوب:' : 'Grand Total:'}</span>
                  <div className="text-2xl font-bold px-6 py-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex items-center gap-2">
                    {formatCurrency(scannedPrescription.items.reduce((sum: number, item: any) => sum + (item.price * item.qty), 0), 'new', lang)}
                  </div>
                </div>
             </div>
             
             <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col md:flex-row gap-4">
               <button onClick={() => {
                 if (scannedPrescription.items.some((i:any) => i.price <= 0)) return toast.error(lang === 'ar' ? 'الرجاء تسعير جميع الأدوية بصفر أو أكثر' : 'Please review pricing');
                 if (scannedPrescription.items.length === 0) return toast.error(lang === 'ar' ? 'الروشتة فارغة' : 'Prescription empty');
                 
                 const facilityId = adminFilter === 'all' ? (facilities[0]?.id || null) : adminFilter;
                 api.post('/api/orders', {
                    pharmacy_id: facilityId,
                    items: scannedPrescription.items.map((i:any) => ({ ...i, product_id: -1, image_url: '' })), 
                    total_price: scannedPrescription.items.reduce((sum: number, item: any) => sum + (item.price * item.qty), 0),
                    prescription_url: '',
                    status: 'completed',
                    customer_name: scannedPrescription.customer_name,
                    customer_phone: 'Walk-in (QR Scan)'
                 }).then(() => {
                    toast.success(lang === 'ar' ? 'تم تسجيل بيع الوصفة بنجاح وأُدرِجت في سجل الطلبات.' : 'Prescription sale recorded in Sales History.');
                    setScannedPrescription(null);
                    loadOrders();
                 }).catch(() => toast.error(lang === 'ar' ? 'فشل الحفظ في السجلات' : 'Failed to save to records'));
               }} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-4 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all flex justify-center items-center gap-2 text-lg shadow-lg shadow-emerald-200 hover:-translate-y-0.5">
                 <CheckCircle size={24} /> {lang === 'ar' ? 'صرف الأدوية (تسجيل مبيعة في النظام)' : 'Dispense & Record Sale'}
               </button>
             </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {displayOrders.map(o => (
          <div key={o.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative group hover:border-indigo-200 transition-colors">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
              <div>
                <h4 className="font-bold text-lg text-slate-900">
                  {o.family_member_name ? `${o.family_member_name} (${lang === 'ar' ? 'عن طريق' : 'via'} ${o.customer_name})` : o.customer_name}
                </h4>
                {o.family_member_name && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-md">{lang === 'ar' ? o.family_member_relation : o.family_member_relation}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-500 text-sm mt-1 font-mono">
                  <Phone size={14} /> <span dir="ltr">{o.customer_phone}</span>
                </div>
                {user.role === 'admin' && <p className="text-[10px] bg-indigo-50 px-2 py-1 rounded text-indigo-700 mt-2 font-bold inline-block">صيدلية: {o.pharmacy_name}</p>}
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  {/* 🟢 زر الطباعة */}
                  <button onClick={() => handlePrintInvoice(o)} className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100" title={lang === 'ar' ? 'طباعة الفاتورة' : 'Print Invoice'}>
                    <Printer size={16} />
                  </button>
                  {/* 🟢 زر عرض صورة الوصفة — يظهر دائماً إن وجدت أو إذا كان طلب تسعير */}
                  {(o.prescription_image_url || o.status === 'pending_pricing') && (
                    <a href={o.prescription_image_url || '#'} target={o.prescription_image_url ? "_blank" : "_self"} rel="noreferrer"
                      className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 flex items-center gap-1 text-xs font-bold"
                      title={lang === 'ar' ? 'عرض صورة الوصفة' : 'View Prescription'}
                      onClick={(e) => { if(!o.prescription_image_url) { e.preventDefault(); alert(lang==='ar'?'الصورة غير متوفرة':'Image not available'); } }}
                    >
                      <Image size={14} /> {lang === 'ar' ? 'وصفة' : 'Rx'}
                    </a>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    o.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    o.status === 'pending_pricing' ? 'bg-blue-100 text-blue-700' :
                    o.status === 'accepted' ? 'bg-purple-100 text-purple-700' :
                    o.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {o.status === 'pending' ? (lang === 'ar' ? 'قيد الانتظار' : 'Pending') :
                     o.status === 'pending_pricing' ? (lang === 'ar' ? 'بانتظار التسعير' : 'Needs Pricing') :
                     o.status === 'accepted' ? (lang === 'ar' ? 'تم التسعير' : 'Priced') :
                     o.status === 'completed' ? (lang === 'ar' ? 'مكتمل' : 'Completed') : (lang === 'ar' ? 'ملغي' : 'Cancelled')}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1" dir="ltr">{new Date(o.created_at).toLocaleString('ar-EG')}</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
              {(Array.isArray(typeof o.items === 'string' ? JSON.parse(o.items) : o.items) ? (typeof o.items === 'string' ? JSON.parse(o.items) : o.items) : []).map((item: any, idx: number) => ( 
                <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                  <span className="font-medium text-slate-700">{item.name} <span className="text-emerald-600 font-bold ml-1">x{item.qty}</span></span>
                  <span className="font-mono text-slate-600 font-bold" dir="ltr">{formatCurrency(parseFloat(item.price || '0') * (item.qty || 1), 'new', lang)}</span>
                </div> 
              ))}
              <div className="flex justify-between items-center pt-3 border-t border-slate-200 font-bold text-lg">
                <span>{lang === 'ar' ? 'المجموع الكلي:' : 'Total:'}</span>
                <span dir="ltr" className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{formatCurrency(parseFloat(o.total_price) || 0, 'new', lang)}</span>
              </div>
            </div>

            {(o.status === 'pending_pricing' || o.prescription_image_url) && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="font-bold text-blue-900 flex items-center gap-2"><Image size={18}/> {lang === 'ar' ? 'صورة الوصفة الطبية' : 'Prescription Image'}</h5>
                  {o.prescription_image_url && <a href={o.prescription_image_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-bold flex items-center gap-1"><ExternalLink size={14}/>{lang === 'ar' ? 'فتح كاملاً' : 'Open full'}</a>}
                </div>
                {o.prescription_image_url ? (
                  <img src={o.prescription_image_url} className="w-full max-h-52 object-contain rounded-xl bg-white border border-blue-200 mb-4" alt="prescription" />
                ) : (
                  <div className="w-full h-32 flex items-center justify-center bg-slate-200 text-slate-500 rounded-xl mb-4 text-sm font-bold">{lang === 'ar' ? 'لا توجد صورة مرفقة 📷' : 'No image attached 📷'}</div>
                )}
                
                {/* Pricing section - only for pending_pricing */}
                {o.status === 'pending_pricing' && (
                  pricingOrderId === o.id ? (
                  <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm mt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h6 className="font-bold text-slate-800">{lang === 'ar' ? 'تسعير الوصفة:' : 'Price Prescription:'}</h6>
                      {/* Currency toggle for pharmacist input */}
                      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                        <button onClick={() => setPricingCurrency('new')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${pricingCurrency === 'new' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500 hover:bg-slate-200'}`}>
                          {getCurrencySymbol('new', lang)}
                        </button>
                        <button onClick={() => setPricingCurrency('old')} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${pricingCurrency === 'old' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:bg-slate-200'}`}>
                          {getCurrencySymbol('old', lang)}
                        </button>
                      </div>
                    </div>
                    {prescriptionItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2 mb-2">
                         <input type="text" placeholder={lang === 'ar' ? 'اسم الدواء' : 'Medicine'} className="flex-1 p-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500" value={item.name} onChange={e => { const newItems = [...prescriptionItems]; newItems[idx].name = e.target.value; setPrescriptionItems(newItems); }} />
                         <input type="number" min="1" placeholder="Qty" className="w-16 p-2 text-sm border border-slate-300 rounded-lg outline-none text-center" value={item.qty} onChange={e => { const newItems = [...prescriptionItems]; newItems[idx].qty = parseInt(e.target.value) || 1; setPrescriptionItems(newItems); }} />
                         <input type="number" min="0" placeholder={getCurrencySymbol(pricingCurrency, lang)} className="w-28 p-2 text-sm border border-slate-300 rounded-lg outline-none text-center font-bold" value={item.price} onChange={e => { const newItems = [...prescriptionItems]; newItems[idx].price = parseFloat(e.target.value) || 0; setPrescriptionItems(newItems); }} />
                         <button onClick={() => { if(prescriptionItems.length > 1) setPrescriptionItems(prescriptionItems.filter((_, i) => i !== idx)) }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                    ))}
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                      <button onClick={() => setPrescriptionItems([...prescriptionItems, { name: '', qty: 1, price: 0 }])} className="text-sm font-bold text-blue-600 hover:underline">+ {lang === 'ar' ? 'إضافة دواء' : 'Add Item'}</button>
                      {/* Show running total in chosen currency */}
                      <strong dir="ltr" className="text-emerald-600 text-lg">
                        {prescriptionItems.reduce((sum, item) => sum + (item.price * item.qty), 0).toLocaleString()} {getCurrencySymbol(pricingCurrency, lang)}
                        {pricingCurrency === 'new' && <span className="text-xs text-slate-400 ml-1">(= {formatCurrency((prescriptionItems.reduce((sum, item) => sum + (item.price * item.qty), 0) * 100), 'old', lang)})</span>}
                      </strong>
                    </div>
                    <div className="flex gap-2 mt-4">
                       <button onClick={() => submitPricing(o.id)} disabled={isSubmittingPricing} className="flex-1 bg-emerald-500 text-white py-2.5 rounded-xl font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">{isSubmittingPricing ? <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"/> : <CheckCircle size={16}/>}{lang === 'ar' ? 'إرسال التسعيرة للمريض' : 'Submit Price'}</button>
                       <button onClick={() => setPricingOrderId(null)} className="px-4 bg-slate-100 text-slate-600 py-2.5 rounded-xl font-bold hover:bg-slate-200">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setPricingOrderId(o.id); setPrescriptionItems([{ name: '', qty: 1, price: 0 }]); }} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 flex justify-center items-center gap-2 transition-colors shadow-sm mt-2"><DollarSign size={18}/> {lang === 'ar' ? 'تسعير الوصفة الآن' : 'Price Now'}</button>
                ))}
              </div>
            )}
            
            {/* Action buttons */}
            {o.status === 'pending' || o.status === 'awaiting_approval' ? (
              <div className="flex gap-3 mt-2">
                <button onClick={() => updateStatus(o.id, 'completed')} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold hover:bg-emerald-600 flex justify-center items-center gap-2 transition-colors shadow-sm"><CheckCircle size={18}/> {lang === 'ar' ? 'قبول وإنهاء' : 'Complete'}</button>
                <button onClick={() => updateStatus(o.id, 'cancelled')} className="px-6 bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors"><Trash2 size={18}/></button>
              </div>
            ) : o.status === 'pending_pricing' ? (
              <div className="flex gap-3 mt-2">
                <button onClick={() => updateStatus(o.id, 'cancelled')} className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors flex justify-center items-center gap-2"><Trash2 size={18}/> {lang === 'ar' ? 'رفض الطلب' : 'Reject Order'}</button>
              </div>
            ) : (
              (user.email.includes('admin') || user.role === 'admin') && (
                <div className="flex justify-end border-t border-slate-100 pt-3 mt-2">
                  <button onClick={async () => { if(window.confirm('حذف نهائي؟')) { await api.delete(`/api/orders/${o.id}`); loadOrders(); } }} className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"><Trash2 size={16}/> حذف الطلب السابق</button>
                </div>
              )
            )}
          </div>
        ))}
        {displayOrders.length === 0 && <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-3xl">{lang === 'ar' ? 'لا يوجد طلبات في هذه القائمة.' : 'No orders here.'}</div>}
      </div>
    </div>
  );
};