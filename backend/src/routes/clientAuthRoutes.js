const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateClientLogin, validateForgotPassword, validateResetPassword, validate2FACode } = require('../middleware/validate');
const { login, logout, register } = require('../controllers/clientAuthController');
const { forgotPassword, resetPassword, validateResetToken } = require('../controllers/passwordResetController');
const { get2FAStatus, setup2FA, confirm2FA, disable2FA, verify2FA } = require('../controllers/twoFactorController');

// Login / Register / Logout
router.post('/login', authLimiter, validateClientLogin, login);
router.post('/register', authLimiter, register);
router.post('/logout', authenticateJWT, logout);

// Password Reset (no auth required)
router.post('/forgot-password', authLimiter, validateForgotPassword, forgotPassword);
router.post('/reset-password', authLimiter, validateResetPassword, resetPassword);
router.get('/reset-password/validate', validateResetToken);

// 2FA verify during login (no full auth, uses temp_token in body)
router.post('/2fa/verify', authLimiter, verify2FA);

// 2FA management (requires authentication)
router.get('/2fa/status', authenticateJWT, get2FAStatus);
router.post('/2fa/setup', authenticateJWT, setup2FA);
router.post('/2fa/confirm', authenticateJWT, validate2FACode, confirm2FA);
router.post('/2fa/disable', authenticateJWT, validate2FACode, disable2FA);

module.exports = router;
