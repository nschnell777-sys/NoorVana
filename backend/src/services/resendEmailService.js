const { Resend } = require('resend');
const logger = require('../utils/logger');

let resend = null;

const getResend = () => {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

const FROM = () => process.env.RESEND_FROM_EMAIL || 'NoorVana Advantage <noreply@noorvana.com>';

/**
 * Send password reset email.
 * @param {object} params
 * @param {string} params.clientEmail
 * @param {string} params.clientName
 * @param {string} params.resetUrl - Full URL with token
 */
const sendPasswordResetEmail = async ({ clientEmail, clientName, resetUrl }) => {
  const client = getResend();
  if (!client) {
    logger.warn('Resend not configured — logging password reset URL', { clientEmail, resetUrl });
    return { sent: false, reason: 'resend_not_configured' };
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #2A332B; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #EFEBE4; margin: 0; font-size: 22px;">NoorVana Advantage</h1>
        <p style="color: #D4956A; margin: 4px 0 0; font-size: 14px;">Password Reset</p>
      </div>
      <div style="background: #FFFFFF; padding: 24px; border: 1px solid #E5E5E5; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #2D2D2D; font-size: 16px;">Hi ${clientName},</p>
        <p style="color: #5C6B5E;">We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #1A1A1A; color: #FFFFFF; padding: 14px 40px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #5C6B5E; font-size: 14px;">This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #E5E5E5; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">This is an automated message from NoorVana Advantage.</p>
      </div>
    </div>`;

  try {
    const { data, error } = await client.emails.send({
      from: FROM(),
      to: clientEmail,
      subject: 'Reset Your NoorVana Advantage Password',
      html,
      text: `Hi ${clientName},\n\nWe received a request to reset your password.\n\nReset your password here: ${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.`
    });

    if (error) {
      logger.error('Resend email error', { error });
      return { sent: false, reason: error.message };
    }

    logger.info('Password reset email sent', { clientEmail, messageId: data.id });
    return { sent: true, messageId: data.id };
  } catch (err) {
    logger.error('Failed to send password reset email', { clientEmail, error: err.message });
    return { sent: false, reason: err.message };
  }
};

module.exports = { sendPasswordResetEmail };
