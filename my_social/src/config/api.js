const RAW_BASE = (import.meta.env && import.meta.env.VITE_API_URL) ? String(import.meta.env.VITE_API_URL).trim() : '';
const BASE = RAW_BASE ? RAW_BASE.replace(/\/+$/, '') : '';

export const API_URL = BASE ? `${BASE}/api` : '/api';
export const UPLOADS_URL = BASE ? `${BASE}/uploads` : '/uploads';
export const SOCKET_URL = BASE
  ? BASE
  : (typeof window !== 'undefined' && window.location && window.location.origin ? window.location.origin : '');

