const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Client = require('../models/Client');
const { InvalidCredentialsError, UnauthorizedError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * POST /api/v1/clients/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const client = await Client.findByEmail(email);
    if (!client) {
      throw new InvalidCredentialsError();
    }

    if (!client.password_hash) {
      throw new UnauthorizedError('Account not set up for portal access. Please contact support.');
    }

    const isMatch = await bcrypt.compare(password, client.password_hash);
    if (!isMatch) {
      throw new InvalidCredentialsError();
    }

    // Check if 2FA is enabled
    if (client.two_factor_enabled) {
      const tempToken = jwt.sign(
        {
          user_id: client.id,
          user_type: 'client',
          email: client.email,
          purpose: '2fa_pending'
        },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );

      logger.info('2FA required for login', { clientId: client.id });

      return res.json({
        requires_2fa: true,
        temp_token: tempToken
      });
    }

    const token = jwt.sign(
      {
        user_id: client.id,
        user_type: 'client',
        email: client.email
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '2h' }
    );

    logger.info('Client login successful', { clientId: client.id });

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

/**
 * POST /api/v1/clients/auth/logout
 */
const logout = async (req, res) => {
  res.json({ message: 'Logged out successfully' });
};

/**
 * POST /api/v1/clients/auth/register
 * Allows existing clients (no password yet) to set up portal credentials.
 */
const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Email and password are required' } });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters' } });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: { code: 'WEAK_PASSWORD', message: 'Password must contain at least one uppercase letter' } });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: { code: 'WEAK_PASSWORD', message: 'Password must contain at least one number' } });
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return res.status(400).json({ error: { code: 'WEAK_PASSWORD', message: 'Password must contain at least one special character' } });
    }

    const client = await Client.findByEmail(email);
    if (!client) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No account found with this email. Please contact NoorVana to get started.' } });
    }

    if (client.password_hash) {
      return res.status(400).json({ error: { code: 'ALREADY_REGISTERED', message: 'This account is already set up. Please log in instead.' } });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await Client.updateProfile(client.id, {});
    const db = require('../db');
    await db('clients').where({ id: client.id }).update({ password_hash: passwordHash });

    const token = jwt.sign(
      { user_id: client.id, user_type: 'client', email: client.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '2h' }
    );

    logger.info('Client registered', { clientId: client.id });

    res.status(201).json({
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
        setup_completed: false
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, logout, register };
