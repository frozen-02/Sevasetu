import api from './api.js';

// Auth
export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  refreshToken: (token) => api.post('/auth/refresh-token', { refreshToken: token }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, data) => api.patch(`/auth/reset-password/${token}`, data),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
  getMe: () => api.get('/auth/me'),
  resendVerification: () => api.post('/auth/resend-verification'),
};

// Users
export const userService = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  updateWithFiles: (id, formData) => api.put(`/users/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  changePassword: (data) => api.post('/users/change-password', data),
  toggleStatus: (id) => api.patch(`/users/${id}/status`),
  delete: (id) => api.delete(`/users/${id}`),
};

// Donations
export const donationService = {
  getAll: (params) => api.get('/donations', { params }),
  getById: (id) => api.get(`/donations/${id}`),
  getMy: (params) => api.get('/donations/my', { params }),
  create: (formData) => api.post('/donations', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, formData) => api.put(`/donations/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/donations/${id}`),
};

// Requests
export const requestService = {
  getAll: (params) => api.get('/requests', { params }),
  getById: (id) => api.get(`/requests/${id}`),
  create: (data) => api.post('/requests', data),
  cancel: (id) => api.patch(`/requests/${id}/cancel`),
  confirmDelivery: (id) => api.patch(`/requests/${id}/confirm-delivery`),
};

// Matches
export const matchService = {
  getAll: (params) => api.get('/matches', { params }),
  create: (data) => api.post('/matches', data),
  getSuggestions: (donationId) => api.get(`/matches/suggestions/${donationId}`),
  updateStatus: (id, data) => api.patch(`/matches/${id}/status`, data),
};

// Feedback
export const feedbackService = {
  getAll: (params) => api.get('/feedback', { params }),
  getMy: (params) => api.get('/feedback/my', { params }),
  create: (data) => api.post('/feedback', data),
  update: (id, data) => api.patch(`/feedback/${id}`, data),
  hide: (id, reason) => api.patch(`/feedback/${id}/hide`, { reason }),
};

// Notifications
export const notificationService = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  clearRead: () => api.delete('/notifications/clear-read'),
};

// Analytics
export const analyticsService = {
  getOverview: () => api.get('/analytics/overview'),
  getTrends: (params) => api.get('/analytics/trends', { params }),
  getCategories: () => api.get('/analytics/categories'),
  getStates: () => api.get('/analytics/states'),
  getImpact: () => api.get('/analytics/impact'),
  getDonorAnalytics: () => api.get('/analytics/donor'),
};

// Admin
export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getPendingDonations: (params) => api.get('/admin/donations/pending', { params }),
  approveDonation: (id) => api.patch(`/admin/donations/${id}/approve`),
  rejectDonation: (id, reason) => api.patch(`/admin/donations/${id}/reject`, { reason }),
  getPendingRequests: (params) => api.get('/admin/requests/pending', { params }),
  approveRequest: (id) => api.patch(`/admin/requests/${id}/approve`),
  rejectRequest: (id, reason) => api.patch(`/admin/requests/${id}/reject`, { reason }),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
};
