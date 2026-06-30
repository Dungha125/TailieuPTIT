import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      if (window.location.pathname.startsWith('/internal-admin-portal')) {
        window.location.href = '/internal-admin-portal/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
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
  createTag: (name) => api.post('/admin/tags', { name }),
  listDocuments: () => api.get('/admin/documents'),
  updateDocument: (id, data) => api.put(`/admin/documents/${id}`, data),
  deleteDocument: (id) => api.delete(`/admin/documents/${id}`),
};
