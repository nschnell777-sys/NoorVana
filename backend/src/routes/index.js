const express = require('express');
const router = express.Router();
const clientAuthRoutes = require('./clientAuthRoutes');
const clientRoutes = require('./clientRoutes');
const adminRoutes = require('./adminRoutes');
const webhookRoutes = require('./webhookRoutes');
const { getRewardsCatalog } = require('../controllers/rewardsCatalogController');
const { clientListOffers, clientGetOffer, clientClaimOffer } = require('../controllers/offersController');
const { authenticateJWT } = require('../middleware/auth');

router.use('/api/v1/clients/auth', clientAuthRoutes);
router.use('/api/v1/clients', clientRoutes);
router.use('/api/v1/admin', adminRoutes);
router.use('/webhook', webhookRoutes);

// Rewards catalog (authenticated)
router.get('/api/v1/rewards-catalog', authenticateJWT, getRewardsCatalog);

// Offers (authenticated)
router.get('/api/v1/offers', authenticateJWT, clientListOffers);
router.get('/api/v1/offers/:id', authenticateJWT, clientGetOffer);
router.post('/api/v1/offers/:id/claim', authenticateJWT, clientClaimOffer);

module.exports = router;
