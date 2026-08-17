import axios from 'axios';

export function getDynamicApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    return `http://${host}:5000/api`;
  }
  return 'http://localhost:5000/api';
}

export const api = axios.create({
  baseURL: getDynamicApiUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  },
});

// Update dynamic baseURL on client-side requests
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
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Handle 401 Unauthorized globally by redirecting to /login
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
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  const baseUrl = getDynamicApiUrl().replace('/api', '');
  return `${baseUrl}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
}
