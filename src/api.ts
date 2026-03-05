export const api = {
  get: (url: string) => fetch(url, { credentials: 'include' }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
  post: (url: string, body: any) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
  put: (url: string, body: any) => fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
  patch: (url: string, body?: any) => fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: body ? JSON.stringify(body) : undefined }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
  delete: (url: string) => fetch(url, { method: 'DELETE', credentials: 'include' }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
};

export const uploadImageToImgBB = async (file: File) => { 
  const base64 = await new Promise<string>((resolve, reject) => { 
    const reader = new FileReader(); reader.readAsDataURL(file); 
    reader.onload = () => resolve(reader.result as string); reader.onerror = e => reject(e); 
  }); 
  const f = new FormData(); f.append('image', base64.split(',')[1]); 
  
  // 🔴 ضع مفتاح ImgBB الخاص بك هنا 🔴
  const r = await fetch('https://api.imgbb.com/1/upload?key=ba0a89c85f4f7651c6daab7d351989ed', { method: 'POST', body: f }); 
  const d = await r.json(); 
  if (d.success) return d.data.url; 
  throw new Error(d.error?.message || 'فشل الرفع'); 
};