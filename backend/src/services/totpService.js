const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const ISSUER = () => process.env.TOTP_ISSUER || 'NoorVana Advantage';
const RECOVERY_CODE_COUNT = 8;

/**
 * Generate a new TOTP secret and QR code data URL.
 * @param {string} email - Client's email (used as TOTP account name)
 * @returns {Promise<{ secret: string, qrCodeDataUrl: string, otpauthUrl: string }>}
 */
const generateSetup = async (email) => {
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(email, ISSUER(), secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  return { secret, qrCodeDataUrl, otpauthUrl };
};

/**
 * Verify a TOTP code against a secret.
 * @param {string} code - 6-digit code from authenticator app
 * @param {string} secret - Base32 TOTP secret
 * @returns {boolean}
 */
const verifyCode = (code, secret) => {
  return authenticator.check(code, secret);
};

/**
 * Generate a set of one-time recovery codes.
 * @returns {Promise<{ plainCodes: string[], hashedCodes: string[] }>}
 */
const generateRecoveryCodes = async () => {
  const plainCodes = [];
  const hashedCodes = [];

  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    const code = crypto.randomBytes(5).toString('hex');
    plainCodes.push(code);
    const hash = await bcrypt.hash(code, 10);
    hashedCodes.push(hash);
  }

  return { plainCodes, hashedCodes };
};

/**
 * Check a recovery code against stored hashed codes.
 * If valid, removes the used code from the array.
 * @param {string} code - Plain recovery code entered by user
 * @param {string[]} hashedCodes - Array of bcrypt hashes
 * @returns {Promise<{ valid: boolean, remainingCodes: string[] }>}
 */
const verifyRecoveryCode = async (code, hashedCodes) => {
  for (let i = 0; i < hashedCodes.length; i++) {
    const match = await bcrypt.compare(code, hashedCodes[i]);
    if (match) {
      const remainingCodes = [...hashedCodes];
      remainingCodes.splice(i, 1);
      return { valid: true, remainingCodes };
    }
  }
  return { valid: false, remainingCodes: hashedCodes };
};

module.exports = { generateSetup, verifyCode, generateRecoveryCodes, verifyRecoveryCode };
