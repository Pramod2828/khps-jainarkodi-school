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

/**
 * Clean SVG fallback for broken image links
 */
export const IMAGE_FALLBACK_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg>";

/**
 * Helper to construct absolute image/file URL from backend
 */
export function getAssetUrl(filePath: string | undefined | null): string {
  if (!filePath) return IMAGE_FALLBACK_SVG;
  const trimmed = filePath.trim();
  if (!trimmed) return IMAGE_FALLBACK_SVG;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const baseUrl = getDynamicApiUrl().replace('/api', '');
  return `${baseUrl}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

/**
 * Helper to convert Base64 Data URL to Blob
 */
export function dataUrlToBlob(dataUrl: string): { blob: Blob; mime: string } {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const base64Data = parts[1] ? parts[1].replace(/\s/g, '') : '';
  const binaryStr = atob(base64Data);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return { blob: new Blob([bytes], { type: mime }), mime };
}

/**
 * Single safe file URL & attachment opening handler.
 * Seamlessly opens Base64 Data URLs, HTTPS URLs, and relative paths
 * in all modern browsers (Chrome, Edge, Firefox, Safari) without top-frame blocking.
 */
export function openFileUrl(
  filePath: string | undefined | null,
  fileName?: string,
  forceDownload: boolean = false
): void {
  if (!filePath) {
    alert('File attachment is not available');
    return;
  }

  const trimmed = filePath.trim();
  if (!trimmed) {
    alert('File attachment is not available');
    return;
  }

  // 1. Data URL (Base64)
  if (trimmed.startsWith('data:')) {
    try {
      const { blob, mime } = dataUrlToBlob(trimmed);
      const blobUrl = URL.createObjectURL(blob);
      const isImage = mime.startsWith('image/');
      const isPdf = mime === 'application/pdf';

      if (!forceDownload && (isImage || isPdf)) {
        const win = window.open(blobUrl, '_blank');
        if (!win) {
          // Fallback if popup blocker intervenes
          const link = document.createElement('a');
          link.href = blobUrl;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        // Download file for Word (.doc/.docx), Excel, ZIP, or explicit downloads
        const link = document.createElement('a');
        link.href = blobUrl;
        let ext = 'file';
        if (mime.includes('word') || mime.includes('document')) ext = 'docx';
        else if (mime === 'application/pdf') ext = 'pdf';
        else if (mime.startsWith('image/')) ext = mime.split('/')[1] || 'png';

        const finalName = fileName ? (fileName.includes('.') ? fileName : `${fileName}.${ext}`) : `download_${Date.now()}.${ext}`;
        link.download = finalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      return;
    } catch (err) {
      console.error('Error processing Base64 data URL:', err);
      alert('Could not open file attachment');
      return;
    }
  }

  // 2. HTTP/HTTPS or relative backend path
  const fullUrl = getAssetUrl(trimmed);
  const lowerUrl = fullUrl.toLowerCase();
  const isWordDoc = lowerUrl.endsWith('.doc') || lowerUrl.endsWith('.docx');

  if (forceDownload || isWordDoc) {
    const link = document.createElement('a');
    link.href = fullUrl;
    if (fileName) link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener,noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  }
}
