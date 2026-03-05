const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

/**
 * Runs validation and returns errors if any.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    return next(new ValidationError('Validation failed', details));
  }
  next();
};

const validatePayment = [
  body('payment_amount')
    .isFloat({ gt: 0, lt: 1000000 })
    .withMessage('Payment amount must be between $0.01 and $999,999.99'),
  body('invoice_id')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Invoice ID is required'),
  handleValidationErrors
];

const validateAxisCareWebhook = [
  body('event_type')
    .equals('payment.created')
    .withMessage('Only payment.created events are supported'),
  body('client_id')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Client ID is required'),
  body('payment_amount')
    .isFloat({ gt: 0, lt: 1000000 })
    .withMessage('Payment amount must be between $0.01 and $999,999.99'),
  body('invoice_id')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Invoice ID is required'),
  handleValidationErrors
];

const validateGenericWebhook = [
  body('client_email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid client email is required'),
  body('payment_amount')
    .isFloat({ gt: 0, lt: 1000000 })
    .withMessage('Payment amount must be between $0.01 and $999,999.99'),
  body('invoice_id')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Invoice ID is required'),
  handleValidationErrors
];

const validateRedemption = [
  body('points')
    .isInt({ gt: 0 })
    .withMessage('Points must be a positive integer'),
  handleValidationErrors
];

const validateAdjustment = [
  body('points')
    .isInt()
    .withMessage('Points must be an integer'),
  body('reason')
    .isString()
    .trim()
    .isLength({ min: 10 })
    .withMessage('Reason must be at least 10 characters'),
  body('adjust_lifetime')
    .isBoolean()
    .withMessage('adjust_lifetime must be a boolean'),
  body('adjust_redeemable')
    .isBoolean()
    .withMessage('adjust_redeemable must be a boolean'),
  handleValidationErrors
];

const validateAdminLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isString()
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validateManualTransaction = [
  body('client_id')
    .isUUID()
    .withMessage('Valid client UUID is required'),
  body('invoice_id')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Invoice ID is required'),
  body('invoice_amount')
    .isFloat({ gt: 0, lt: 1000000 })
    .withMessage('Invoice amount must be between $0.01 and $999,999.99'),
  handleValidationErrors
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

const validateUUIDParam = [
  param('id')
    .isUUID()
    .withMessage('Invalid ID format'),
  handleValidationErrors
];

const validateClientLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isString()
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validateForgotPassword = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  handleValidationErrors
];

const validateResetPassword = [
  body('token')
    .isString()
    .isLength({ min: 128, max: 128 })
    .withMessage('Valid reset token is required'),
  body('password')
    .isString()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  handleValidationErrors
];

const validate2FACode = [
  body('code')
    .isString()
    .matches(/^[0-9a-zA-Z]{6,10}$/)
    .withMessage('Code must be 6-10 alphanumeric characters'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validatePayment,
  validateAxisCareWebhook,
  validateGenericWebhook,
  validateRedemption,
  validateAdjustment,
  validateAdminLogin,
  validateClientLogin,
  validateManualTransaction,
  validatePagination,
  validateUUIDParam,
  validateForgotPassword,
  validateResetPassword,
  validate2FACode
};
