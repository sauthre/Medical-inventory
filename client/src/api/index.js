import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const medicinesApi = {
  getAll: (params) => api.get('/medicines', { params }),
  getById: (id) => api.get(`/medicines/${id}`),
  getExpiring: (days = 30) => api.get('/medicines/expiring', { params: { days } }),
  getCategories: () => api.get('/medicines/categories'),
  create: (data) => api.post('/medicines', data),
  update: (id, data) => api.put(`/medicines/${id}`, data),
  remove: (id) => api.delete(`/medicines/${id}`),
};

export const salesApi = {
  getAll: (params) => api.get('/sales', { params }),
  create: (data) => api.post('/sales', data),
};

export const revenueApi = {
  getSummary: () => api.get('/revenue/summary'),
  getMonthly: (year) => api.get('/revenue/monthly', { params: { year } }),
  getDaily: (month) => api.get('/revenue/daily', { params: { month } }),
  getTopMedicines: (params) => api.get('/revenue/top-medicines', { params }),
};

export default api;
