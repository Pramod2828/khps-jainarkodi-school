import axios from 'axios';

export function getDynamicApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    return 'https://khps-jainarkodi-school.onrender.com/api';
  }
  return 'https://khps-jainarkodi-school.onrender.com/api';
}

export const api = axios.create({
  baseURL: getDynamicApiUrl(),
  withCredentials: true,
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  },
});

// Update dynamic baseURL & auth header on client-side requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    config.baseURL = getDynamicApiUrl();
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  // Allow browser/Axios to automatically set multipart/form-data boundary for FormData
  if (config.data instanceof FormData) {
    if (config.headers) {
      if (typeof (config.headers as any).delete === 'function') {
        (config.headers as any).delete('Content-Type');
        (config.headers as any).delete('content-type');
      } else {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Helper to construct absolute image/file URL from backend
export function getAssetUrl(filePath: string | undefined | null): string {
  if (!filePath) return '/placeholder.png';
  if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('data:')) {
    return filePath;
  }
  const baseUrl = getDynamicApiUrl().replace('/api', '');
  return `${baseUrl}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
}
