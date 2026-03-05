const express = require('express');
const router = express.Router();
const { verifyAxisCareSignature, verifyGenericSignature } = require('../middleware/webhookAuth');
const { webhookLimiter } = require('../middleware/rateLimiter');
const { validateAxisCareWebhook, validateGenericWebhook } = require('../middleware/validate');
const { handleAxisCarePayment, handleGenericPayment } = require('../controllers/webhookController');

router.use(webhookLimiter);

router.post(
  '/axiscare/payment',
  verifyAxisCareSignature,
  validateAxisCareWebhook,
  handleAxisCarePayment
);

router.post(
  '/generic/payment',
  verifyGenericSignature,
  validateGenericWebhook,
  handleGenericPayment
);

module.exports = router;
