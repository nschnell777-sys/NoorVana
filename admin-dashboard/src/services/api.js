import axios from 'axios';

const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' }
});

// Attach JWT token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses by redirecting to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('admin');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Admin Auth
export const adminLogin = (email, password) =>
  api.post('/api/v1/admin/auth/login', { email, password });

export const adminLogout = () =>
  api.post('/api/v1/admin/auth/logout');

// Clients
export const getClients = (params) =>
  api.get('/api/v1/admin/clients', { params });

export const getClientDetail = (id) =>
  api.get(`/api/v1/admin/clients/${id}`);

export const updateClient = (id, data) =>
  api.patch(`/api/v1/admin/clients/${id}`, data);

export const adjustPoints = (clientId, data) =>
  api.post(`/api/v1/admin/clients/${clientId}/adjust`, data);

export const adminUnenrollClient = (id, data) =>
  api.post(`/api/v1/admin/clients/${id}/unenroll`, data);

export const adminReenrollClient = (id) =>
  api.post(`/api/v1/admin/clients/${id}/reenroll`);

export const adminResetClientPassword = (id) =>
  api.post(`/api/v1/admin/clients/${id}/reset-password`);

export const recordTransaction = (data) =>
  api.post('/api/v1/admin/transactions', data);

// Transactions
export const getAllTransactions = (params) =>
  api.get('/api/v1/admin/transactions', { params });

// Reports
export const getTierDistribution = () =>
  api.get('/api/v1/admin/reports/tiers');

export const getMonthlyStats = (months = 6, granularity = 'month', { days } = {}) =>
  api.get('/api/v1/admin/reports/monthly-stats', { params: { months, granularity, ...(days && { days }) } });

export const getTopClients = (limit = 10) =>
  api.get('/api/v1/admin/reports/top-clients', { params: { limit } });

export const getMarketAnalytics = (params) =>
  api.get('/api/v1/admin/reports/markets', { params });

// Dashboard summary
export const getDashboardSummary = () =>
  api.get('/api/v1/admin/dashboard');

// Redemption Queue
export const getRedemptions = (params) =>
  api.get('/api/v1/admin/redemptions', { params });

export const getRedemptionStats = () =>
  api.get('/api/v1/admin/redemptions/stats');

export const processRedemption = (id) =>
  api.patch(`/api/v1/admin/redemptions/${id}/process`);

export const fulfillRedemption = (id, data) =>
  api.patch(`/api/v1/admin/redemptions/${id}/fulfill`, data);

export const denyRedemption = (id, data) =>
  api.patch(`/api/v1/admin/redemptions/${id}/deny`, data);

// Gift Claims
export const getGiftClaims = (params) =>
  api.get('/api/v1/admin/gift-claims', { params });

export const updateGiftClaim = (id, data) =>
  api.patch(`/api/v1/admin/gift-claims/${id}`, data);

// Concierge Requests
export const getConciergeRequests = (params) =>
  api.get('/api/v1/admin/concierge-requests', { params });

export const updateConciergeRequest = (id, data) =>
  api.patch(`/api/v1/admin/concierge-requests/${id}`, data);

// Card Requests
export const getCardRequests = (params) =>
  api.get('/api/v1/admin/card-requests', { params });

export const updateCardRequest = (id, data) =>
  api.patch(`/api/v1/admin/card-requests/${id}`, data);

// Community
export const getCommunityPosts = (params) =>
  api.get('/api/v1/admin/community', { params });

export const createCommunityPost = (formData) =>
  api.post('/api/v1/admin/community', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const updateCommunityPost = (id, formData) =>
  api.patch(`/api/v1/admin/community/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const deleteCommunityPost = (id) =>
  api.delete(`/api/v1/admin/community/${id}`);

// Offers
export const getOffers = (params) =>
  api.get('/api/v1/admin/offers', { params });

export const createOffer = (data) =>
  api.post('/api/v1/admin/offers', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
  });

export const getOffer = (id) =>
  api.get(`/api/v1/admin/offers/${id}`);

export const updateOffer = (id, data) =>
  api.patch(`/api/v1/admin/offers/${id}`, data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
  });

export const deleteOffer = (id) =>
  api.delete(`/api/v1/admin/offers/${id}`);

export const getOfferClaims = (offerId, params) =>
  api.get(`/api/v1/admin/offers/${offerId}/claims`, { params });

export const getAllOfferClaims = (params) =>
  api.get('/api/v1/admin/offer-claims', { params });

export const updateOfferClaim = (id, data) =>
  api.patch(`/api/v1/admin/offer-claims/${id}`, data);

export const drawOfferWinners = (offerId) =>
  api.post(`/api/v1/admin/offers/${offerId}/draw`);

export const manualPickWinner = (offerId, clientId) =>
  api.post(`/api/v1/admin/offers/${offerId}/manual-pick`, { client_id: clientId });

// Rewards Catalog (for offer linking)
export const getRewardsCatalog = (params) =>
  api.get('/api/v1/rewards-catalog', { params });

// AxisCare Integration
export const getAxisCareStatus = () =>
  api.get('/api/v1/admin/axiscare/status');

export const syncAxisCareClients = () =>
  api.post('/api/v1/admin/axiscare/sync-clients');

export const syncAxisCareBilling = (dateFrom, dateTo) =>
  api.post('/api/v1/admin/axiscare/sync-billing', { date_from: dateFrom, date_to: dateTo });

export const syncAxisCareSingleClient = (axisCareClientId) =>
  api.post(`/api/v1/admin/axiscare/sync-client/${axisCareClientId}`);

export const getAxisCareSyncLogs = (params) =>
  api.get('/api/v1/admin/axiscare/sync-logs', { params });

export default api;
