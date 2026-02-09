/**
 * API Configuration
 * 
 * In development (Vite), we use a proxy (vite.config.ts) to forward /api -> localhost:8000
 * In production (Vercel), we rely on vercel.json rewrites to forward /api -> api/index.py
 * 
 * Therefore, the base URL should always be just empty string (relative path) or explicit base.
 */

// If VITE_API_URL is set (e.g. explicitly to https://myapp.vercel.app), use it.
// Otherwise, default to empty string so requests are relative (e.g. /api/...)
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const getApiUrl = (endpoint: string) => {
    // Ensure endpoint starts with /
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    // Ensure no double slashes if API_BASE_URL ends with /
    const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    return `${base}${path}`;
};
