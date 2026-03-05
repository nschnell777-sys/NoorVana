const crypto = require('crypto');
const { WebhookSignatureError } = require('../utils/errors');

/**
 * Verifies HMAC-SHA256 webhook signature.
 * @param {string} secret - The shared secret
 * @param {string} headerName - The header containing the signature
 */
const verifySignature = (secret, headerName) => {
  return (req, res, next) => {
    const signature = req.headers[headerName.toLowerCase()];
    if (!signature) {
      return next(new WebhookSignatureError());
    }

    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return next(new WebhookSignatureError());
    }

    next();
  };
};

/**
 * Middleware to verify AxisCare webhook signature.
 */
const verifyAxisCareSignature = (req, res, next) => {
  const secret = process.env.AXISCARE_WEBHOOK_SECRET;
  if (!secret) {
    return next(new Error('AXISCARE_WEBHOOK_SECRET not configured'));
  }
  return verifySignature(secret, 'x-axiscare-signature')(req, res, next);
};

/**
 * Middleware to verify generic webhook signature.
 */
const verifyGenericSignature = (req, res, next) => {
  const secret = process.env.GENERIC_WEBHOOK_SECRET;
  if (!secret) {
    return next(new Error('GENERIC_WEBHOOK_SECRET not configured'));
  }
  return verifySignature(secret, 'x-webhook-signature')(req, res, next);
};

module.exports = { verifyAxisCareSignature, verifyGenericSignature, verifySignature };
