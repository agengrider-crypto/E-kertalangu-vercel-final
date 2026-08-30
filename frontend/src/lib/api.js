import axios from 'axios';

// Kosong = same-origin (mis. deploy Vercel: frontend & API satu domain).
export const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('ektl_token');
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Sesi dicabut/kedaluwarsa (401) -> bersihkan token & arahkan ke login
api.interceptors.response.use(
    (res) => res,
    (err) => {
        const status = err?.response?.status;
        const url = err?.config?.url || '';
        if (status === 401 && localStorage.getItem('ektl_token') && !url.includes('/auth/login')) {
            localStorage.removeItem('ektl_token');
            if (!window.location.pathname.startsWith('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(err);
    },
);

export function formatApiError(err) {
    // Tidak ada response = masalah jaringan / server tidak responsif (mis. cold start)
    if (err && !err.response) {
        if (err.code === 'ECONNABORTED') return 'Koneksi ke server bermasalah (timeout). Silakan coba lagi.';
        return 'Koneksi ke server bermasalah. Silakan coba lagi.';
    }
    const status = err?.response?.status;
    const d = err?.response?.data?.detail;
    // Error teknis dari server disembunyikan dari pengguna
    if (status >= 500) return 'Sistem sedang mengalami gangguan. Silakan coba beberapa saat lagi.';
    if (status === 404 && d == null) return 'Data tidak ditemukan.';
    if (d == null) return 'Terjadi kendala. Silakan coba lagi.';
    if (typeof d === 'string') return d; // pesan backend sudah ramah (Bahasa Indonesia)
    if (Array.isArray(d)) return d.map((e) => (e && typeof e.msg === 'string' ? e.msg : 'Input tidak valid')).join(' ');
    if (typeof d === 'object' && typeof d.msg === 'string') return d.msg;
    return 'Terjadi kendala. Silakan coba lagi.';
}
