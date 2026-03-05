import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('client_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('client_token');
      localStorage.removeItem('client_data');
      localStorage.removeItem('client_loginTime');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/** POST /api/v1/clients/auth/login */
export const clientLogin = (email, password) =>
  api.post('/api/v1/clients/auth/login', { email, password });

/** POST /api/v1/clients/auth/register */
export const clientRegister = (email, password) =>
  api.post('/api/v1/clients/auth/register', { email, password });

/** POST /api/v1/clients/auth/logout */
export const clientLogout = () =>
  api.post('/api/v1/clients/auth/logout');

// Password Reset
export const forgotPassword = (email) =>
  api.post('/api/v1/clients/auth/forgot-password', { email });

export const resetPassword = (token, password) =>
  api.post('/api/v1/clients/auth/reset-password', { token, password });

export const validateResetToken = (token) =>
  api.get('/api/v1/clients/auth/reset-password/validate', { params: { token } });

// Two-Factor Authentication
export const verify2FA = (tempToken, code) =>
  api.post('/api/v1/clients/auth/2fa/verify', { temp_token: tempToken, code });

export const get2FAStatus = () =>
  api.get('/api/v1/clients/auth/2fa/status');

export const setup2FA = () =>
  api.post('/api/v1/clients/auth/2fa/setup');

export const confirm2FA = (code) =>
  api.post('/api/v1/clients/auth/2fa/confirm', { code });

export const disable2FA = (code) =>
  api.post('/api/v1/clients/auth/2fa/disable', { code });

/** GET /api/v1/clients/:id/loyalty */
export const getLoyaltyStatus = (clientId) =>
  api.get(`/api/v1/clients/${clientId}/loyalty`);

/** POST /api/v1/clients/:id/redeem */
export const redeemPoints = (clientId, points, options = {}) =>
  api.post(`/api/v1/clients/${clientId}/redeem`, { points, ...options });

/** GET /api/v1/clients/:id/transactions */
export const getTransactions = (clientId, params) =>
  api.get(`/api/v1/clients/${clientId}/transactions`, { params });

/** GET /api/v1/clients/:id/redemptions */
export const getRedemptions = (clientId, params) =>
  api.get(`/api/v1/clients/${clientId}/redemptions`, { params });

/** GET /api/v1/rewards-catalog */
export const getRewardsCatalog = (params) =>
  api.get('/api/v1/rewards-catalog', { params });

/** GET /api/v1/clients/:id/tier-rewards */
export const getTierRewards = (clientId) =>
  api.get(`/api/v1/clients/${clientId}/tier-rewards`);

/** POST /api/v1/clients/:id/tier-rewards/:rewardId/claim */
export const claimTierReward = (clientId, rewardId) =>
  api.post(`/api/v1/clients/${clientId}/tier-rewards/${rewardId}/claim`);

/** POST /api/v1/clients/:id/gift-claims */
export const createGiftClaim = (clientId, data) =>
  api.post(`/api/v1/clients/${clientId}/gift-claims`, data);

/** PATCH /api/v1/clients/:id/profile */
export const updateClientProfile = (clientId, data) =>
  api.patch(`/api/v1/clients/${clientId}/profile`, data);

/** GET /api/v1/clients/:id/gift-claims */
export const getGiftClaims = (clientId) =>
  api.get(`/api/v1/clients/${clientId}/gift-claims`);

/** POST /api/v1/clients/:id/concierge-requests */
export const createConciergeRequest = (clientId, data) =>
  api.post(`/api/v1/clients/${clientId}/concierge-requests`, data);

/** GET /api/v1/clients/:id/concierge-requests */
export const getConciergeRequests = (clientId) =>
  api.get(`/api/v1/clients/${clientId}/concierge-requests`);

/** PATCH /api/v1/clients/:id/concierge-requests/:requestId/respond */
export const respondToConciergeQuote = (clientId, requestId, data) =>
  api.patch(`/api/v1/clients/${clientId}/concierge-requests/${requestId}/respond`, data);

/** GET /api/v1/clients/:id/concierge-hours */
export const getConciergeHours = (clientId) =>
  api.get(`/api/v1/clients/${clientId}/concierge-hours`);

/** GET /api/v1/clients/:id/card-requests */
export const getClientCardRequests = (clientId) =>
  api.get(`/api/v1/clients/${clientId}/card-requests`);

/** POST /api/v1/clients/:id/card-requests */
export const createCardRequest = (clientId, data) =>
  api.post(`/api/v1/clients/${clientId}/card-requests`, data);

/** POST /api/v1/clients/:id/card-requests/:requestId/confirm */
export const confirmCardRequest = (clientId, requestId) =>
  api.post(`/api/v1/clients/${clientId}/card-requests/${requestId}/confirm`);

/** POST /api/v1/clients/:id/card-requests/:requestId/deny */
export const denyCardRequest = (clientId, requestId, data) =>
  api.post(`/api/v1/clients/${clientId}/card-requests/${requestId}/deny`, data);

// Community
export const getCommunityPosts = (params) =>
  api.get('/api/v1/clients/community', { params });

// Offers
/** GET /api/v1/offers */
export const getOffers = () =>
  api.get('/api/v1/offers');

/** GET /api/v1/offers/:id */
export const getOfferDetail = (offerId) =>
  api.get(`/api/v1/offers/${offerId}`);

/** POST /api/v1/offers/:id/claim */
export const claimOffer = (offerId, data = {}) =>
  api.post(`/api/v1/offers/${offerId}/claim`, data);

/** GET /api/v1/clients/:id/offer-claims */
export const getOfferClaims = (clientId) =>
  api.get(`/api/v1/clients/${clientId}/offer-claims`);

/** POST /api/v1/clients/:id/complete-setup */
export const completeSetup = (clientId, data = {}) =>
  api.post(`/api/v1/clients/${clientId}/complete-setup`, data);

/** GET /api/v1/clients/:id/beneficiary */
export const getBeneficiary = (clientId) =>
  api.get(`/api/v1/clients/${clientId}/beneficiary`);

/** PUT /api/v1/clients/:id/beneficiary */
export const saveBeneficiary = (clientId, data) =>
  api.put(`/api/v1/clients/${clientId}/beneficiary`, data);

export default api;
