const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { requireClientOwnership } = require('../middleware/clientOwnership');
const { clientLimiter, redemptionLimiter } = require('../middleware/rateLimiter');
const { validateRedemption, validateUUIDParam, validatePagination } = require('../middleware/validate');
const {
  getLoyaltyStatus,
  handleRedeem,
  getTransactions,
  getRedemptions,
  updateProfile,
  handleUnenroll,
  completeSetup,
  getBeneficiary,
  saveBeneficiary
} = require('../controllers/clientController');
const { getTierRewards, claimTierReward } = require('../controllers/tierRewardsController');
const { createGiftClaim, getClientGiftClaims } = require('../controllers/giftClaimsController');
const { createConciergeRequest, getClientConciergeRequests, getConciergeHours, respondToConciergeQuote } = require('../controllers/conciergeController');
const { createCardRequest, getClientCardRequests, clientConfirmCardRequest, clientDenyCardRequest } = require('../controllers/cardRequestsController');
const { getCommunityPosts } = require('../controllers/communityController');
const { clientListOffers, clientGetOffer, clientClaimOffer, clientGetOfferClaims } = require('../controllers/offersController');

router.use(authenticateJWT);
router.use(clientLimiter);

router.get('/:id/loyalty', validateUUIDParam, requireClientOwnership, getLoyaltyStatus);
router.post('/:id/redeem', validateUUIDParam, requireClientOwnership, redemptionLimiter, validateRedemption, handleRedeem);
router.get('/:id/transactions', validateUUIDParam, requireClientOwnership, validatePagination, getTransactions);
router.get('/:id/redemptions', validateUUIDParam, requireClientOwnership, validatePagination, getRedemptions);
router.patch('/:id/profile', validateUUIDParam, requireClientOwnership, updateProfile);
router.post('/:id/unenroll', validateUUIDParam, requireClientOwnership, handleUnenroll);
router.post('/:id/complete-setup', validateUUIDParam, requireClientOwnership, completeSetup);
router.get('/:id/beneficiary', validateUUIDParam, requireClientOwnership, getBeneficiary);
router.put('/:id/beneficiary', validateUUIDParam, requireClientOwnership, saveBeneficiary);
router.get('/:id/tier-rewards', validateUUIDParam, requireClientOwnership, getTierRewards);
router.post('/:id/tier-rewards/:rewardId/claim', validateUUIDParam, requireClientOwnership, claimTierReward);

// Gift claims
router.post('/:id/gift-claims', validateUUIDParam, requireClientOwnership, createGiftClaim);
router.get('/:id/gift-claims', validateUUIDParam, requireClientOwnership, getClientGiftClaims);

// Concierge
router.post('/:id/concierge-requests', validateUUIDParam, requireClientOwnership, createConciergeRequest);
router.get('/:id/concierge-requests', validateUUIDParam, requireClientOwnership, getClientConciergeRequests);
router.patch('/:id/concierge-requests/:requestId/respond', validateUUIDParam, requireClientOwnership, respondToConciergeQuote);
router.get('/:id/concierge-hours', validateUUIDParam, requireClientOwnership, getConciergeHours);

// Card requests
router.get('/:id/card-requests', validateUUIDParam, requireClientOwnership, getClientCardRequests);
router.post('/:id/card-requests', validateUUIDParam, requireClientOwnership, createCardRequest);
router.post('/:id/card-requests/:requestId/confirm', validateUUIDParam, requireClientOwnership, clientConfirmCardRequest);
router.post('/:id/card-requests/:requestId/deny', validateUUIDParam, requireClientOwnership, clientDenyCardRequest);

// Community (public feed — no ownership check needed)
router.get('/community', getCommunityPosts);

// Offer claims (per client)
router.get('/:id/offer-claims', validateUUIDParam, requireClientOwnership, clientGetOfferClaims);

module.exports = router;
