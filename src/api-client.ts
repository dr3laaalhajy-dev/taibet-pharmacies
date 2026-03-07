// 🟢 الرابط الكامل لمنصتك
const BASE_URL = 'https://taibet-pharmacies.vercel.app';

const getFullUrl = (url: string) => url.startsWith('http') ? url : `${BASE_URL}${url}`;

// 🛡️ دالة ذكية لمعالجة الردود (تمنع انهيار التطبيق إذا كان الرد ليس JSON)
const handleResponse = async (r: Response) => {
  if (r.ok) {
    return r.json();
  }

  // 🟢 التقاط خطأ الحماية من الـ DDoS (Rate Limit)
  if (r.status === 429) {
    return Promise.reject({ error: 'لقد قمت بإرسال طلبات كثيرة جداً. يرجى الانتظار لمدة 15 دقيقة ثم المحاولة مجدداً.' });
  }

  // محاولة قراءة الخطأ كـ JSON
  try {
    const errorData = await r.json();
    return Promise.reject(errorData);
  } catch (parseError) {
    // 🟢 إذا فشل في قراءته كـ JSON (مثل أخطاء Vercel الوهمية)، نعرض خطأ عام وأنيق
    return Promise.reject({ error: `عذراً، حدث خطأ في الخادم (رمز الخطأ: ${r.status}). يرجى المحاولة لاحقاً.` });
  }
};

export const api = {
  get: (url: string) => fetch(getFullUrl(url), { credentials: 'include' }).then(handleResponse),
  
  post: (url: string, body: any) => fetch(getFullUrl(url), { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    credentials: 'include', 
    body: JSON.stringify(body) 
  }).then(handleResponse),
  
  put: (url: string, body: any) => fetch(getFullUrl(url), { 
    method: 'PUT', 
    headers: { 'Content-Type': 'application/json' }, 
    credentials: 'include', 
    body: JSON.stringify(body) 
  }).then(handleResponse),
  
  patch: (url: string, body?: any) => fetch(getFullUrl(url), { 
    method: 'PATCH', 
    headers: { 'Content-Type': 'application/json' }, 
    credentials: 'include', 
    body: body ? JSON.stringify(body) : undefined 
  }).then(handleResponse),
  
  delete: (url: string) => fetch(getFullUrl(url), { 
    method: 'DELETE', 
    credentials: 'include' 
  }).then(handleResponse),
};

export const uploadImageToImgBB = async (file: File) => {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string); reader.onerror = e => reject(e);
  });
  const f = new FormData(); f.append('image', base64.split(',')[1]);
  // تأكد من وضع مفتاح API الخاص بك هنا
  const r = await fetch('https://api.imgbb.com/1/upload?key=6c2a41bd40fa2cde82b95b871c26b527', { method: 'POST', body: f });
  const d = await r.json();
  if (d.success) return d.data.url;
  throw new Error(d.error?.message || 'فشل الرفع');
};