const RAW_BASE = (import.meta.env && import.meta.env.VITE_API_URL) ? String(import.meta.env.VITE_API_URL).trim() : '';
const BASE = RAW_BASE ? RAW_BASE.replace(/\/+$/, '') : '';

export const API_URL = BASE ? `${BASE}/api` : '/api';

