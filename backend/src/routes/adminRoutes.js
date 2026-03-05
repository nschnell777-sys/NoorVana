const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { adminLimiter, authLimiter } = require('../middleware/rateLimiter');
const {
  validateAdminLogin,
  validateManualTransaction,
  validateAdjustment,
  validateUUIDParam,
  validatePagination
} = require('../middleware/validate');
const { login, logout } = require('../controllers/adminAuthController');
const { listClients, getClientDetail, recordTransaction, handleAdjustPoints, updateClient, listAllTransactions, adminUnenrollClient, adminReenrollClient, adminResetClientPassword } = require('../controllers/adminController');
const { tierDistribution, monthlyStats, topClients, dashboardSummary } = require('../controllers/reportController');
const { marketAnalytics } = require('../controllers/marketController');
const { getRedemptions, processRedemption, fulfillRedemption, denyRedemption, getRedemptionStats } = require('../controllers/adminRedemptionsController');
const { getAdminGiftClaims, updateAdminGiftClaim } = require('../controllers/giftClaimsController');
const { getAdminConciergeRequests, updateAdminConciergeRequest } = require('../controllers/conciergeController');
const { getAdminCardRequests, updateAdminCardRequest } = require('../controllers/cardRequestsController');
const { getCommunityPosts, createCommunityPost, updateCommunityPost, deleteCommunityPost } = require('../controllers/communityController');
const {
  adminListOffers, adminCreateOffer, adminGetOffer, adminUpdateOffer, adminDeleteOffer,
  adminGetOfferClaims, adminUpdateClaim, adminListAllClaims, adminDrawWinners, adminManualPick
} = require('../controllers/offersController');
const upload = require('../middleware/upload');
const uploadOffers = require('../middleware/uploadOffers');

// Auth routes (no JWT required)
router.post('/auth/login', authLimiter, validateAdminLogin, login);

// All routes below require authentication
router.use(authenticateJWT);
router.use(adminLimiter);

// AxisCare integration routes (admin-only)
const axisCareRoutes = require('./axisCareRoutes');
router.use('/axiscare', axisCareRoutes);

router.post('/auth/logout', logout);

// Client management
router.get('/clients', validatePagination, listClients);
router.get('/clients/:id', validateUUIDParam, getClientDetail);
router.patch('/clients/:id', authorizeRoles('admin', 'customer_service'), validateUUIDParam, updateClient);
router.post('/clients/:id/unenroll', authorizeRoles('admin', 'customer_service'), validateUUIDParam, adminUnenrollClient);
router.post('/clients/:id/reenroll', authorizeRoles('admin', 'customer_service'), validateUUIDParam, adminReenrollClient);
router.post('/clients/:id/reset-password', authorizeRoles('admin', 'customer_service'), validateUUIDParam, adminResetClientPassword);

// Transactions and adjustments (admin and customer_service only)
router.post(
  '/transactions',
  authorizeRoles('admin', 'customer_service'),
  validateManualTransaction,
  recordTransaction
);
router.post(
  '/clients/:id/adjust',
  authorizeRoles('admin', 'customer_service'),
  validateUUIDParam,
  validateAdjustment,
  handleAdjustPoints
);

// Dashboard summary
router.get('/dashboard', dashboardSummary);

// All transactions (paginated)
router.get('/transactions', validatePagination, listAllTransactions);

// Reports
router.get('/reports/tiers', tierDistribution);
router.get('/reports/monthly-stats', monthlyStats);
router.get('/reports/top-clients', topClients);
router.get('/reports/markets', marketAnalytics);

// Redemption queue
router.get('/redemptions', getRedemptions);
router.get('/redemptions/stats', getRedemptionStats);
router.patch('/redemptions/:id/process', authorizeRoles('admin', 'customer_service'), processRedemption);
router.patch('/redemptions/:id/fulfill', authorizeRoles('admin', 'customer_service'), fulfillRedemption);
router.patch('/redemptions/:id/deny', authorizeRoles('admin', 'customer_service'), denyRedemption);

// Gift claims
router.get('/gift-claims', getAdminGiftClaims);
router.patch('/gift-claims/:id', authorizeRoles('admin', 'customer_service'), updateAdminGiftClaim);

// Concierge requests
router.get('/concierge-requests', getAdminConciergeRequests);
router.patch('/concierge-requests/:id', authorizeRoles('admin', 'customer_service'), updateAdminConciergeRequest);

// Card requests
router.get('/card-requests', getAdminCardRequests);
router.patch('/card-requests/:id', authorizeRoles('admin', 'customer_service'), updateAdminCardRequest);

// Community
router.get('/community', getCommunityPosts);
router.post('/community', authorizeRoles('admin', 'customer_service'), upload.single('media'), createCommunityPost);
router.patch('/community/:id', authorizeRoles('admin', 'customer_service'), upload.single('media'), updateCommunityPost);
router.delete('/community/:id', authorizeRoles('admin', 'customer_service'), deleteCommunityPost);

// Offers
router.get('/offers', adminListOffers);
router.post('/offers', authorizeRoles('admin', 'customer_service'), uploadOffers.single('image'), adminCreateOffer);
router.get('/offers/:id', adminGetOffer);
router.patch('/offers/:id', authorizeRoles('admin', 'customer_service'), uploadOffers.single('image'), adminUpdateOffer);
router.delete('/offers/:id', authorizeRoles('admin', 'customer_service'), adminDeleteOffer);
router.get('/offers/:id/claims', adminGetOfferClaims);
router.post('/offers/:id/draw', authorizeRoles('admin'), adminDrawWinners);
router.post('/offers/:id/manual-pick', authorizeRoles('admin'), adminManualPick);

// Offer Claims (master list)
router.get('/offer-claims', adminListAllClaims);
router.patch('/offer-claims/:id', authorizeRoles('admin', 'customer_service'), adminUpdateClaim);

module.exports = router;
