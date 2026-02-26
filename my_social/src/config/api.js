const RAW_BASE = (import.meta.env && import.meta.env.VITE_API_URL) ? String(import.meta.env.VITE_API_URL).trim() : '';
let BASE = RAW_BASE ? RAW_BASE.replace(/\/+$/, '') : '';
if (BASE && !/^https?:\/\//i.test(BASE)) {
  BASE = '';
}
if (typeof window !== 'undefined' && BASE) {
  const isLocalBase = /^(http(s)?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(BASE);
  const host = (window.location && window.location.hostname) ? window.location.hostname : '';
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';
  if (isLocalBase && !isLocalHost) {
    BASE = '';
  }
}

export const API_URL = BASE ? `${BASE}/api` : '/api';
export const UPLOADS_URL = BASE ? `${BASE}/uploads` : '/uploads';
export const SOCKET_URL = BASE
  ? BASE
  : (typeof window !== 'undefined' && window.location && window.location.origin ? window.location.origin : '');
