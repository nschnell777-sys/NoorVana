const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

/**
 * Middleware to verify JWT token and attach user to request.
 */
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Reject 2FA-pending tokens from accessing protected resources
    if (decoded.purpose === '2fa_pending') {
      return next(new UnauthorizedError('Two-factor authentication not completed'));
    }

    req.user = decoded;
    next();
  } catch (err) {
    return next(new UnauthorizedError('Invalid or expired token'));
  }
};

/**
 * Middleware factory to restrict access by role.
 * @param  {...string} roles - Allowed roles
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError());
    }
    next();
  };
};

module.exports = { authenticateJWT, authorizeRoles };
