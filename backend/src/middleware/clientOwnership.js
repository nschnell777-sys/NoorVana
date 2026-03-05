const { ForbiddenError } = require('../utils/errors');

/**
 * Middleware to ensure client-type users can only access their own data.
 * Admin-type users bypass this check.
 */
const requireClientOwnership = (req, res, next) => {
  if (req.user.user_type === 'admin') {
    return next();
  }

  if (req.user.user_type === 'client' && req.user.user_id === req.params.id) {
    return next();
  }

  return next(new ForbiddenError('You can only access your own data'));
};

module.exports = { requireClientOwnership };
