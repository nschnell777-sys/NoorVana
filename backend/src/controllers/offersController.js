const { TIER_ORDER } = require('../constants/loyalty');
const Offer = require('../models/Offer');
const OfferClaim = require('../models/OfferClaim');
const Client = require('../models/Client');
const { claimOffer, drawWinners, manualPick, meetsMinTier } = require('../services/offersService');
const { AppError } = require('../utils/errors');

// ===== ADMIN ENDPOINTS =====

/**
 * GET /api/v1/admin/offers
 */
const adminListOffers = async (req, res, next) => {
  try {
    const { status, type, min_tier, page, limit } = req.query;
    const { offers, total } = await Offer.list({
      status,
      type,
      min_tier,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 50
    });
    res.json({
      offers,
      pagination: {
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 50,
        total,
        total_pages: Math.ceil(total / (parseInt(limit, 10) || 50))
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/offers
 */
const adminCreateOffer = async (req, res, next) => {
  try {
    const {
      type, title, description, preview_text, image_url, min_tier, start_date, end_date, status,
      reward_id, original_points, deal_points, deal_bonus_value, deal_quantity_limit,
      deal_discount_percentage,
      claim_type, spots_available, prize_details, event_date,
      experience_points_cost,
      sweepstakes_entries_allowed, sweepstakes_winners_count, sweepstakes_draw_date
    } = req.body;

    if (!type || !title || !start_date || !end_date) {
      throw new AppError('MISSING_FIELDS', 'type, title, start_date, and end_date are required', 400);
    }

    if (!['deal', 'experience', 'giveaway'].includes(type)) {
      throw new AppError('INVALID_TYPE', 'type must be deal, experience, or giveaway', 400);
    }

    // Handle file upload — prefer uploaded file over image_url in body
    const resolvedImageUrl = req.file
      ? '/uploads/offers/' + req.file.filename
      : (image_url || null);

    const offer = await Offer.create({
      type,
      title,
      description: description || null,
      preview_text: preview_text || null,
      image_url: resolvedImageUrl,
      min_tier: min_tier || (type === 'deal' ? 'gold' : type === 'experience' ? 'platinum' : 'silver'),
      start_date,
      end_date,
      status: status || 'draft',
      reward_id: reward_id || null,
      original_points: original_points || null,
      deal_points: deal_points || null,
      deal_bonus_value: deal_bonus_value || null,
      deal_quantity_limit: deal_quantity_limit || null,
      deal_discount_percentage: deal_discount_percentage || null,
      claim_type: claim_type || null,
      spots_available: spots_available || null,
      prize_details: prize_details || null,
      sweepstakes_entries_allowed: sweepstakes_entries_allowed || 1,
      sweepstakes_winners_count: sweepstakes_winners_count || 1,
      sweepstakes_draw_date: sweepstakes_draw_date || null,
      event_date: event_date || null,
      experience_points_cost: experience_points_cost || null
    });

    res.status(201).json({ offer });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/offers/:id
 */
const adminGetOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) throw new AppError('OFFER_NOT_FOUND', 'Offer not found', 404);

    // Get claim stats
    const { claims, total: totalClaims } = await OfferClaim.listByOffer(offer.id, { limit: 1000 });
    const stats = {
      total_claims: totalClaims,
      by_status: {}
    };
    claims.forEach(c => {
      stats.by_status[c.status] = (stats.by_status[c.status] || 0) + 1;
    });

    res.json({ offer, claim_stats: stats });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/offers/:id
 */
const adminUpdateOffer = async (req, res, next) => {
  try {
    const existing = await Offer.findById(req.params.id);
    if (!existing) throw new AppError('OFFER_NOT_FOUND', 'Offer not found', 404);

    const updateData = { ...req.body };
    if (req.file) {
      updateData.image_url = '/uploads/offers/' + req.file.filename;
    }

    const offer = await Offer.update(req.params.id, updateData);
    res.json({ offer });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/admin/offers/:id
 */
const adminDeleteOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) throw new AppError('OFFER_NOT_FOUND', 'Offer not found', 404);
    if (offer.status !== 'draft') {
      throw new AppError('CANNOT_DELETE', 'Only draft offers can be deleted', 400);
    }

    await Offer.delete(req.params.id);
    res.json({ message: 'Offer deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/offers/:id/claims
 */
const adminGetOfferClaims = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const { claims, total } = await OfferClaim.listByOffer(req.params.id, { page, limit });
    res.json({
      claims,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/offer-claims/:id
 */
const adminUpdateClaim = async (req, res, next) => {
  try {
    const claim = await OfferClaim.findById(req.params.id);
    if (!claim) throw new AppError('CLAIM_NOT_FOUND', 'Claim not found', 404);

    const updated = await OfferClaim.update(req.params.id, {
      status: req.body.status,
      admin_notes: req.body.admin_notes !== undefined ? req.body.admin_notes : claim.admin_notes
    });

    res.json({ claim: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/offer-claims — master list of all claims
 */
const adminListAllClaims = async (req, res, next) => {
  try {
    const { offer_id, status, page, limit } = req.query;
    const p = parseInt(page, 10) || 1;
    const l = parseInt(limit, 10) || 50;
    const { claims, total } = await OfferClaim.listAll({ offer_id, status, page: p, limit: l });
    res.json({
      claims,
      pagination: { page: p, limit: l, total, total_pages: Math.ceil(total / l) }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/offers/:id/draw
 */
const adminDrawWinners = async (req, res, next) => {
  try {
    const result = await drawWinners(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/offers/:id/manual-pick
 */
const adminManualPick = async (req, res, next) => {
  try {
    if (!req.body.client_id) throw new AppError('MISSING_CLIENT_ID', 'client_id is required', 400);
    const result = await manualPick(req.params.id, req.body.client_id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ===== CLIENT ENDPOINTS =====

/**
 * GET /api/v1/offers — active offers for client's tier
 */
const clientListOffers = async (req, res, next) => {
  try {
    const clientId = req.user?.user_id;
    let clientTier = 'bronze';

    if (clientId) {
      const client = await Client.findById(clientId);
      if (client) clientTier = client.current_tier;
    }

    const offers = await Offer.listActiveForClient(clientTier, TIER_ORDER);

    // Check which offers the client has entered
    const offersWithStatus = await Promise.all(
      offers.map(async (offer) => {
        let client_entered = false;
        if (clientId) {
          const count = await OfferClaim.countByClientAndOffer(clientId, offer.id);
          client_entered = count > 0;
        }
        return { ...offer, client_entered };
      })
    );

    // Also include locked offers (higher tier) so client can see them
    const now = new Date().toISOString();
    const todayDate = now.slice(0, 10);
    const db = require('../db');
    const allActiveOffers = await db('offers')
      .select('offers.*', 'rewards_catalog.name as reward_name', 'rewards_catalog.logo_url as reward_logo_url', 'rewards_catalog.brand as reward_brand')
      .leftJoin('rewards_catalog', 'offers.reward_id', 'rewards_catalog.id')
      .where('offers.status', 'active')
      .whereRaw("substr(offers.start_date, 1, 10) <= ?", [todayDate])
      .whereRaw("substr(offers.end_date, 1, 10) >= ?", [todayDate])
      .whereNotIn('offers.min_tier', TIER_ORDER.slice(0, TIER_ORDER.indexOf(clientTier) + 1))
      .orderBy('offers.end_date', 'asc');

    const lockedOffers = allActiveOffers.map(o => ({ ...o, client_entered: false, locked: true }));

    res.json({ offers: [...offersWithStatus, ...lockedOffers] });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/offers/:id — single offer detail
 */
const clientGetOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) throw new AppError('OFFER_NOT_FOUND', 'Offer not found', 404);

    const clientId = req.user?.user_id;
    let client_entered = false;
    let client_claim = null;
    if (clientId) {
      const claims = await OfferClaim.findByClientAndOffer(clientId, offer.id);
      client_entered = claims.length > 0;
      client_claim = claims[0] || null;
    }

    res.json({ offer, client_entered, client_claim });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/offers/:id/claim
 */
const clientClaimOffer = async (req, res, next) => {
  try {
    const clientId = req.user?.user_id;
    if (!clientId) throw new AppError('AUTH_REQUIRED', 'Authentication required', 401);

    const dollarAmount = req.body.dollar_amount ? parseInt(req.body.dollar_amount, 10) : null;
    const result = await claimOffer(req.params.id, clientId, { dollarAmount });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/clients/:id/offer-claims
 */
const clientGetOfferClaims = async (req, res, next) => {
  try {
    const claims = await OfferClaim.listByClient(req.params.id);
    res.json({ claims });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  adminListOffers,
  adminCreateOffer,
  adminGetOffer,
  adminUpdateOffer,
  adminDeleteOffer,
  adminGetOfferClaims,
  adminUpdateClaim,
  adminListAllClaims,
  adminDrawWinners,
  adminManualPick,
  clientListOffers,
  clientGetOffer,
  clientClaimOffer,
  clientGetOfferClaims
};
