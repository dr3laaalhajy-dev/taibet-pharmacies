// 🟢 الرابط الأساسي للباك إند: الآن يسحب الرابط من ملف .env تلقائياً للعمل على الموبايل!
const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : 'https://www.taiba-health.com';

export const api = {
  get: async (endpoint: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw error;
    }
    return res.json();
  },

  post: async (endpoint: string, body: any) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw error;
    }
    return res.json();
  },

  put: async (endpoint: string, body: any) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw error;
    }
    return res.json();
  },

  patch: async (endpoint: string, body?: any) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw error;
    }
    return res.json();
  },

  delete: async (endpoint: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw error;
    }
    return res.json();
  },
};

export const uploadImageToImgBB = async (file: File): Promise<string> => {
  // 1. استخدام FormData كما يطلب ImgBB
  const formData = new FormData();

  // 2. يجب أن يكون اسم الحقل 'image' حصراً
  formData.append('image', file);

  // ضع مفتاح الـ API الخاص بك هنا (تأكد أنه صحيح ومكتمل)
  const IMGBB_API_KEY = 'ba0a89c85f4f7651c6daab7d351989ed'; // استبدل هذا بمفتاحك الحقيقي الكامل

  try {
    // 3. الإرسال بدون تحديد Content-Type (المتصفح سيتكفل بها)
    const response = await fetch(`https://api.imgbb.com/1/upload?key=ba0a89c85f4f7651c6daab7d351989ed`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'فشل رفع الصورة إلى ImgBB');
    }

    // إرجاع رابط الصورة المباشر
    return data.data.url;

  } catch (error: any) {
    console.error("ImgBB Upload Error:", error);
    throw error;
  }
};