const db = require('../db');
const crypto = require('crypto');

const PasswordResetToken = {
  /**
   * Create a new password reset token for a client.
   * Invalidates any existing tokens for this client.
   * @param {string} clientId
   * @returns {Promise<{ token: string, expiresAt: Date }>}
   */
  async create(clientId) {
    // Invalidate existing tokens for this client
    await db('password_reset_tokens')
      .where({ client_id: clientId, used: false })
      .update({ used: true });

    // Generate cryptographically secure token
    const rawToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db('password_reset_tokens').insert({
      client_id: clientId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString()
    });

    return { token: rawToken, expiresAt };
  },

  /**
   * Find a valid (unused, not expired) token by raw token string.
   * @param {string} rawToken
   * @returns {Promise<object|undefined>}
   */
  async findValid(rawToken) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const now = new Date().toISOString();

    return db('password_reset_tokens')
      .where({ token_hash: tokenHash, used: false })
      .where('expires_at', '>', now)
      .first();
  },

  /**
   * Mark a token as used.
   * @param {string} id
   */
  async markUsed(id) {
    await db('password_reset_tokens')
      .where({ id })
      .update({ used: true });
  }
};

module.exports = PasswordResetToken;
