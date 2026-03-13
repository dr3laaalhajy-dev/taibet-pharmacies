// 🟢 النوع الخاص بالأسئلة الشائعة للطبيب
export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

// 🟢 تم دمج بيانات المستخدم القديمة والجديدة في مكان واحد!
export interface UserType { 
  id: number; 
  email: string; 
  role: 'super_admin' | 'admin' | 'doctor' | 'pharmacist' | 'dentist' | 'patient' | 'pharmacy' | 'customer_service'; 
  name: string;
  phone?: string; 
  notes?: string; 
  pharmacy_limit?: number; 
  is_active?: boolean; 
  wallet_balance?: string;
  profile_picture?: string;
  
  // البيانات الخاصة بالطبيب
  specialty?: string;
  consultation_price?: number;
  about?: string;
  faqs?: FAQ[];
  daily_limit?: number;
}

export interface WorkingHours { 
  isOpen: boolean; 
  start: string; 
  end: string; 
}

export interface Facility { 
  id: number; 
  name: string; 
  type: 'pharmacy' | 'clinic' | 'dental_clinic'; 
  address: string; 
  phone: string; 
  latitude: number; 
  longitude: number; 
  doctor_id?: number; 
  pharmacist_name?: string; 
  whatsapp_phone?: string; 
  image_url?: string; 
  specialty?: string; 
  services?: string; 
  consultation_fee?: string; 
  waiting_time?: string; 
  working_hours: Record<string, WorkingHours>; 
  manual_status?: 'open' | 'closed' | 'auto'; 
  is_ecommerce_enabled?: boolean; 
}

export interface Product { 
  id: number; 
  pharmacy_id: number; 
  name: string; 
  price: string; 
  quantity: number; 
  max_per_user?: number; 
  image_url?: string; 
  pharmacy_name?: string; 
  whatsapp_phone?: string; 
}

export interface CartItem extends Product { 
  qty: number; 
  product_id: number; 
}

export interface Order { 
  id: number; 
  pharmacy_name: string; 
  customer_name: string; 
  customer_phone: string; 
  items: CartItem[]; 
  total_price: string; 
  status: 'pending' | 'completed' | 'cancelled' | 'pending_pricing' | 'awaiting_approval'; 
  created_at: string; 
  prescription_url?: string;
}

export interface FooterSettings {
  appName?: string;
  aboutLink?: string;
  teamLink?: string;
  careersLink?: string;
  doctorJoinLink?: string;
  libraryLink?: string;     // 🟢 الحقل الذي طلبته
  contactLink?: string;
  termsLink?: string;
  privacyLink?: string;
  androidLink?: string;
  iosLink?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  copyright?: string;
  description?: string;
  contact_phone?: string;
  complaints_phone?: string;
}

export interface WalletRequest { 
  id: number; 
  user_id: number; 
  user_name: string; 
  user_email: string; 
  type: 'deposit' | 'withdrawal'; 
  amount: string; 
  status: 'pending' | 'approved' | 'rejected'; 
  created_at: string; 
}

export const SUPER_ADMINS = ['admin@pharmaduty.com', 'alaa@taiba.pharma.sy', 'alaa3@taiba.dental.sy'];
export const DAYS_OF_WEEK_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const DAYS_OF_WEEK_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const SPECIALTIES = ["أمراض الجهاز الهضمي والكبد", "أمراض الكلى", "أمراض الغدد الصماء والسكري", "طب الأطفال وحديثي الولادة", "أمراض القلب والأوعية الدموية", "الأمراض الجلدية والتناسلية", "الأمراض الصدرية والجهاز التنفسي", "طب الأعصاب والنفسية", "أمراض الدم والأورام", "العلاج الطبيعي والتأهيل", "الجراحة العامة", "جراحة العظام والكسور", "جراحة المسالك البولية", "جراحة المخ والأعصاب", "جراحة الأنف والأذن والحنجرة", "جراحة التجميل والحروق", "جراحة القلب والصدر", "طب وجراحة العيون", "النساء والتوليد"];