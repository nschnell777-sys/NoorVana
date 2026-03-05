const Client = require('../models/Client');
const Beneficiary = require('../models/Beneficiary');
const PointsTransaction = require('../models/PointsTransaction');
const RedemptionHistory = require('../models/RedemptionHistory');
const TierHistory = require('../models/TierHistory');
const { awardPoints, adjustPoints } = require('../services/pointsService');
const { getNextTier, pointsToNextTier, progressPercentage } = require('../services/tierService');
const { TIER_MULTIPLIERS, REDEMPTION_POINTS_PER_UNIT, REDEMPTION_CREDIT_PER_UNIT } = require('../constants/loyalty');
const { ClientNotFoundError, AppError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * GET /api/v1/admin/clients
 */
const listClients = async (req, res, next) => {
  try {
    const db = require('../db');
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const { tier, care_package, search, sort_by, sort_order, status } = req.query;

    const ALLOWED_SORTS = ['name', 'lifetime_points', 'redeemable_points', 'points_redeemed', 'lifetime_revenue', 'tenure_days'];
    const sortCol = ALLOWED_SORTS.includes(sort_by) ? sort_by : 'name';
    const sortDir = sort_order === 'desc' ? 'desc' : 'asc';

    let query = db('clients');

    // Status filter: 'active' (default), 'inactive', or 'all'
    if (status === 'inactive') {
      query = query.where('clients.is_active', false);
    } else if (status !== 'all') {
      query = query.where('clients.is_active', true);
    }

    query = query.select(
        'clients.id',
        'clients.axiscare_client_id',
        'clients.name',
        'clients.email',
        'clients.phone',
        'clients.care_package',
        'clients.current_tier',
        'clients.lifetime_points',
        'clients.redeemable_points',
        'clients.is_active',
        'clients.market',
        'clients.unenrolled_at',
        'clients.unenroll_reason',
        'clients.created_at',
        db.raw("CAST(julianday('now') - julianday(clients.created_at) AS INTEGER) as tenure_days"),
        db.raw("COALESCE((SELECT SUM(invoice_amount) FROM points_transactions WHERE client_id = clients.id AND transaction_type = 'earn'), 0) as lifetime_revenue"),
        db.raw("COALESCE((SELECT SUM(ABS(redeemable_points_change)) FROM points_transactions WHERE client_id = clients.id AND transaction_type = 'redeem'), 0) as points_redeemed")
      );

    if (tier) {
      query = query.where('clients.current_tier', tier.toLowerCase());
    }
    if (care_package) {
      query = query.where('clients.care_package', care_package.toLowerCase());
    }
    if (search) {
      const term = `%${search}%`;
      query = query.where(function () {
        this.whereRaw('LOWER(clients.name) LIKE LOWER(?)', [term])
          .orWhereRaw('LOWER(clients.email) LIKE LOWER(?)', [term])
          .orWhereRaw('LOWER(clients.axiscare_client_id) LIKE LOWER(?)', [term]);
      });
    }

    const baseQuery = query.clone();

    const countResult = await query.clone().clearSelect().count('clients.id as total').first();
    const total = parseInt(countResult.total, 10);

    // Summary stats across all matching clients (not just current page)
    const statsResult = await baseQuery.clone().clearSelect().select(
      db.raw("SUM(CASE WHEN clients.is_active = 1 THEN 1 ELSE 0 END) as active_clients"),
      db.raw("AVG(COALESCE((SELECT SUM(invoice_amount) FROM points_transactions WHERE client_id = clients.id AND transaction_type = 'earn'), 0)) as avg_cltv"),
      db.raw("AVG(CAST(julianday('now') - julianday(clients.created_at) AS INTEGER)) as avg_duration_days")
    ).first();

    const clients = await query
      .orderBy(sortCol, sortDir)
      .limit(limit)
      .offset((page - 1) * limit);

    res.json({
      summary: {
        total_clients: total,
        active_clients: parseInt(statsResult?.active_clients, 10) || 0,
        avg_cltv: parseFloat(statsResult?.avg_cltv) || 0,
        avg_duration_days: Math.round(parseFloat(statsResult?.avg_duration_days) || 0)
      },
      clients: clients.map((c) => ({
        id: c.id,
        axiscare_client_id: c.axiscare_client_id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        care_package: c.care_package,
        current_tier: c.current_tier,
        lifetime_points: c.lifetime_points,
        redeemable_points: c.redeemable_points,
        market: c.market || null,
        is_active: !!c.is_active,
        unenrolled_at: c.unenrolled_at || null,
        unenroll_reason: c.unenroll_reason || null,
        tenure_days: c.tenure_days,
        lifetime_revenue: parseFloat(c.lifetime_revenue) || 0,
        points_redeemed: parseInt(c.points_redeemed, 10) || 0
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/clients/:id
 */
const getClientDetail = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new ClientNotFoundError(req.params.id);

    const nextTier = getNextTier(client.current_tier);
    const { transactions } = await PointsTransaction.findByClientId(client.id, { page: 1, limit: 1000 });
    const { redemptions } = await RedemptionHistory.findByClientId(client.id, { page: 1, limit: 20 });
    const tierHistory = await TierHistory.findByClientId(client.id);
    const beneficiary = await Beneficiary.findByClientId(client.id);

    res.json({
      client: {
        id: client.id,
        axiscare_client_id: client.axiscare_client_id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        address_street: client.address_street,
        address_apt: client.address_apt,
        address_city: client.address_city,
        address_state: client.address_state,
        address_zip: client.address_zip,
        care_package: client.care_package,
        market: client.market || null,
        current_tier: client.current_tier,
        lifetime_points: client.lifetime_points,
        redeemable_points: client.redeemable_points,
        next_tier: nextTier,
        points_to_next_tier: pointsToNextTier(client.current_tier, client.lifetime_points),
        progress_percentage: progressPercentage(client.current_tier, client.lifetime_points),
        tier_multiplier: TIER_MULTIPLIERS[client.current_tier],
        credit_available: Math.floor(client.redeemable_points / REDEMPTION_POINTS_PER_UNIT) * REDEMPTION_CREDIT_PER_UNIT,
        is_active: !!client.is_active,
        unenrolled_at: client.unenrolled_at || null,
        unenroll_reason: client.unenroll_reason || null,
        tier_upgraded_at: client.tier_upgraded_at,
        created_at: client.created_at
      },
      recent_transactions: transactions,
      recent_redemptions: redemptions,
      tier_history: tierHistory,
      beneficiary: beneficiary || null
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/transactions
 */
const recordTransaction = async (req, res, next) => {
  try {
    const { client_id, invoice_id, invoice_amount, payment_date, source } = req.body;

    const result = await awardPoints({
      clientId: client_id,
      paymentAmount: invoice_amount,
      source: source || 'manual',
      invoiceId: invoice_id,
      description: `Manual entry - Invoice ${invoice_id}`,
      createdBy: req.user.user_id
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/clients/:id/adjust
 */
const handleAdjustPoints = async (req, res, next) => {
  try {
    const { points, reason, adjust_lifetime, adjust_redeemable, adjustment_type } = req.body;
    const adjustedPoints = adjustment_type === 'subtract' ? -Math.abs(points) : Math.abs(points);

    const result = await adjustPoints({
      clientId: req.params.id,
      points: adjustedPoints,
      adjustLifetime: adjust_lifetime,
      adjustRedeemable: adjust_redeemable,
      reason,
      adminId: req.user.user_id
    });

    // Add admin name to response
    result.adjusted_by = req.user.name || req.user.user_id;
    result.reason = reason;

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/clients/:id
 */
const updateClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new ClientNotFoundError(req.params.id);

    const { phone, address_street, address_apt, address_city, address_state, address_zip, market } = req.body;
    const updates = { phone, address_street, address_apt, address_city, address_state, address_zip };
    if (market !== undefined) updates.market = market;
    const updated = await Client.updateProfile(req.params.id, updates);

    res.json({
      client: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        address_street: updated.address_street,
        address_apt: updated.address_apt,
        address_city: updated.address_city,
        address_state: updated.address_state,
        address_zip: updated.address_zip,
        market: updated.market || null
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/transactions
 */
const listAllTransactions = async (req, res, next) => {
  try {
    const db = require('../db');
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { type, source, search, date_from, date_to, sort_by, sort_order } = req.query;

    const ALLOWED_SORTS = ['created_at', 'client_name', 'invoice_amount', 'lifetime_points_change', 'transaction_type', 'source'];
    const sortColInput = ALLOWED_SORTS.includes(sort_by) ? sort_by : 'created_at';
    const sortCol = sortColInput === 'client_name' ? 'clients.name' : `points_transactions.${sortColInput}`;
    const sortDir = sort_order === 'asc' ? 'asc' : 'desc';

    let query = db('points_transactions')
      .join('clients', 'points_transactions.client_id', 'clients.id')
      .select(
        'points_transactions.id',
        'points_transactions.transaction_type',
        'points_transactions.source',
        'points_transactions.invoice_id',
        'points_transactions.invoice_amount',
        'points_transactions.lifetime_points_change',
        'points_transactions.redeemable_points_change',
        'points_transactions.tier_at_transaction',
        'points_transactions.multiplier_applied',
        'points_transactions.description',
        'points_transactions.created_at',
        'clients.name as client_name',
        'clients.id as client_id'
      );

    if (type) {
      query = query.where('points_transactions.transaction_type', type);
    }
    if (source) {
      query = query.where('points_transactions.source', source);
    }
    if (search) {
      const term = `%${search}%`;
      query = query.where(function () {
        this.whereRaw('LOWER(clients.name) LIKE LOWER(?)', [term])
          .orWhereRaw('LOWER(points_transactions.invoice_id) LIKE LOWER(?)', [term])
          .orWhereRaw('LOWER(points_transactions.description) LIKE LOWER(?)', [term]);
      });
    }
    if (date_from) {
      query = query.where('points_transactions.created_at', '>=', date_from);
    }
    if (date_to) {
      query = query.where('points_transactions.created_at', '<=', `${date_to}T23:59:59.999Z`);
    }

    const countQuery = query.clone();
    const countResult = await countQuery.clearSelect().count('points_transactions.id as total').first();
    const total = parseInt(countResult.total, 10);

    const transactions = await query
      .orderBy(sortCol, sortDir)
      .limit(limit)
      .offset((page - 1) * limit);

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/clients/:id/unenroll
 */
const adminUnenrollClient = async (req, res, next) => {
  try {
    const db = require('../db');
    const client = await Client.findById(req.params.id);
    if (!client) throw new ClientNotFoundError(req.params.id);

    if (!client.is_active) {
      throw new AppError('ALREADY_UNENROLLED', 'This client is already unenrolled.', 400);
    }

    const { reason } = req.body;
    const validReasons = ['deceased', 'cancelled_care_package'];
    if (!reason || !validReasons.includes(reason)) {
      throw new AppError('INVALID_REASON', 'A valid unenroll reason is required.', 400);
    }

    const now = new Date().toISOString();
    let beneficiaryTransfer = null;

    // For deceased clients with redeemable points, process beneficiary transfer
    if (reason === 'deceased' && client.redeemable_points > 0) {
      const beneficiary = await Beneficiary.findByClientId(client.id);
      const pointsToTransfer = client.redeemable_points;
      const creditValue = Math.floor(pointsToTransfer / 1000) * 5;

      // Subtract redeemable points (lifetime stays)
      await Client.updatePoints(client.id, 0, -pointsToTransfer);

      // Create transaction record
      const transaction = await PointsTransaction.create({
        client_id: client.id,
        transaction_type: 'beneficiary_transfer',
        source: 'manual',
        lifetime_points_change: 0,
        redeemable_points_change: -pointsToTransfer,
        tier_at_transaction: client.current_tier,
        description: beneficiary && beneficiary.beneficiary_type !== 'none'
          ? `Beneficiary transfer to ${beneficiary.name} — ${beneficiary.beneficiary_type === 'family_friend' ? (beneficiary.relationship || 'Family/Friend') : (beneficiary.organization_name || 'Charity/Facility')}`
          : 'Beneficiary transfer — no beneficiary on file',
        created_by: req.user.user_id
      });

      beneficiaryTransfer = {
        transaction_id: transaction.id,
        points_transferred: pointsToTransfer,
        credit_value: creditValue,
        beneficiary_name: beneficiary?.name || null,
        beneficiary_type: beneficiary?.beneficiary_type || null
      };

      logger.info('Beneficiary transfer processed', {
        clientId: client.id,
        pointsTransferred: pointsToTransfer,
        creditValue,
        beneficiaryName: beneficiary?.name || 'none',
        adminId: req.user.user_id
      });
    }

    await db('clients').where({ id: client.id }).update({
      is_active: false,
      unenrolled_at: now,
      unenroll_reason: reason,
      updated_at: now
    });

    logger.info('Client unenrolled by admin', { clientId: client.id, reason, adminId: req.user.user_id });

    res.json({
      message: 'Client unenrolled successfully.',
      beneficiary_transfer: beneficiaryTransfer
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/clients/:id/reenroll
 */
const adminReenrollClient = async (req, res, next) => {
  try {
    const db = require('../db');
    const client = await Client.findById(req.params.id);
    if (!client) throw new ClientNotFoundError(req.params.id);

    if (client.is_active) {
      throw new AppError('ALREADY_ACTIVE', 'This client is already active.', 400);
    }

    const now = new Date().toISOString();
    await db('clients').where({ id: client.id }).update({
      is_active: true,
      unenrolled_at: null,
      unenroll_reason: null,
      reenrolled_at: now,
      updated_at: now
    });

    logger.info('Client re-enrolled by admin', { clientId: client.id, adminId: req.user.user_id, reenrolledAt: now });

    res.json({ message: 'Client re-enrolled successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/clients/:id/reset-password
 * Clears the client's password_hash so they must re-register via the portal.
 */
const adminResetClientPassword = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new ClientNotFoundError(req.params.id);

    const db = require('../db');
    await db('clients').where({ id: client.id }).update({ password_hash: null, updated_at: new Date().toISOString() });

    logger.info('Client password reset by admin', { clientId: client.id, adminId: req.user.user_id });

    res.json({ message: 'Client password has been reset. They will need to set up a new password on next login.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { listClients, getClientDetail, recordTransaction, handleAdjustPoints, updateClient, listAllTransactions, adminUnenrollClient, adminReenrollClient, adminResetClientPassword };
