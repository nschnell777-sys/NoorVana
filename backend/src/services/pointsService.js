const { TIER_MULTIPLIERS } = require('../constants/loyalty');
const Client = require('../models/Client');
const PointsTransaction = require('../models/PointsTransaction');
const { checkAndUpgradeTier, checkAndDowngradeTier } = require('./tierService');
const logger = require('../utils/logger');
const { AppError, DuplicateInvoiceError, ClientNotFoundError } = require('../utils/errors');

/**
 * Calculates points earned for a payment at a given tier.
 * @param {number} paymentAmount
 * @param {string} tier
 * @returns {number} Points earned (integer, floored)
 */
const calculatePoints = (paymentAmount, tier) => {
  const multiplier = TIER_MULTIPLIERS[tier];
  return Math.floor(paymentAmount * multiplier);
};

/**
 * Awards points for a payment, updates both buckets, checks for tier upgrade.
 * @param {object} params
 * @param {string} params.clientId - Client UUID
 * @param {number} params.paymentAmount
 * @param {string} params.source - 'axiscare', 'quickbooks', 'manual', 'other'
 * @param {string} params.invoiceId
 * @param {string} [params.description]
 * @param {string} [params.paymentDate] - ISO date of the original payment (from webhook)
 * @param {string} [params.createdBy] - Admin user ID for manual entries
 * @returns {Promise<object>} Transaction result
 */
const awardPoints = async ({ clientId, paymentAmount, source, invoiceId, description, paymentDate, createdBy }) => {
  // Idempotency check
  if (invoiceId) {
    const existing = await PointsTransaction.findByInvoiceId(invoiceId);
    if (existing) {
      logger.info('Duplicate invoice skipped', { invoiceId, clientId });
      throw new DuplicateInvoiceError(invoiceId);
    }
  }

  const client = await Client.findById(clientId);
  if (!client) {
    throw new ClientNotFoundError(clientId);
  }

  if (!client.is_active) {
    throw new AppError('CLIENT_UNENROLLED', 'Cannot award points to an unenrolled client', 400);
  }

  // Reject invoices from an inactive period.
  // If client was re-enrolled, any payment dated before the re-enrollment is rejected
  // to prevent backfilling points from when the account was not active.
  if (client.reenrolled_at && paymentDate) {
    const payDate = new Date(paymentDate);
    const reenrollDate = new Date(client.reenrolled_at);
    if (payDate < reenrollDate) {
      logger.warn('Invoice rejected — payment date falls before re-enrollment', {
        clientId, invoiceId, paymentDate, reenrolledAt: client.reenrolled_at
      });
      throw new AppError(
        'INVOICE_FROM_INACTIVE_PERIOD',
        `Invoice rejected: payment date ${paymentDate} is before re-enrollment date. Invoices from inactive periods are not processed.`,
        400
      );
    }
  }

  const pointsEarned = calculatePoints(paymentAmount, client.current_tier);
  const multiplier = TIER_MULTIPLIERS[client.current_tier];

  // Update both point buckets
  const updatedClient = await Client.updatePoints(client.id, pointsEarned, pointsEarned);

  // Create transaction record
  const transaction = await PointsTransaction.create({
    client_id: client.id,
    transaction_type: 'earn',
    source,
    invoice_id: invoiceId,
    invoice_amount: paymentAmount,
    lifetime_points_change: pointsEarned,
    redeemable_points_change: pointsEarned,
    tier_at_transaction: client.current_tier,
    multiplier_applied: multiplier,
    description: description || `Payment of $${paymentAmount} via ${source}`,
    created_by: createdBy || null
  });

  // Check for tier upgrade
  const { upgraded, newTier } = await checkAndUpgradeTier(updatedClient);

  logger.info('Points awarded', {
    clientId: client.id,
    pointsEarned,
    source,
    invoiceId,
    tierUpgraded: upgraded
  });

  return {
    transaction_id: transaction.id,
    points_earned: pointsEarned,
    lifetime_points: updatedClient.lifetime_points,
    redeemable_points: updatedClient.redeemable_points,
    current_tier: upgraded ? newTier : client.current_tier,
    tier_upgraded: upgraded,
    new_tier: upgraded ? newTier : null,
    multiplier_applied: multiplier,
    source
  };
};

/**
 * Adjusts points for a client (admin action).
 * @param {object} params
 * @param {string} params.clientId
 * @param {number} params.points - Positive to add, negative to subtract
 * @param {boolean} params.adjustLifetime
 * @param {boolean} params.adjustRedeemable
 * @param {string} params.reason
 * @param {string} params.adminId
 * @returns {Promise<object>}
 */
const adjustPoints = async ({ clientId, points, adjustLifetime, adjustRedeemable, reason, adminId }) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new ClientNotFoundError(clientId);
  }

  const lifetimeChange = adjustLifetime ? points : 0;
  const redeemableChange = adjustRedeemable ? points : 0;

  const updatedClient = await Client.updatePoints(client.id, lifetimeChange, redeemableChange);

  const transaction = await PointsTransaction.create({
    client_id: client.id,
    transaction_type: 'adjustment',
    source: 'manual',
    lifetime_points_change: lifetimeChange,
    redeemable_points_change: redeemableChange,
    tier_at_transaction: client.current_tier,
    description: reason,
    created_by: adminId
  });

  // Check for tier change if lifetime points changed
  let tierChanged = false;
  let newTier = null;
  if (lifetimeChange > 0) {
    const result = await checkAndUpgradeTier(updatedClient);
    tierChanged = result.upgraded;
    newTier = result.newTier;
  } else if (lifetimeChange < 0) {
    const result = await checkAndDowngradeTier(updatedClient);
    tierChanged = result.downgraded;
    newTier = result.newTier;
  }

  return {
    adjustment_id: transaction.id,
    client_id: client.id,
    lifetime_points_before: client.lifetime_points,
    lifetime_points_after: updatedClient.lifetime_points,
    redeemable_points_before: client.redeemable_points,
    redeemable_points_after: updatedClient.redeemable_points,
    tier_upgraded: tierChanged,
    new_tier: newTier,
    adjusted_at: transaction.created_at
  };
};

module.exports = {
  calculatePoints,
  awardPoints,
  adjustPoints
};
