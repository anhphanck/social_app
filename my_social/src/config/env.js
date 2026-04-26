export const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || "http://localhost:5000").replace(/\/$/, "");
export const API_URL = `${API_ORIGIN}/api`;
export const UPLOADS_URL = `${API_ORIGIN}/uploads`;
