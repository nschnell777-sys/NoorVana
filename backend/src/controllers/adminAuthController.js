const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const AdminUser = require('../models/AdminUser');
const { InvalidCredentialsError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * POST /api/v1/admin/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const admin = await AdminUser.findByEmail(email);
    if (!admin) {
      throw new InvalidCredentialsError();
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      throw new InvalidCredentialsError();
    }

    const token = jwt.sign(
      {
        user_id: admin.id,
        user_type: 'admin',
        role: admin.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '2h' }
    );

    await AdminUser.updateLastLogin(admin.id);

    logger.info('Admin login successful', { adminId: admin.id, role: admin.role });

    res.json({
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/auth/logout
 */
const logout = async (req, res) => {
  // JWT is stateless — client should discard the token.
  // If token blacklisting is needed later, add it here.
  res.json({ message: 'Logged out successfully' });
};

module.exports = { login, logout };
