import axios from 'axios';
import { idempotencyKey, validateCurrentDomain } from '../utils/security';
import {
  encryptPayload,
  isPayloadEncryptionEnabled,
  parseEncryptedResponse,
} from '../utils/payloadCrypto';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const PAYLOAD_ENCRYPTION = isPayloadEncryptionEnabled();

let backendEncryptionEnabled = null;

async function shouldUsePayloadEncryption() {
  if (!PAYLOAD_ENCRYPTION) return false;
  if (backendEncryptionEnabled !== null) return backendEncryptionEnabled;
  try {
    const res = await fetch(`${API_URL}/health`);
    const data = await res.json();
    backendEncryptionEnabled = Boolean(data.payload_encryption_enabled);
  } catch {
    backendEncryptionEnabled = false;
  }
  if (!backendEncryptionEnabled) {
    console.warn('[API] Bỏ qua mã hóa payload: backend chưa bật ENABLE_API_PAYLOAD_ENCRYPTION');
  }
  return backendEncryptionEnabled;
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
  // Chỉ tắt auto-parse JSON khi bật mã hóa payload
  ...(PAYLOAD_ENCRYPTION ? { transformResponse: [(data) => data] } : {}),
});

if (import.meta.env.PROD) {
  validateCurrentDomain();
}

const isFormData = (value) => typeof FormData !== 'undefined' && value instanceof FormData;

function tryParseJsonString(data) {
  if (typeof data !== 'string') return data;
  const trimmed = data.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return data;
  try {
    return JSON.parse(trimmed);
  } catch {
    return data;
  }
}

const getAuthToken = () => {
  const isAdminPath = window.location.pathname.startsWith('/internal-admin-portal');
  if (isAdminPath) return localStorage.getItem('admin_token');
  return localStorage.getItem('user_token') || localStorage.getItem('admin_token');
};

api.interceptors.request.use(async (config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.headers['X-Request-Id'] = idempotencyKey('rid');

  if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
    config.headers['X-Idempotency-Key'] = idempotencyKey('idem');
  }

  const path = (config.url || '').split('?')[0];
  const useEncryption = await shouldUsePayloadEncryption();

  if (
    useEncryption &&
    !path.startsWith('/auth/') &&
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
  const useEncryption = await shouldUsePayloadEncryption();
  if (useEncryption && res.headers['x-encrypted'] === '1' && res.data) {
    try {
      res.data = await parseEncryptedResponse(res.data);
    } catch (e) {
      console.error('Failed to decrypt API response', e);
      throw e;
    }
  } else {
    res.data = tryParseJsonString(res.data);
  }
  return res;
}, (error) => {
  const status = error.response?.status;

  if (status === 401) {
    const path = window.location.pathname;
    if (path.startsWith('/internal-admin-portal')) {
      localStorage.removeItem('admin_token');
      window.location.href = '/internal-admin-portal/login';
    } else if (path.startsWith('/app')) {
      localStorage.removeItem('user_token');
      localStorage.removeItem('user_refresh_token');
      window.location.href = '/login?next=' + encodeURIComponent(path);
    }
  }

  if (status === 429) {
    const retryAfter = error.response?.headers?.['retry-after'];
    error.message = retryAfter
      ? `Quá nhiều yêu cầu. Thử lại sau ${retryAfter}s.`
      : 'Quá nhiều yêu cầu. Vui lòng chờ và thử lại.';
  }

  if (status === 403) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string' && detail.includes('blocked')) {
      error.message = 'Truy cập tạm thời bị chặn do hoạt động bất thường.';
    } else if (typeof detail === 'string') {
      error.message = detail.includes('Admin') || detail.includes('permissions')
        ? 'Bạn không có quyền thực hiện thao tác này.'
        : detail;
    }
  }

  if (status === 422) {
    const detail = error.response?.data?.detail;
    if (Array.isArray(detail) && detail.some((d) => d.type === 'model_attributes_type')) {
      error.message =
        'Lỗi định dạng dữ liệu đăng nhập. Kiểm tra cấu hình mã hóa API (VITE_ENABLE_PAYLOAD_ENCRYPTION).';
    }
  }

  return Promise.reject(error);
});

export default api;

export const authApi = {
  login: (username, password, captchaToken = null) =>
    api.post('/auth/login', { username, password, captcha_token: captchaToken }),
  me: () => api.get('/auth/me'),
};

