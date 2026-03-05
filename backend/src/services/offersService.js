const crypto = require('crypto');
const { TIER_ORDER, REDEMPTION_POINTS_PER_UNIT, REDEMPTION_CREDIT_PER_UNIT } = require('../constants/loyalty');
const Offer = require('../models/Offer');
const OfferClaim = require('../models/OfferClaim');
const Client = require('../models/Client');
const { redeemPoints } = require('./redemptionService');
const { AppError, ClientNotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Check if a client's tier meets the minimum tier requirement.
 */
const meetsMinTier = (clientTier, minTier) => {
  return TIER_ORDER.indexOf(clientTier) >= TIER_ORDER.indexOf(minTier);
};

/**
 * Claim an offer for a client.
 * @param {string} offerId
 * @param {string} clientId
 * @param {object} [options]
 * @param {number} [options.dollarAmount] - Dollar amount for deal claims ($50-$500)
 */
const claimOffer = async (offerId, clientId, options = {}) => {
  const offer = await Offer.findById(offerId);
  if (!offer) throw new AppError('OFFER_NOT_FOUND', 'Offer not found', 404);
  if (offer.status !== 'active') throw new AppError('OFFER_NOT_ACTIVE', 'This offer is no longer active', 400);

  // Check dates (treat end_date as end-of-day)
  const now = new Date();
  const startDate = new Date(offer.start_date);
  const endDate = new Date(offer.end_date);
  // If end_date has no time component, set to end of day
  if (offer.end_date && offer.end_date.length === 10) {
    endDate.setHours(23, 59, 59, 999);
  }
  if (now < startDate || now > endDate) {
    throw new AppError('OFFER_EXPIRED', 'This offer has expired', 400);
  }

  const client = await Client.findById(clientId);
  if (!client) throw new ClientNotFoundError(clientId);

  // Tier check
  if (!meetsMinTier(client.current_tier, offer.min_tier)) {
    throw new AppError('TIER_TOO_LOW', `This offer requires ${offer.min_tier} tier or above`, 403);
  }

  if (offer.type === 'deal') {
    return claimDeal(offer, client, options.dollarAmount);
  } else if (offer.type === 'experience') {
    return claimExperience(offer, client);
  } else if (offer.type === 'giveaway') {
    return claimGiveaway(offer, client);
  }

  throw new AppError('INVALID_OFFER_TYPE', 'Unknown offer type', 400);
};

/**
 * Claim a deal — processes as redemption at discounted rate.
 * Supports percentage-based deals where client picks dollar amount ($50-$500).
 * @param {object} offer
 * @param {object} client
 * @param {number} [dollarAmount] - Client-chosen amount for percentage deals
 */
const claimDeal = async (offer, client, dollarAmount) => {
  // Check duplicate
  const existingCount = await OfferClaim.countByClientAndOffer(client.id, offer.id);
  if (existingCount > 0) {
    throw new AppError('ALREADY_CLAIMED', 'You have already claimed this deal', 400);
  }

  // Check quantity
  if (offer.deal_quantity_limit && offer.deal_quantity_claimed >= offer.deal_quantity_limit) {
    throw new AppError('SOLD_OUT', 'This deal has sold out', 400);
  }

  let pointsCost;

  if (offer.deal_discount_percentage && dollarAmount) {
    // Percentage discount model: client picks amount, discount applied
    if (dollarAmount < 50 || dollarAmount > 500 || dollarAmount % 50 !== 0) {
      throw new AppError('INVALID_AMOUNT', 'Dollar amount must be between $50 and $500 in $50 increments', 400);
    }
    const POINTS_PER_DOLLAR = REDEMPTION_POINTS_PER_UNIT / REDEMPTION_CREDIT_PER_UNIT;
    const fullPoints = dollarAmount * POINTS_PER_DOLLAR;
    const discount = offer.deal_discount_percentage / 100;
    // Round down to nearest 1,000 (redemption unit)
    pointsCost = Math.floor(fullPoints * (1 - discount) / 1000) * 1000;
    if (pointsCost < 1000) pointsCost = 1000;
  } else {
    // Legacy: fixed deal_points or original_points
    pointsCost = offer.deal_points || offer.original_points;
  }

  if (!pointsCost || pointsCost <= 0) {
    throw new AppError('INVALID_DEAL', 'Unable to calculate deal cost', 400);
  }

  const redemptionResult = await redeemPoints(client.id, pointsCost, {
    reward_name: dollarAmount ? `$${dollarAmount} ${offer.reward_name || offer.title}` : (offer.reward_name || offer.title),
    reward_category: 'gift_card',
    delivery_method: 'email'
  });

  const claim = await OfferClaim.create({
    offer_id: offer.id,
    client_id: client.id,
    claim_type: 'deal_redemption',
    status: 'claimed'
  });

  await Offer.incrementDealClaimed(offer.id);

  logger.info('Deal claimed', { offerId: offer.id, clientId: client.id, points: pointsCost, dollarAmount });

  return {
    claim,
    redemption: redemptionResult,
    message: `Deal redeemed successfully${dollarAmount ? ` - $${dollarAmount} value for ${pointsCost.toLocaleString()} points` : ''}`
  };
};

/**
 * Claim an experience (first_come or rsvp).
 */
const claimExperience = async (offer, client) => {
  const existingCount = await OfferClaim.countByClientAndOffer(client.id, offer.id);
  if (existingCount > 0) {
    throw new AppError('ALREADY_CLAIMED', 'You have already claimed this experience', 400);
  }

  // For first_come, check spots
  if (offer.claim_type === 'first_come' && offer.spots_available) {
    if (offer.spots_claimed >= offer.spots_available) {
      throw new AppError('SOLD_OUT', 'All spots have been claimed', 400);
    }
  }

  const claimType = offer.claim_type === 'rsvp' ? 'rsvp' : 'experience_claim';

  const claim = await OfferClaim.create({
    offer_id: offer.id,
    client_id: client.id,
    claim_type: claimType,
    status: 'claimed'
  });

  await Offer.incrementSpotsClaimed(offer.id);

  logger.info('Experience claimed', { offerId: offer.id, clientId: client.id, claimType });

  return {
    claim,
    message: "You're in! Your NoorVana Advantage team will contact you with details."
  };
};

/**
 * Enter a giveaway/sweepstakes.
 */
const claimGiveaway = async (offer, client) => {
  if (offer.sweepstakes_drawn) {
    throw new AppError('DRAWING_COMPLETE', 'The drawing for this sweepstakes has already been held', 400);
  }

  const existingCount = await OfferClaim.countByClientAndOffer(client.id, offer.id);
  if (existingCount >= (offer.sweepstakes_entries_allowed || 1)) {
    throw new AppError('ALREADY_ENTERED', 'You have already entered this sweepstakes', 400);
  }

  const claim = await OfferClaim.create({
    offer_id: offer.id,
    client_id: client.id,
    claim_type: 'sweepstakes_entry',
    status: 'entered'
  });

  logger.info('Sweepstakes entry', { offerId: offer.id, clientId: client.id });

  return {
    claim,
    message: `You're entered! Good luck! Winner(s) will be drawn on ${new Date(offer.sweepstakes_draw_date).toLocaleDateString()}.`
  };
};

/**
 * Draw winners for a giveaway using cryptographically secure randomness.
 */
const drawWinners = async (offerId) => {
  const offer = await Offer.findById(offerId);
  if (!offer) throw new AppError('OFFER_NOT_FOUND', 'Offer not found', 404);
  if (offer.type !== 'giveaway') throw new AppError('NOT_GIVEAWAY', 'This offer is not a giveaway', 400);
  if (offer.sweepstakes_drawn) throw new AppError('ALREADY_DRAWN', 'Winners have already been drawn for this offer', 400);

  const entries = await OfferClaim.getEnteredForOffer(offerId);
  if (entries.length === 0) throw new AppError('NO_ENTRIES', 'No entries to draw from', 400);

  const winnersCount = Math.min(offer.sweepstakes_winners_count || 1, entries.length);

  // Cryptographically secure random selection (Fisher-Yates shuffle on indices)
  const indices = entries.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const winnerIndices = new Set(indices.slice(0, winnersCount));
  const winners = [];
  const losers = [];

  entries.forEach((entry, i) => {
    if (winnerIndices.has(i)) {
      winners.push(entry);
    } else {
      losers.push(entry);
    }
  });

  // Update winner statuses
  if (winners.length > 0) {
    await OfferClaim.bulkUpdateStatus(winners.map(w => w.id), 'won');
  }
  // Update loser statuses
  if (losers.length > 0) {
    await OfferClaim.bulkUpdateStatus(losers.map(l => l.id), 'lost');
  }

  await Offer.markDrawn(offerId);

  logger.info('Sweepstakes drawn', {
    offerId,
    totalEntries: entries.length,
    winnersCount: winners.length,
    winnerIds: winners.map(w => w.client_id)
  });

  return {
    offer_id: offerId,
    total_entries: entries.length,
    winners_count: winners.length,
    winners: winners.map(w => ({
      claim_id: w.id,
      client_id: w.client_id,
      client_name: w.client_name,
      client_email: w.client_email,
      client_tier: w.client_tier,
      entry_date: w.created_at
    }))
  };
};

/**
 * Manual pick: admin hand-selects a winner.
 */
const manualPick = async (offerId, clientId) => {
  const offer = await Offer.findById(offerId);
  if (!offer) throw new AppError('OFFER_NOT_FOUND', 'Offer not found', 404);
  if (offer.type !== 'giveaway') throw new AppError('NOT_GIVEAWAY', 'This offer is not a giveaway', 400);

  const claims = await OfferClaim.findByClientAndOffer(clientId, offerId);
  const entry = claims.find(c => c.status === 'entered' || c.status === 'lost');
  if (!entry) throw new AppError('NO_ENTRY', 'This client does not have an eligible entry for this offer', 400);

  await OfferClaim.update(entry.id, { status: 'won' });

  logger.info('Manual winner picked', { offerId, clientId, claimId: entry.id });

  return { claim_id: entry.id, client_id: clientId, status: 'won' };
};

module.exports = { claimOffer, drawWinners, manualPick, meetsMinTier };
