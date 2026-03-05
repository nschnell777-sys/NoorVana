const jwt = require('jsonwebtoken');
const Client = require('../models/Client');
const { generateSetup, verifyCode, generateRecoveryCodes, verifyRecoveryCode } = require('../services/totpService');
const { InvalidTwoFactorCodeError, UnauthorizedError, ClientNotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * GET /api/v1/clients/auth/2fa/status
 * Check if 2FA is enabled for the authenticated client.
 */
const get2FAStatus = async (req, res, next) => {
  try {
    const client = await Client.findById(req.user.user_id);
    if (!client) throw new ClientNotFoundError(req.user.user_id);

    res.json({ two_factor_enabled: !!client.two_factor_enabled });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/clients/auth/2fa/setup
 * Start 2FA setup — generates TOTP secret and returns QR code.
 */
const setup2FA = async (req, res, next) => {
  try {
    const client = await Client.findById(req.user.user_id);
    if (!client) throw new ClientNotFoundError(req.user.user_id);

    if (client.two_factor_enabled) {
      return res.status(400).json({ error: { code: 'ALREADY_ENABLED', message: '2FA is already enabled. Disable it first to set up again.' } });
    }

    const { secret, qrCodeDataUrl } = await generateSetup(client.email);

    // Store secret temporarily (not enabled yet until confirmed)
    const db = require('../db');
    await db('clients').where({ id: client.id }).update({
      two_factor_secret: secret,
      updated_at: new Date().toISOString()
    });

    logger.info('2FA setup initiated', { clientId: client.id });

    res.json({
      qr_code: qrCodeDataUrl,
      secret
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/clients/auth/2fa/confirm
 * Confirm 2FA setup by verifying a TOTP code. Returns recovery codes.
 */
const confirm2FA = async (req, res, next) => {
  try {
    const { code } = req.body;
    const client = await Client.findById(req.user.user_id);
    if (!client) throw new ClientNotFoundError(req.user.user_id);

    if (!client.two_factor_secret) {
      return res.status(400).json({ error: { code: 'SETUP_REQUIRED', message: 'Please start 2FA setup first.' } });
    }

    if (client.two_factor_enabled) {
      return res.status(400).json({ error: { code: 'ALREADY_ENABLED', message: '2FA is already enabled.' } });
    }

    const isValid = verifyCode(code, client.two_factor_secret);
    if (!isValid) throw new InvalidTwoFactorCodeError();

    // Generate recovery codes
    const { plainCodes, hashedCodes } = await generateRecoveryCodes();

    const db = require('../db');
    await db('clients').where({ id: client.id }).update({
      two_factor_enabled: true,
      two_factor_recovery_codes: JSON.stringify(hashedCodes),
      two_factor_enabled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    logger.info('2FA enabled', { clientId: client.id });

    res.json({
      message: 'Two-factor authentication enabled successfully.',
      recovery_codes: plainCodes
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/clients/auth/2fa/disable
 * Disable 2FA — requires a valid TOTP code.
 */
const disable2FA = async (req, res, next) => {
  try {
    const { code } = req.body;
    const client = await Client.findById(req.user.user_id);
    if (!client) throw new ClientNotFoundError(req.user.user_id);

    if (!client.two_factor_enabled) {
      return res.status(400).json({ error: { code: 'NOT_ENABLED', message: '2FA is not enabled.' } });
    }

    const isValid = verifyCode(code, client.two_factor_secret);
    if (!isValid) throw new InvalidTwoFactorCodeError();

    const db = require('../db');
    await db('clients').where({ id: client.id }).update({
      two_factor_enabled: false,
      two_factor_secret: null,
      two_factor_recovery_codes: null,
      two_factor_enabled_at: null,
      updated_at: new Date().toISOString()
    });

    logger.info('2FA disabled', { clientId: client.id });

    res.json({ message: 'Two-factor authentication disabled.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/clients/auth/2fa/verify
 * Verify TOTP code during login flow. Accepts temp_token + code.
 */
const verify2FA = async (req, res, next) => {
  try {
    const { temp_token, code } = req.body;

    if (!temp_token || !code) {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Temporary token and code are required.' } });
    }

    // Verify temp token
    let decoded;
    try {
      decoded = jwt.verify(temp_token, process.env.JWT_SECRET);
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired verification token. Please log in again.');
    }

    if (decoded.purpose !== '2fa_pending') {
      throw new UnauthorizedError('Invalid token type.');
    }

    const client = await Client.findById(decoded.user_id);
    if (!client) throw new ClientNotFoundError(decoded.user_id);

    if (!client.two_factor_enabled || !client.two_factor_secret) {
      throw new UnauthorizedError('Two-factor authentication is not configured.');
    }

    // Try TOTP code first
    let verified = verifyCode(code, client.two_factor_secret);

    // If TOTP fails, try recovery code
    if (!verified && client.two_factor_recovery_codes) {
      const hashedCodes = JSON.parse(client.two_factor_recovery_codes);
      const result = await verifyRecoveryCode(code, hashedCodes);
      if (result.valid) {
        verified = true;
        // Update remaining recovery codes
        const db = require('../db');
        await db('clients').where({ id: client.id }).update({
          two_factor_recovery_codes: JSON.stringify(result.remainingCodes),
          updated_at: new Date().toISOString()
        });
        logger.info('2FA recovery code used', { clientId: client.id, remainingCodes: result.remainingCodes.length });
      }
    }

    if (!verified) {
      throw new InvalidTwoFactorCodeError();
    }

    // Issue real JWT
    const token = jwt.sign(
      {
        user_id: client.id,
        user_type: 'client',
        email: client.email
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '2h' }
    );

    logger.info('2FA verification successful', { clientId: client.id });

    res.json({
      token,
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone || null,
        current_tier: client.current_tier,
        care_package: client.care_package,
        lifetime_points: client.lifetime_points || 0,
        redeemable_points: client.redeemable_points || 0,
        market: client.market || null,
        address_street: client.address_street || null,
        address_apt: client.address_apt || null,
        address_city: client.address_city || null,
        address_state: client.address_state || null,
        address_zip: client.address_zip || null,
        is_active: !!client.is_active,
        unenrolled_at: client.unenrolled_at || null,
        setup_completed: !!client.setup_completed
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { get2FAStatus, setup2FA, confirm2FA, disable2FA, verify2FA };