export const userAuthApi = {
  register: (data) => api.post('/auth/register', data),
  login: (username, password, captchaToken = null) =>
    api.post('/auth/login/user', { username, password, captcha_token: captchaToken }),
  refresh: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),
  logout: (refreshToken) => api.post('/auth/logout', { refresh_token: refreshToken }),
  forgotPassword: (username) => api.post('/auth/forgot-password', { username }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/me', data),
};

export const notesApi = {
  folders: () => api.get('/notes/folders'),
  createFolder: (data) => api.post('/notes/folders', data),
  updateFolder: (id, data) => api.put(`/notes/folders/${id}`, data),
  reorderFolders: (items) => api.put('/notes/folders/reorder', { items }),
  deleteFolder: (id) => api.delete(`/notes/folders/${id}`),
  list: (params) => api.get('/notes', { params }),
  calendar: (year, month) => api.get('/notes/calendar', { params: { year, month } }),
  quota: () => api.get('/notes/quota'),
  get: (id) => api.get(`/notes/${id}`),
  create: (data) => api.post('/notes', data),
  update: (id, data) => api.put(`/notes/${id}`, data),
  delete: (id, permanent = false) => api.delete(`/notes/${id}`, { params: { permanent } }),
  restore: (id) => api.post(`/notes/${id}/restore`),
  addLink: (noteId, data) => api.post(`/notes/${noteId}/links`, data),
};

export const userApi = {
  dashboard: () => api.get('/me/dashboard'),
  bookmarkIds: () => api.get('/bookmarks/ids'),
  bookmarks: (folderId) => api.get('/bookmarks', { params: { folder_id: folderId || undefined } }),
  addBookmark: (data) => api.post('/bookmarks', data),
  moveBookmark: (documentId, folderId) =>
    api.put(`/bookmarks/${documentId}`, { folder_id: folderId ?? null }),
  removeBookmark: (documentId) => api.delete(`/bookmarks/${documentId}`),
  bookmarkFolders: () => api.get('/bookmarks/folders'),
  createBookmarkFolder: (name) => api.post('/bookmarks/folders', { name }),
  deleteBookmarkFolder: (id) => api.delete(`/bookmarks/folders/${id}`),
  recordView: (documentId) => api.post(`/documents/${documentId}/view`),
};

export const documentsApi = {
  list: (page = 1, pageSize = 20, filters = {}) =>
    api.get('/documents', {
      params: {
        page,
        page_size: pageSize,
        faculty: filters.faculty || undefined,
        subject: filters.subject || undefined,
        type: filters.type || undefined,
        year: filters.year || undefined,
        q: filters.q || undefined,
      },
    }),
  browse: ({ page = 1, pageSize = 12, faculty, subject, type, year, q } = {}) =>
    api.get('/documents', {
      params: {
        page,
        page_size: pageSize,
        faculty: faculty || undefined,
        subject: subject || undefined,
        type: type || undefined,
        year: year || undefined,
        q: q || undefined,
      },
    }),
  taxonomy: () => api.get('/documents/taxonomy'),
  search: (q, page = 1, pageSize = 20) =>
    api.get('/documents/search', { params: { q, page, page_size: pageSize } }),
  byTag: (tag, page = 1, pageSize = 20) => {
    const name = typeof tag === 'string' ? tag : tag?.name;
    if (!name) return Promise.reject(new Error('Invalid tag'));
    return api.get(`/documents/tag/${encodeURIComponent(name)}`, {
      params: { page, page_size: pageSize },
    });
  },
  unclassified: (page = 1, pageSize = 20) =>
    api.get('/documents/unclassified', { params: { page, page_size: pageSize } }),
  get: (id) => api.get(`/documents/${id}`),
  getBySlug: (slug) => api.get(`/documents/by-slug/${slug}`),
  byCategorySlug: (slug, page = 1, pageSize = 20) =>
    api.get(`/documents/category/${encodeURIComponent(slug)}`, {
      params: { page, page_size: pageSize },
    }),
  related: (id) => api.get(`/documents/${id}/related`),
  download: (id) => api.get(`/documents/download/${id}`, { responseType: 'blob' }),
  previewStream: (id) => api.get(`/documents/preview/${id}/stream`, { responseType: 'blob' }),
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
  createTag: (data) => api.post('/admin/tags', data),
  updateTag: (id, data) => api.put(`/admin/tags/${id}`, data),
  deleteTag: (id) => api.delete(`/admin/tags/${id}`),
  listDocuments: () => api.get('/admin/documents'),
  getStorage: () => api.get('/admin/storage'),
  updateDocument: (id, data) => api.put(`/admin/documents/${id}`, data),
  deleteDocument: (id) => api.delete(`/admin/documents/${id}`),
  listUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};
