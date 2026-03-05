const Client = require('../models/Client');
const Beneficiary = require('../models/Beneficiary');
const PointsTransaction = require('../models/PointsTransaction');
const RedemptionHistory = require('../models/RedemptionHistory');
const { redeemPoints } = require('../services/redemptionService');
const { getNextTier, pointsToNextTier, progressPercentage } = require('../services/tierService');
const { TIER_MULTIPLIERS } = require('../constants/loyalty');
const { ClientNotFoundError, AppError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * GET /api/v1/clients/:id/loyalty
 */
const getLoyaltyStatus = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new ClientNotFoundError(req.params.id);

    const nextTier = getNextTier(client.current_tier);
    const heldPoints = client.held_points || 0;
    const availablePoints = client.redeemable_points - heldPoints;
    // Flat rate: 1,000 points = $5.00
    const creditAvailable = Math.floor(availablePoints / 1000) * 5;

    res.json({
      client_id: client.id,
      name: client.name,
      current_tier: client.current_tier,
      lifetime_points: client.lifetime_points,
      redeemable_points: client.redeemable_points,
      held_points: heldPoints,
      available_points: availablePoints,
      next_tier: nextTier,
      points_to_next_tier: pointsToNextTier(client.current_tier, client.lifetime_points),
      progress_percentage: progressPercentage(client.current_tier, client.lifetime_points),
      tier_multiplier: TIER_MULTIPLIERS[client.current_tier],
      credit_available: creditAvailable,
      is_active: !!client.is_active,
      unenrolled_at: client.unenrolled_at || null
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/clients/:id/redeem
 */
const handleRedeem = async (req, res, next) => {
  try {
    const { points, reward_id, reward_name, reward_category, delivery_method } = req.body;
    const result = await redeemPoints(req.params.id, points, {
      reward_id,
      reward_name,
      reward_category,
      delivery_method
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/clients/:id/transactions
 */
const getTransactions = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new ClientNotFoundError(req.params.id);

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const type = req.query.type;
    const search = req.query.search;
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;

    const { transactions, total } = await PointsTransaction.findByClientId(client.id, { page, limit, type, search, dateFrom, dateTo });

    res.json({
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.transaction_type,
        source: t.source,
        date: t.created_at,
        invoice_amount: t.invoice_amount,
        points_earned: t.transaction_type === 'earn' ? t.lifetime_points_change : undefined,
        points_redeemed: t.transaction_type === 'redeem' ? Math.abs(t.redeemable_points_change) : undefined,
        points_adjusted: t.transaction_type === 'adjustment' ? (t.redeemable_points_change || t.lifetime_points_change || 0) : undefined,
        balance: t.running_balance != null ? t.running_balance : undefined,
        lifetime_balance: t.lifetime_running_balance != null ? t.lifetime_running_balance : undefined,
        tier_at_transaction: t.tier_at_transaction,
        multiplier: t.multiplier_applied,
        description: t.description
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
 * GET /api/v1/clients/:id/redemptions
 */
const getRedemptions = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new ClientNotFoundError(req.params.id);

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const { redemptions, total } = await RedemptionHistory.findByClientId(client.id, { page, limit });

    res.json({
      redemptions: redemptions.map((r) => ({
        id: r.id,
        points_redeemed: r.points_redeemed,
        credit_amount: r.credit_amount,
        voucher_code: r.voucher_code,
        redeemed_at: r.redeemed_at,
        applied_to_invoice: r.applied_to_invoice,
        applied_at: r.applied_at,
        status: r.status,
        reward_name: r.reward_name,
        reward_category: r.reward_category,
        delivery_status: r.delivery_status,
        fulfillment_details: r.status === 'fulfilled' ? r.fulfillment_details : null,
        denied_reason: r.status === 'denied' ? r.denied_reason : null,
        admin_notes: r.admin_notes || null
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
 * PATCH /api/v1/clients/:id/profile
 * Update client profile (address).
 */
const updateProfile = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new ClientNotFoundError(req.params.id);

    const { address, address_street, address_apt, address_city, address_state, address_zip } = req.body;
    const updates = {};
    if (address !== undefined) updates.address = address;
    if (address_street !== undefined) updates.address_street = address_street;
    if (address_apt !== undefined) updates.address_apt = address_apt;
    if (address_city !== undefined) updates.address_city = address_city;
    if (address_state !== undefined) updates.address_state = address_state;
    if (address_zip !== undefined) updates.address_zip = address_zip;

    await Client.updateProfile(client.id, updates);

    const updated = await Client.findById(client.id);
    res.json({
      address: updated.address || null,
      address_street: updated.address_street || null,
      address_apt: updated.address_apt || null,
      address_city: updated.address_city || null,
      address_state: updated.address_state || null,
      address_zip: updated.address_zip || null
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/clients/:id/unenroll
 */
const handleUnenroll = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new ClientNotFoundError(req.params.id);

    if (!client.is_active) {
      throw new AppError('ALREADY_UNENROLLED', 'This account is already unenrolled.', 400);
    }

    const { reason } = req.body;
    const validReasons = ['deceased', 'cancelled_care_package'];
    if (!reason || !validReasons.includes(reason)) {
      throw new AppError('INVALID_REASON', 'A valid unenroll reason is required.', 400);
    }

    const db = require('../db');
    await db('clients').where({ id: client.id }).update({
      is_active: false,
      unenrolled_at: new Date().toISOString(),
      unenroll_reason: reason,
      updated_at: new Date().toISOString()
    });

    logger.info('Client unenrolled', { clientId: client.id, reason });

    res.json({ message: 'Successfully unenrolled from NoorVana Advantage.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/clients/:id/complete-setup
 */
const completeSetup = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new ClientNotFoundError(req.params.id);

    const { phone, address_street, address_apt, address_city, address_state, address_zip } = req.body;
    const updates = {};
    if (phone !== undefined) updates.phone = phone;
    if (address_street !== undefined) updates.address_street = address_street;
    if (address_apt !== undefined) updates.address_apt = address_apt;
    if (address_city !== undefined) updates.address_city = address_city;
    if (address_state !== undefined) updates.address_state = address_state;
    if (address_zip !== undefined) updates.address_zip = address_zip;

    if (Object.keys(updates).length > 0) {
      await Client.updateProfile(client.id, updates);
    }

    await Client.markSetupCompleted(client.id);
    res.json({ message: 'Setup completed', setup_completed: true });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/clients/:id/beneficiary
 */
const getBeneficiary = async (req, res, next) => {
  try {
    const beneficiary = await Beneficiary.findByClientId(req.params.id);
    res.json({ beneficiary: beneficiary || null });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/clients/:id/beneficiary
 */
const saveBeneficiary = async (req, res, next) => {
  try {
    const { beneficiary_type, name, phone, email, relationship, organization_name } = req.body;

    if (!['family_friend', 'charity_facility', 'none'].includes(beneficiary_type)) {
      throw new AppError('INVALID_TYPE', 'beneficiary_type must be family_friend, charity_facility, or none', 400);
    }

    const data = { beneficiary_type };
    if (beneficiary_type !== 'none') {
      data.name = name || null;
      data.phone = phone || null;
      data.email = email || null;
      data.relationship = beneficiary_type === 'family_friend' ? (relationship || null) : null;
      data.organization_name = beneficiary_type === 'charity_facility' ? (organization_name || null) : null;
    } else {
      data.name = null;
      data.phone = null;
      data.email = null;
      data.relationship = null;
      data.organization_name = null;
    }

    const beneficiary = await Beneficiary.upsert(req.params.id, data);
    res.json({ beneficiary });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getLoyaltyStatus, handleRedeem, getTransactions, getRedemptions,
  updateProfile, handleUnenroll, completeSetup, getBeneficiary, saveBeneficiary
};
