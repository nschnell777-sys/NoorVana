const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { body, query } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validate');
const {
  getStatus,
  syncClients,
  syncBilling,
  syncSingleClient,
  getSyncLogs
} = require('../controllers/axisCareController');

// All AxisCare routes require admin authentication
router.use(authenticateJWT);
router.use(authorizeRoles('admin'));

// Connection status
router.get('/status', getStatus);

// Sync operations
router.post('/sync-clients', syncClients);

router.post('/sync-billing', [
  body('date_from')
    .isISO8601()
    .withMessage('date_from must be a valid date (YYYY-MM-DD)'),
  body('date_to')
    .isISO8601()
    .withMessage('date_to must be a valid date (YYYY-MM-DD)'),
  handleValidationErrors
], syncBilling);

router.post('/sync-client/:axisCareClientId', syncSingleClient);

// Sync history
router.get('/sync-logs', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('sync_type')
    .optional()
    .isIn(['clients', 'billing', 'single_client', 'single_client_billing'])
    .withMessage('Invalid sync_type'),
  handleValidationErrors
], getSyncLogs);

module.exports = router;
