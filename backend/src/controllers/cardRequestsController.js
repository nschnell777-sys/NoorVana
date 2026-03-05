const db = require('../db');
const Client = require('../models/Client');
const PointsTransaction = require('../models/PointsTransaction');
const { TIER_ORDER } = require('../constants/loyalty');
const { ClientNotFoundError, InsufficientPointsError, AppError } = require('../utils/errors');
const logger = require('../utils/logger');

const POINTS_PER_DOLLAR_UNIT = 1000;
const DOLLARS_PER_UNIT = 5;

/**
 * POST /api/v1/clients/:id/card-requests
 * Creates a pending card request for admin review. No points deducted yet.
 */
const createCardRequest = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new ClientNotFoundError(req.params.id);

    const { brand_name, amount } = req.body;
    if (!brand_name) {
      throw new AppError('MISSING_FIELDS', 'brand_name is required', 400);
    }
    if (!amount || amount <= 0) {
      throw new AppError('MISSING_FIELDS', 'amount is required and must be positive', 400);
    }

    if (amount % DOLLARS_PER_UNIT !== 0) {
      throw new AppError('INVALID_AMOUNT', `Amount must be a multiple of $${DOLLARS_PER_UNIT}`, 400);
    }

    // Bronze cannot redeem
    const tierIndex = TIER_ORDER.indexOf(client.current_tier);
    if (tierIndex < 1) {
      throw new AppError('TIER_TOO_LOW', 'You must be Silver tier or above to redeem points', 403);
    }

    const [record] = await db('card_requests')
      .insert({
        client_id: client.id,
        brand_name,
        preferred_amount: `$${amount}`,
        points_deducted: 0,
        credit_amount: amount,
        status: 'pending'
      })
      .returning('*');

    const result = record || await db('card_requests')
      .where({ client_id: client.id })
      .orderBy('created_at', 'desc')
      .first();

    logger.info('Custom card request created', {
      clientId: client.id,
      brandName: brand_name,
      amount
    });

    res.status(201).json({
      request: result,
      credit_amount: amount
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/clients/:id/card-requests
 * Returns the client's own card requests.
 */
const getClientCardRequests = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new ClientNotFoundError(req.params.id);

    const requests = await db('card_requests')
      .where({ client_id: client.id })
      .orderBy('created_at', 'desc');

    res.json({ requests });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/card-requests
 */
const getAdminCardRequests = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = db('card_requests')
      .join('clients', 'card_requests.client_id', 'clients.id')
      .select(
        'card_requests.*',
        'clients.name as client_name',
        'clients.email as client_email'
      );

    if (status) query = query.where('card_requests.status', status);

    const requests = await query.orderBy('card_requests.created_at', 'desc');
    res.json({ requests });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/card-requests/:id
 * Admin accepts (quoted) or denies. No points involved at this stage.
 */
const updateAdminCardRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, admin_notes, delivery_code } = req.body;

    const record = await db('card_requests').where({ id }).first();
    if (!record) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Card request not found' } });
    }

    // Only pending requests can be accepted/denied; approved requests can get a delivery_code
    if (record.status === 'denied') {
      return res.status(400).json({ error: { code: 'ALREADY_FINALIZED', message: 'Request already denied' } });
    }

    const updates = {};
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;
    if (delivery_code) {
      updates.delivery_code = delivery_code;
      // If the card request is approved (client confirmed), delivering the code fulfills it
      if (record.status === 'approved') {
        updates.status = 'fulfilled';
        logger.info('Card request fulfilled with delivery code', { requestId: id, clientId: record.client_id });
      }
    }

    if (status === 'quoted' || status === 'accepted') {
      if (record.status !== 'pending') {
        return res.status(400).json({ error: { code: 'INVALID_STATUS', message: 'Only pending requests can be accepted' } });
      }
      updates.status = 'quoted';
      logger.info('Card request accepted', { requestId: id, clientId: record.client_id });
    } else if (status === 'denied') {
      if (record.status !== 'pending' && record.status !== 'quoted') {
        return res.status(400).json({ error: { code: 'INVALID_STATUS', message: 'Only pending or accepted requests can be denied' } });
      }
      updates.status = 'denied';
      logger.info('Card request denied', { requestId: id, clientId: record.client_id });
    }

    await db('card_requests').where({ id }).update(updates);
    const updated = await db('card_requests').where({ id }).first();
    res.json({ request: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/clients/:id/card-requests/:requestId/confirm
 * Client confirms a quoted request — points are deducted now.
 */
const clientConfirmCardRequest = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new ClientNotFoundError(req.params.id);

    const record = await db('card_requests').where({ id: req.params.requestId }).first();
    if (!record || record.client_id !== client.id) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Card request not found' } });
    }

    if (record.status !== 'quoted') {
      return res.status(400).json({ error: { code: 'INVALID_STATUS', message: 'Only accepted requests can be confirmed' } });
    }

    const pointsCost = (record.credit_amount / DOLLARS_PER_UNIT) * POINTS_PER_DOLLAR_UNIT;

    if (client.redeemable_points < pointsCost) {
      throw new InsufficientPointsError(client.redeemable_points, pointsCost);
    }

    // Deduct redeemable points
    await Client.updatePoints(client.id, 0, -pointsCost);

    // Create transaction record
    await PointsTransaction.create({
      client_id: client.id,
      transaction_type: 'redeem',
      source: 'manual',
      lifetime_points_change: 0,
      redeemable_points_change: -pointsCost,
      tier_at_transaction: client.current_tier,
      description: `Custom card request: ${record.brand_name} $${record.credit_amount}`
    });

    await db('card_requests').where({ id: record.id }).update({
      status: 'approved',
      points_deducted: pointsCost
    });

    const updatedClient = await Client.findById(client.id);
    const updated = await db('card_requests').where({ id: record.id }).first();

    logger.info('Card request confirmed by client', {
      requestId: record.id,
      clientId: client.id,
      pointsDeducted: pointsCost
    });

    res.json({
      request: updated,
      points_deducted: pointsCost,
      remaining_redeemable_points: updatedClient.redeemable_points
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/clients/:id/card-requests/:requestId/deny
 * Client declines a quoted request — no points involved.
 */
const clientDenyCardRequest = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new ClientNotFoundError(req.params.id);

    const record = await db('card_requests').where({ id: req.params.requestId }).first();
    if (!record || record.client_id !== client.id) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Card request not found' } });
    }

    if (record.status !== 'quoted') {
      return res.status(400).json({ error: { code: 'INVALID_STATUS', message: 'Only accepted requests can be declined' } });
    }

    const { reason } = req.body;

    await db('card_requests').where({ id: record.id }).update({
      status: 'denied',
      admin_notes: reason ? `Client declined: ${reason}` : 'Client declined'
    });

    const updated = await db('card_requests').where({ id: record.id }).first();

    logger.info('Card request declined by client', {
      requestId: record.id,
      clientId: client.id,
      reason: reason || null
    });

    res.json({ request: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = { createCardRequest, getClientCardRequests, getAdminCardRequests, updateAdminCardRequest, clientConfirmCardRequest, clientDenyCardRequest };
