import axios from 'axios';
import { idempotencyKey, validateCurrentDomain } from '../utils/security';
import {
  encryptPayload,
  isPayloadEncryptionEnabled,
  parseEncryptedResponse,
} from '../utils/payloadCrypto';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
  transformResponse: [(data) => data],
});

if (import.meta.env.PROD) {
  validateCurrentDomain();
}

const isFormData = (value) => typeof FormData !== 'undefined' && value instanceof FormData;

api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.headers['X-Request-Id'] = idempotencyKey('rid');

  if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
    config.headers['X-Idempotency-Key'] = idempotencyKey('idem');
  }

  if (
    isPayloadEncryptionEnabled() &&
    config.data &&
    !isFormData(config.data) &&
    ['post', 'put', 'patch'].includes(config.method)
  ) {
    const encrypted = await encryptPayload(config.data);
    config.data = encrypted;
    config.headers['Content-Type'] = 'text/plain; charset=utf-8';
    config.headers['X-Encrypted'] = '1';
  }

  return config;
});

api.interceptors.response.use(async (res) => {
  if (res.headers['x-encrypted'] === '1' && res.data) {
    try {
      res.data = await parseEncryptedResponse(res.data);
    } catch (e) {
      console.error('Failed to decrypt API response');
      throw e;
    }
  } else if (typeof res.data === 'string' && res.data.startsWith('{')) {
    try {
      res.data = JSON.parse(res.data);
    } catch {
      /* keep as string */
    }
  }
  return res;
}, (error) => {
  const status = error.response?.status;

  if (status === 401) {
    localStorage.removeItem('admin_token');
    if (window.location.pathname.startsWith('/internal-admin-portal')) {
      window.location.href = '/internal-admin-portal/login';
    }
  }

  if (status === 429) {
    const retryAfter = error.response?.headers?.['retry-after'];
    error.message = retryAfter
      ? `Quá nhiều yêu cầu. Thử lại sau ${retryAfter}s.`
      : 'Quá nhiều yêu cầu. Vui lòng chờ và thử lại.';
  }

  if (status === 403 && error.response?.data?.detail?.includes('blocked')) {
    error.message = 'Truy cập tạm thời bị chặn do hoạt động bất thường.';
  }

  return Promise.reject(error);
});

export default api;

export const authApi = {
  login: (username, password, captchaToken = null) =>
    api.post('/auth/login', { username, password, captcha_token: captchaToken }),
  me: () => api.get('/auth/me'),
};

export const documentsApi = {
  list: (page = 1, pageSize = 20) =>
    api.get('/documents', { params: { page, page_size: pageSize } }),
  search: (q, page = 1, pageSize = 20) =>
    api.get('/documents/search', { params: { q, page, page_size: pageSize } }),
  byTag: (tag, page = 1, pageSize = 20) =>
    api.get(`/documents/tag/${encodeURIComponent(tag)}`, { params: { page, page_size: pageSize } }),
  unclassified: (page = 1, pageSize = 20) =>
    api.get('/documents/unclassified', { params: { page, page_size: pageSize } }),
  get: (id) => api.get(`/documents/${id}`),
  download: (id) =>
    api.get(`/documents/download/${id}`, {
      responseType: 'blob',
      transformResponse: [(data) => data],
    }),
  previewStream: (id) =>
    api.get(`/documents/preview/${id}/stream`, {
      responseType: 'blob',
      transformResponse: [(data) => data],
    }),
  previewStreamUrl: (id) => `${API_URL}/documents/preview/${id}/stream`,
  preview: (id) => api.get(`/documents/preview/${id}`),
  tags: () => api.get('/documents/tags/all'),
  hot: () => api.get('/documents/hot'),
  recent: () => api.get('/documents/recent'),
};

export const adminApi = {
  upload: (formData) =>
    api.post('/admin/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  createTag: (name) => api.post('/admin/tags', { name }),
  listDocuments: () => api.get('/admin/documents'),
  getStorage: () => api.get('/admin/storage'),
  updateDocument: (id, data) => api.put(`/admin/documents/${id}`, data),
  deleteDocument: (id) => api.delete(`/admin/documents/${id}`),
};
