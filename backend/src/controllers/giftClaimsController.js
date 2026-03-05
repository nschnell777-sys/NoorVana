const db = require('../db');
const Client = require('../models/Client');
const { TIER_ORDER } = require('../constants/loyalty');
const { ClientNotFoundError, AppError } = require('../utils/errors');
const logger = require('../utils/logger');
const { sendBoundlessGiftEmail, createMessageForClient } = require('../services/emailService');

/** Collection gifts per tier */
const COLLECTION_GIFTS = {
  silver: 'Silver NoorVana Collection Gift',
  gold: 'Gold NoorVana Collection Gift',
  platinum: 'Platinum NoorVana Collection Gift',
  diamond: 'Signature NoorVana Collection Gift'
};

/** Valid forward-only status transitions */
const VALID_TRANSITIONS = {
  claimed: ['processing'],
  processing: ['shipped'],
  shipped: ['delivered']
};

/**
 * POST /api/v1/clients/:id/gift-claims
 * Client claims a collection gift for their tier.
 */
const createGiftClaim = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new ClientNotFoundError(req.params.id);

    const { tier, gift_name, shipping_street, shipping_apt, shipping_city, shipping_state, shipping_zip } = req.body;
    if (!tier || !gift_name) {
      throw new AppError('MISSING_FIELDS', 'tier and gift_name are required', 400);
    }
    if (!shipping_street || !shipping_street.trim() || !shipping_city || !shipping_city.trim() || !shipping_state || !shipping_state.trim() || !shipping_zip || !shipping_zip.trim()) {
      throw new AppError('MISSING_ADDRESS', 'Street address, city, state, and zip code are required', 400);
    }

    // Validate client has reached this tier
    const clientTierIndex = TIER_ORDER.indexOf(client.current_tier);
    const requestedTierIndex = TIER_ORDER.indexOf(tier);
    if (requestedTierIndex < 0 || requestedTierIndex > clientTierIndex) {
      throw new AppError('TIER_NOT_REACHED', 'You have not reached this tier', 403);
    }

    // Check if already claimed
    const existing = await db('gift_claims')
      .where({ client_id: client.id, tier, gift_name })
      .first();
    if (existing) {
      throw new AppError('ALREADY_CLAIMED', 'You have already claimed this gift', 400);
    }

    // Build formatted address string
    const formattedAddress = [
      shipping_street.trim(),
      shipping_apt ? shipping_apt.trim() : '',
      `${shipping_city.trim()}, ${shipping_state.trim()} ${shipping_zip.trim()}`
    ].filter(Boolean).join('\n');

    // Save structured address to client profile
    await Client.updateProfile(client.id, {
      address: formattedAddress,
      address_street: shipping_street.trim(),
      address_apt: shipping_apt ? shipping_apt.trim() : null,
      address_city: shipping_city.trim(),
      address_state: shipping_state.trim(),
      address_zip: shipping_zip.trim()
    });

    const [claim] = await db('gift_claims')
      .insert({
        client_id: client.id,
        tier,
        gift_name,
        shipping_address: formattedAddress,
        shipping_street: shipping_street.trim(),
        shipping_apt: shipping_apt ? shipping_apt.trim() : null,
        shipping_city: shipping_city.trim(),
        shipping_state: shipping_state.trim(),
        shipping_zip: shipping_zip.trim(),
        status: 'claimed'
      })
      .returning('*');

    // SQLite fallback
    const result = claim || await db('gift_claims')
      .where({ client_id: client.id, tier, gift_name })
      .orderBy('created_at', 'desc')
      .first();

    logger.info('Gift claimed', { clientId: client.id, tier, gift_name });
    res.status(201).json({ claim: result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/clients/:id/gift-claims
 * List client's gift claims and statuses.
 */
const getClientGiftClaims = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new ClientNotFoundError(req.params.id);

    const claims = await db('gift_claims')
      .where({ client_id: client.id })
      .orderBy('created_at', 'asc');

    res.json({ claims });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/gift-claims
 * Admin: list all gift claims.
 */
const getAdminGiftClaims = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = db('gift_claims')
      .join('clients', 'gift_claims.client_id', 'clients.id')
      .select(
        'gift_claims.*',
        'clients.name as client_name',
        'clients.email as client_email',
        'clients.current_tier as client_tier'
      );

    if (status) query = query.where('gift_claims.status', status);

    const claims = await query.orderBy('gift_claims.created_at', 'desc');
    res.json({ claims });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/gift-claims/:id
 * Admin: update status, tracking, notes.
 */
const updateAdminGiftClaim = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, tracking_number, admin_notes } = req.body;

    const claim = await db('gift_claims').where({ id }).first();
    if (!claim) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Gift claim not found' } });
    }

    const updates = {};
    if (status) {
      // Enforce forward-only status transitions
      const allowed = VALID_TRANSITIONS[claim.status] || [];
      if (!allowed.includes(status)) {
        throw new AppError('INVALID_TRANSITION',
          `Cannot transition from "${claim.status}" to "${status}"`, 400);
      }

      // Require tracking number when moving to shipped
      if (status === 'shipped' && !tracking_number && !claim.tracking_number) {
        throw new AppError('MISSING_TRACKING', 'Tracking number is required when marking as shipped', 400);
      }

      updates.status = status;
      if (status === 'processing') updates.processed_at = new Date().toISOString();
      if (status === 'shipped') updates.shipped_at = new Date().toISOString();
      if (status === 'delivered') updates.delivered_at = new Date().toISOString();
    }
    if (tracking_number !== undefined) updates.tracking_number = tracking_number;
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;

    await db('gift_claims').where({ id }).update(updates);

    // Auto-email Boundless Collection when gift claim moves to processing
    let emailResult = null;
    if (status === 'processing') {
      const client = await Client.findById(claim.client_id);
      if (client) {
        // Use the shipping address from the gift claim (submitted at claim time)
        const claimAddress = claim.shipping_street
          ? [
              claim.shipping_street,
              claim.shipping_apt || '',
              `${claim.shipping_city}, ${claim.shipping_state} ${claim.shipping_zip}`
            ].filter(Boolean).join('\n')
          : claim.shipping_address || client.address;

        emailResult = await sendBoundlessGiftEmail({
          clientName: client.name,
          clientEmail: client.email,
          clientPhone: client.phone,
          clientAddress: claimAddress,
          tier: claim.tier,
          giftName: claim.gift_name,
          claimId: id
        });
        // Also create a message record for the client's Messages page
        await createMessageForClient(
          claim.client_id,
          `Your ${claim.tier.charAt(0).toUpperCase() + claim.tier.slice(1)} Collection Gift (${claim.gift_name}) has been submitted for fulfillment. We'll update you when it ships!`
        );
      }
    }

    const updated = await db('gift_claims').where({ id }).first();
    res.json({ claim: updated, email_sent: emailResult?.sent || false });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createGiftClaim,
  getClientGiftClaims,
  getAdminGiftClaims,
  updateAdminGiftClaim,
  COLLECTION_GIFTS
};
