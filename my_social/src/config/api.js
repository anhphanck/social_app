const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API_URL = `${API_BASE}/api`;
export const UPLOADS_URL = `${API_BASE}/uploads`;
export const SOCKET_URL = API_BASE;

