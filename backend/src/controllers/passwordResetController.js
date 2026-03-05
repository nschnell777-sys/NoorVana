const bcrypt = require('bcryptjs');
const Client = require('../models/Client');
const PasswordResetToken = require('../models/PasswordResetToken');
const { sendPasswordResetEmail } = require('../services/resendEmailService');
const { InvalidResetTokenError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * POST /api/v1/clients/auth/forgot-password
 * Request a password reset email. Always returns success to prevent email enumeration.
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const client = await Client.findByEmail(email);

    if (client && client.password_hash) {
      const { token } = await PasswordResetToken.create(client.id);
      const portalUrl = process.env.CLIENT_PORTAL_URL || 'http://localhost:3002';
      const resetUrl = `${portalUrl}/reset-password?token=${token}`;

      await sendPasswordResetEmail({
        clientEmail: client.email,
        clientName: client.name,
        resetUrl
      });
    }

    // Always return success — prevents email enumeration
    res.json({
      message: 'If an account exists with that email, a password reset link has been sent. Please check your inbox.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/clients/auth/reset-password
 * Reset password using a token from the email link.
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    // Validate token
    const resetRecord = await PasswordResetToken.findValid(token);
    if (!resetRecord) throw new InvalidResetTokenError();

    // Validate password rules
    if (password.length < 8) {
      return res.status(400).json({ error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters.' } });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: { code: 'WEAK_PASSWORD', message: 'Password must contain at least one uppercase letter.' } });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: { code: 'WEAK_PASSWORD', message: 'Password must contain at least one number.' } });
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return res.status(400).json({ error: { code: 'WEAK_PASSWORD', message: 'Password must contain at least one special character.' } });
    }

    // Hash new password and update
    const passwordHash = await bcrypt.hash(password, 12);
    const db = require('../db');
    await db('clients').where({ id: resetRecord.client_id }).update({
      password_hash: passwordHash,
      updated_at: new Date().toISOString()
    });

    // Mark token as used
    await PasswordResetToken.markUsed(resetRecord.id);

    logger.info('Password reset successful', { clientId: resetRecord.client_id });

    res.json({ message: 'Password has been reset successfully. You can now sign in with your new password.' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/clients/auth/reset-password/validate
 * Check if a reset token is valid (for frontend UX).
 */
const validateResetToken = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.json({ valid: false });
    }

    const resetRecord = await PasswordResetToken.findValid(token);
    res.json({ valid: !!resetRecord });
  } catch (err) {
    next(err);
  }
};

module.exports = { forgotPassword, resetPassword, validateResetToken };
