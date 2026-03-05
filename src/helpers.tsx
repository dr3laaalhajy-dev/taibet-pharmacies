import React, { useState, useEffect } from 'react';
import { Marker, useMapEvents, useMap } from 'react-leaflet';
import { Facility } from './types';

export const checkIsOpenNow = (f: Facility) => {
  if (f.manual_status === 'open') return true; if (f.manual_status === 'closed') return false;
  if (!f.working_hours) return false; const todaySchedule = f.working_hours[new Date().getDay().toString()];
  if (!todaySchedule || !todaySchedule.isOpen) return false;
  const currentMins = new Date().getHours() * 60 + new Date().getMinutes();
  const [sH, sM] = todaySchedule.start.split(':').map(Number); const [eH, eM] = todaySchedule.end.split(':').map(Number);
  if ((eH * 60 + eM) < (sH * 60 + sM)) return currentMins >= (sH * 60 + sM) || currentMins <= (eH * 60 + eM);
  return currentMins >= (sH * 60 + sM) && currentMins <= (eH * 60 + eM);
};

export const formatTime12h = (t: string, lang: string = 'ar') => { if (!t) return ''; const [h, m] = t.split(':'); const d = new Date(); d.setHours(parseInt(h), parseInt(m)); return d.toLocaleTimeString(lang === 'en' ? 'en-US' : 'ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }); };

export const getDistanceKm = (l1: number, ln1: number, l2: number, ln2: number) => { const R = 6371; const dLat = (l2 - l1) * Math.PI / 180; const dLon = (ln2 - ln1) * Math.PI / 180; const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(l1 * Math.PI / 180) * Math.cos(l2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2); return (R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(1); };

export const LocationPicker = ({ onLocationSelect, initialPosition }: any) => { const [p, setP] = useState<any>(initialPosition || null); useMapEvents({ click(e) { setP([e.latlng.lat, e.latlng.lng]); onLocationSelect(e.latlng.lat, e.latlng.lng); } }); return p ? <Marker position={p} /> : null; };

export const RecenterMap = ({ position }: any) => { const m = useMap(); useEffect(() => { m.setView(position, m.getZoom()); }, [position, m]); return null; };