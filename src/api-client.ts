// 🟢 الرابط الأساسي للباك إند: الآن يسحب الرابط من ملف .env تلقائياً للعمل على الموبايل!
const BASE_URL = 'https://www.taiba-health.com';

export const api = {
  get: async (endpoint: string) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
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
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
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
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
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
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
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

// 🟢 الدالة الخاصة برفع الصور
export const uploadImageToImgBB = async (file: File) => { 
  const base64 = await new Promise<string>((resolve, reject) => { 
    const reader = new FileReader(); reader.readAsDataURL(file); 
    reader.onload = () => resolve(reader.result as string); 
    reader.onerror = e => reject(e); 
  }); 
  const f = new FormData(); f.append('image', base64.split(',')[1]); 
  const r = await fetch('https://api.imgbb.com/1/upload?key=6c2a41bd40fa2cde82b95b871c26b527', { method: 'POST', body: f }); 
  const d = await r.json(); if (d.success) return d.data.url; 
  throw new Error(d.error?.message || 'فشل الرفع'); 
};