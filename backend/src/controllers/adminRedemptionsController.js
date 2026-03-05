const db = require('../db');
const Client = require('../models/Client');
const logger = require('../utils/logger');

/**
 * GET /api/v1/admin/redemptions
 * List all redemptions with optional ?status filter.
 */
const getRedemptions = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = db('redemption_history')
      .join('clients', 'redemption_history.client_id', 'clients.id')
      .select(
        'redemption_history.*',
        'clients.name as client_name',
        'clients.email as client_email',
        'clients.current_tier as client_tier'
      );

    if (status) query = query.where('redemption_history.status', status);

    const redemptions = await query.orderBy('redemption_history.redeemed_at', 'desc');
    res.json({ redemptions });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/redemptions/:id/process
 * Move redemption to "processing" status.
 */
const processRedemption = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await db('redemption_history').where({ id }).first();
    if (!record) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Redemption not found' } });
    }
    if (record.status !== 'pending') {
      return res.status(400).json({ error: { code: 'INVALID_STATUS', message: `Cannot process a redemption in "${record.status}" status` } });
    }

    await db('redemption_history').where({ id }).update({
      status: 'processing',
      processed_by: req.user?.user_id || null,
      processed_at: new Date().toISOString()
    });

    const updated = await db('redemption_history').where({ id }).first();
    res.json({ redemption: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/redemptions/:id/fulfill
 * Mark redemption as fulfilled with details.
 */
const fulfillRedemption = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fulfillment_details, admin_notes } = req.body;

    const record = await db('redemption_history').where({ id }).first();
    if (!record) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Redemption not found' } });
    }
    if (record.status !== 'pending' && record.status !== 'processing') {
      return res.status(400).json({ error: { code: 'INVALID_STATUS', message: `Cannot fulfill a redemption in "${record.status}" status` } });
    }

    const updates = {
      status: 'fulfilled',
      fulfilled_at: new Date().toISOString(),
      delivery_status: 'delivered'
    };
    if (fulfillment_details) updates.fulfillment_details = fulfillment_details;
    if (admin_notes) updates.admin_notes = admin_notes;

    // For service credits, apply to invoice
    if (record.reward_category === 'service_credit' && fulfillment_details) {
      updates.applied_to_invoice = fulfillment_details;
      updates.applied_at = new Date().toISOString();
    }

    await db('redemption_history').where({ id }).update(updates);

    // Release held points
    await Client.updateHeldPoints(record.client_id, -record.points_redeemed);

    const updated = await db('redemption_history').where({ id }).first();
    logger.info('Redemption fulfilled', { redemptionId: id, code: fulfillment_details ? '***' : null });
    res.json({ redemption: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/redemptions/:id/deny
 * Deny a redemption and auto-refund points.
 */
const denyRedemption = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { denied_reason } = req.body;

    if (!denied_reason) {
      return res.status(400).json({ error: { code: 'MISSING_REASON', message: 'A reason is required to deny a redemption' } });
    }

    const record = await db('redemption_history').where({ id }).first();
    if (!record) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Redemption not found' } });
    }
    if (record.status === 'fulfilled' || record.status === 'denied') {
      return res.status(400).json({ error: { code: 'INVALID_STATUS', message: `Cannot deny a redemption in "${record.status}" status` } });
    }

    // Release held points and refund
    await Client.updateHeldPoints(record.client_id, -record.points_redeemed);
    await Client.updatePoints(record.client_id, 0, record.points_redeemed);

    // Create refund transaction
    await db('points_transactions').insert({
      client_id: record.client_id,
      transaction_type: 'adjustment',
      source: 'manual',
      lifetime_points_change: 0,
      redeemable_points_change: record.points_redeemed,
      tier_at_transaction: (await Client.findById(record.client_id)).current_tier,
      description: `Refund: Redemption denied - ${denied_reason}`
    });

    await db('redemption_history').where({ id }).update({
      status: 'denied',
      denied_reason,
      delivery_status: 'denied'
    });

    const updated = await db('redemption_history').where({ id }).first();
    logger.info('Redemption denied and points refunded', {
      redemptionId: id,
      pointsRefunded: record.points_redeemed,
      clientId: record.client_id
    });

    res.json({ redemption: updated, points_refunded: record.points_redeemed });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/redemptions/stats
 */
const getRedemptionStats = async (req, res, next) => {
  try {
    const pending = await db('redemption_history').where({ status: 'pending' }).count('* as count').first();
    const processing = await db('redemption_history').where({ status: 'processing' }).count('* as count').first();

    const isSqlite = db.client.config.client === 'better-sqlite3';
    let fulfilledToday, monthlyValue;

    if (isSqlite) {
      fulfilledToday = await db('redemption_history')
        .where({ status: 'fulfilled' })
        .whereRaw("date(fulfilled_at) = date('now')")
        .count('* as count')
        .first();

      monthlyValue = await db('redemption_history')
        .where({ status: 'fulfilled' })
        .whereRaw("fulfilled_at >= datetime('now', '-30 days')")
        .sum('credit_amount as total')
        .first();
    } else {
      fulfilledToday = await db('redemption_history')
        .where({ status: 'fulfilled' })
        .whereRaw("DATE(fulfilled_at) = CURRENT_DATE")
        .count('* as count')
        .first();

      monthlyValue = await db('redemption_history')
        .where({ status: 'fulfilled' })
        .whereRaw("fulfilled_at >= NOW() - INTERVAL '30 days'")
        .sum('credit_amount as total')
        .first();
    }

    res.json({
      pending_count: parseInt(pending.count, 10),
      processing_count: parseInt(processing.count, 10),
      fulfilled_today: parseInt(fulfilledToday?.count, 10) || 0,
      monthly_value: parseFloat(monthlyValue?.total) || 0
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getRedemptions,
  processRedemption,
  fulfillRedemption,
  denyRedemption,
  getRedemptionStats
};
