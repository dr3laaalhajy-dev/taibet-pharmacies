export interface User {
  id: number;
  email: string;
  role: 'admin' | 'doctor' | 'pharmacist';
  name: string;
  pharmacy_limit?: number;
  phone?: string;
  notes?: string;
}

export interface Pharmacy {
  id: number;
  name: string;
  address: string;
  phone: string;
  latitude?: number;
  longitude?: number;
  doctor_id?: number;
  pharmacist_name?: string;
  whatsapp_phone?: string;
  image_url?: string;
}

export interface RosterEntry {
  id: number;
  pharmacy_id: number;
  pharmacy_name?: string;
  duty_date: string;
  notes?: string;
  creator_name?: string;
  creator_phone?: string;
  creator_id?: number;
}
