const { TIER_ORDER } = require('../constants/loyalty');
const Client = require('../models/Client');
const PointsTransaction = require('../models/PointsTransaction');
const RedemptionHistory = require('../models/RedemptionHistory');
const db = require('../db');
const { ClientNotFoundError, InsufficientPointsError, AppError } = require('../utils/errors');
const logger = require('../utils/logger');

/** Flat redemption rate: 1,000 points = $5.00 */
const POINTS_PER_DOLLAR_UNIT = 1000;
const DOLLARS_PER_UNIT = 5;

/**
 * Generates a unique voucher code in format NV-XXXXXX.
 * @returns {Promise<string>}
 */
const generateVoucherCode = async () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let attempts = 0;
  while (attempts < 10) {
    let code = 'NV-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await RedemptionHistory.findByVoucherCode(code);
    if (!existing) return code;
    attempts++;
  }
  throw new Error('Failed to generate unique voucher code after 10 attempts');
};

/**
 * Redeems points for a client. Supports both legacy and rewards-store redemptions.
 * Flat rate: 1,000 points = $5.00
 * @param {string} clientId
 * @param {number} pointsToRedeem - Must be a multiple of 1,000
 * @param {object} [options] - Optional reward details
 * @param {string} [options.reward_id]
 * @param {string} [options.reward_name]
 * @param {string} [options.reward_category]
 * @param {string} [options.delivery_method]
 * @returns {Promise<object>}
 */
const redeemPoints = async (clientId, pointsToRedeem, options = {}) => {
  if (pointsToRedeem <= 0 || pointsToRedeem % POINTS_PER_DOLLAR_UNIT !== 0) {
    throw new AppError(
      'INVALID_REDEMPTION_AMOUNT',
      `Points must be a positive multiple of ${POINTS_PER_DOLLAR_UNIT} (minimum redemption unit)`,
      400,
      { requested_points: pointsToRedeem }
    );
  }

  // Max single redemption: 100,000 points ($500)
  if (pointsToRedeem > 100000) {
    throw new AppError(
      'EXCEEDS_MAX_REDEMPTION',
      'Maximum single redemption is 100,000 points ($500)',
      400,
      { requested_points: pointsToRedeem, max_points: 100000 }
    );
  }

  const client = await Client.findById(clientId);
  if (!client) {
    throw new ClientNotFoundError(clientId);
  }

  // Bronze cannot redeem
  const tierIndex = TIER_ORDER.indexOf(client.current_tier);
  if (tierIndex < 1) {
    throw new AppError('TIER_TOO_LOW', 'You must be Silver tier or above to redeem points', 403);
  }

  if (client.redeemable_points < pointsToRedeem) {
    throw new InsufficientPointsError(client.redeemable_points, pointsToRedeem);
  }

  const creditAmount = (pointsToRedeem / POINTS_PER_DOLLAR_UNIT) * DOLLARS_PER_UNIT;
  const voucherCode = await generateVoucherCode();

  // Deduct from redeemable only (lifetime unchanged)
  const updatedClient = await Client.updatePoints(client.id, 0, -pointsToRedeem);

  // Track held points for pending redemptions
  await Client.updateHeldPoints(client.id, pointsToRedeem);

  // Create redemption record — all redemptions start as 'pending' for admin review
  const redemptionData = {
    client_id: client.id,
    points_redeemed: pointsToRedeem,
    credit_amount: creditAmount,
    voucher_code: voucherCode,
    status: 'pending',
    delivery_status: 'pending'
  };

  if (options.reward_id) redemptionData.reward_id = options.reward_id;
  if (options.reward_name) redemptionData.reward_name = options.reward_name;
  if (options.reward_category) redemptionData.reward_category = options.reward_category;
  if (options.delivery_method) redemptionData.delivery_method = options.delivery_method;

  const redemption = await RedemptionHistory.create(redemptionData);

  // Create transaction record
  const description = options.reward_name
    ? `Redeemed ${pointsToRedeem.toLocaleString()} points for ${options.reward_name} ($${creditAmount.toFixed(2)})`
    : `Redeemed ${pointsToRedeem.toLocaleString()} points for $${creditAmount.toFixed(2)} credit (${voucherCode})`;

  await PointsTransaction.create({
    client_id: client.id,
    transaction_type: 'redeem',
    source: 'manual',
    lifetime_points_change: 0,
    redeemable_points_change: -pointsToRedeem,
    tier_at_transaction: client.current_tier,
    description
  });

  logger.info('Points redeemed', {
    clientId: client.id,
    pointsRedeemed: pointsToRedeem,
    creditAmount,
    voucherCode,
    rewardName: options.reward_name
  });

  return {
    redemption_id: redemption.id,
    points_redeemed: pointsToRedeem,
    credit_amount: creditAmount,
    voucher_code: voucherCode,
    remaining_redeemable_points: updatedClient.redeemable_points,
    redeemed_at: redemption.redeemed_at,
    reward_name: options.reward_name || null,
    reward_category: options.reward_category || null,
    delivery_method: options.delivery_method || null
  };
};

module.exports = {
  redeemPoints,
  generateVoucherCode
};
