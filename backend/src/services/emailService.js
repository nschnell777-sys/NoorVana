const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const db = require('../db');

let transporter = null;

/**
 * Lazily create the SMTP transporter. Returns null if SMTP is not configured.
 */
const getTransporter = () => {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
};

const FROM_ADDRESS = () => process.env.SMTP_FROM || 'noreply@noorvana.com';
const BOUNDLESS_EMAIL = () => process.env.BOUNDLESS_EMAIL || 'orders@boundlesscollection.com';

/**
 * Send email to Boundless Collection to fulfill a tier gift claim.
 * Called when admin sets gift claim status to "processing".
 * Non-blocking: logs errors but does not throw.
 */
const sendBoundlessGiftEmail = async ({ clientName, clientEmail, clientPhone, clientAddress, tier, giftName, claimId }) => {
  const transport = getTransporter();
  if (!transport) {
    logger.warn('SMTP not configured — skipping Boundless gift email', { claimId });
    return { sent: false, reason: 'smtp_not_configured' };
  }

  const addressBlock = clientAddress
    ? clientAddress.replace(/\n/g, '<br>')
    : '<strong style="color:#C1592E;">ADDRESS NOT ON FILE — please contact client</strong>';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #2A332B; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #EFEBE4; margin: 0; font-size: 22px;">NoorVana Advantage</h1>
        <p style="color: #D4956A; margin: 4px 0 0; font-size: 14px;">Gift Fulfillment Request</p>
      </div>
      <div style="background: #FFFFFF; padding: 24px; border: 1px solid #E5E5E5; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #2D2D2D; margin-top: 0;">New Gift Order</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr><td style="padding: 8px 0; color: #5C6B5E; width: 140px;">Gift</td><td style="padding: 8px 0; font-weight: 600;">${giftName}</td></tr>
          <tr><td style="padding: 8px 0; color: #5C6B5E;">Tier</td><td style="padding: 8px 0; font-weight: 600; text-transform: capitalize;">${tier}</td></tr>
          <tr><td style="padding: 8px 0; color: #5C6B5E;">Claim Reference</td><td style="padding: 8px 0; font-family: monospace;">${claimId}</td></tr>
        </table>
        <h3 style="color: #2D2D2D; border-bottom: 1px solid #E5E5E5; padding-bottom: 8px;">Ship To</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #5C6B5E; width: 140px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${clientName}</td></tr>
          <tr><td style="padding: 8px 0; color: #5C6B5E;">Email</td><td style="padding: 8px 0;">${clientEmail}</td></tr>
          <tr><td style="padding: 8px 0; color: #5C6B5E;">Phone</td><td style="padding: 8px 0;">${clientPhone || 'Not on file'}</td></tr>
          <tr><td style="padding: 8px 0; color: #5C6B5E; vertical-align: top;">Address</td><td style="padding: 8px 0;">${addressBlock}</td></tr>
        </table>
      </div>
    </div>`;

  try {
    const info = await transport.sendMail({
      from: FROM_ADDRESS(),
      to: BOUNDLESS_EMAIL(),
      subject: `NoorVana Gift Fulfillment — ${giftName} for ${clientName}`,
      html,
      text: `Gift Fulfillment Request\n\nGift: ${giftName}\nTier: ${tier}\nClaim Ref: ${claimId}\n\nShip To:\nName: ${clientName}\nEmail: ${clientEmail}\nPhone: ${clientPhone || 'Not on file'}\nAddress: ${clientAddress || 'NOT ON FILE'}`
    });
    logger.info('Boundless gift email sent', { claimId, messageId: info.messageId });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    logger.error('Failed to send Boundless gift email', { claimId, error: err.message });
    return { sent: false, reason: err.message };
  }
};

/**
 * Send gift card code email to a client.
 * Called when admin fulfills a gift card redemption.
 * Non-blocking: logs errors but does not throw.
 */
const sendGiftCardEmail = async ({ clientName, clientEmail, rewardName, giftCardCode, creditAmount, voucherCode, redemptionId }) => {
  const transport = getTransporter();
  if (!transport) {
    logger.warn('SMTP not configured — skipping gift card email', { redemptionId });
    return { sent: false, reason: 'smtp_not_configured' };
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #2A332B; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #EFEBE4; margin: 0; font-size: 22px;">NoorVana Advantage</h1>
        <p style="color: #D4956A; margin: 4px 0 0; font-size: 14px;">Your Reward is Ready!</p>
      </div>
      <div style="background: #FFFFFF; padding: 24px; border: 1px solid #E5E5E5; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #2D2D2D; font-size: 16px;">Hi ${clientName},</p>
        <p style="color: #5C6B5E;">Your ${rewardName || 'gift card'} reward has been fulfilled. Here is your gift card code:</p>
        <div style="background: #F5F3EF; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <p style="color: #5C6B5E; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">Your Gift Card Code</p>
          <p style="font-family: monospace; font-size: 28px; font-weight: 700; color: #2A332B; letter-spacing: 3px; margin: 0;">${giftCardCode}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr><td style="padding: 8px 0; color: #5C6B5E;">Reward</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${rewardName || 'Gift Card'}</td></tr>
          <tr><td style="padding: 8px 0; color: #5C6B5E;">Value</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">$${parseFloat(creditAmount).toFixed(2)}</td></tr>
          <tr><td style="padding: 8px 0; color: #5C6B5E;">Reference</td><td style="padding: 8px 0; text-align: right; font-family: monospace;">${voucherCode}</td></tr>
        </table>
        <p style="color: #5C6B5E; font-size: 14px;">Thank you for being a valued NoorVana Advantage member!</p>
        <hr style="border: none; border-top: 1px solid #E5E5E5; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">This is an automated message from NoorVana Advantage. If you have questions, please contact your NoorVana care team.</p>
      </div>
    </div>`;

  try {
    const info = await transport.sendMail({
      from: FROM_ADDRESS(),
      to: clientEmail,
      subject: `Your NoorVana Gift Card is Ready! (Ref: ${voucherCode})`,
      html,
      text: `Hi ${clientName},\n\nYour ${rewardName || 'gift card'} reward has been fulfilled.\n\nGift Card Code: ${giftCardCode}\nValue: $${parseFloat(creditAmount).toFixed(2)}\nReference: ${voucherCode}\n\nThank you for being a valued NoorVana Advantage member!`
    });
    logger.info('Gift card email sent to client', { redemptionId, messageId: info.messageId });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    logger.error('Failed to send gift card email', { redemptionId, error: err.message });
    return { sent: false, reason: err.message };
  }
};

/**
 * Create a message record in the messages table for a client.
 * Used to log email communications so they appear in the client's Messages page.
 */
const createMessageForClient = async (clientId, body) => {
  try {
    await db('messages').insert({
      client_id: clientId,
      sender_type: 'system',
      sender_id: clientId, // system messages use client_id as sender_id
      sender_name: 'NoorVana Advantage',
      body
    });
  } catch (err) {
    logger.error('Failed to create message record', { clientId, error: err.message });
  }
};

module.exports = { sendBoundlessGiftEmail, sendGiftCardEmail, createMessageForClient, getTransporter };
