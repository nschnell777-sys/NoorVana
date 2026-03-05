const db = require('../db');

const OfferClaim = {
  async findById(id) {
    return db('offer_claims').where({ id }).first();
  },

  async create(data) {
    const [claim] = await db('offer_claims').insert(data).returning('*');
    return claim;
  },

  async update(id, data) {
    const [claim] = await db('offer_claims')
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*');
    return claim;
  },

  /**
   * Find existing claim(s) for a client + offer.
   */
  async findByClientAndOffer(clientId, offerId) {
    return db('offer_claims')
      .where({ client_id: clientId, offer_id: offerId });
  },

  /**
   * Count claims for a client + offer.
   */
  async countByClientAndOffer(clientId, offerId) {
    const result = await db('offer_claims')
      .where({ client_id: clientId, offer_id: offerId })
      .count('* as count')
      .first();
    return parseInt(result.count, 10);
  },

  /**
   * List claims for an offer with client details.
   */
  async listByOffer(offerId, { page = 1, limit = 50 } = {}) {
    const countResult = await db('offer_claims')
      .where('offer_claims.offer_id', offerId)
      .count('* as total')
      .first();
    const total = parseInt(countResult.total, 10);

    const claims = await db('offer_claims')
      .join('clients', 'offer_claims.client_id', 'clients.id')
      .where('offer_claims.offer_id', offerId)
      .select(
        'offer_claims.*',
        'clients.name as client_name',
        'clients.email as client_email',
        'clients.current_tier as client_tier'
      )
      .orderBy('offer_claims.created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return { claims, total };
  },

  /**
   * List all claims across all offers (admin master list).
   */
  async listAll({ offer_id, status, page = 1, limit = 50 } = {}) {
    let query = db('offer_claims')
      .join('clients', 'offer_claims.client_id', 'clients.id')
      .join('offers', 'offer_claims.offer_id', 'offers.id');

    if (offer_id) query = query.where('offer_claims.offer_id', offer_id);
    if (status) query = query.where('offer_claims.status', status);

    const countResult = await query.clone().count('* as total').first();
    const total = parseInt(countResult.total, 10);

    const claims = await query
      .select(
        'offer_claims.*',
        'clients.name as client_name',
        'clients.email as client_email',
        'clients.current_tier as client_tier',
        'offers.title as offer_title',
        'offers.type as offer_type'
      )
      .orderBy('offer_claims.created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return { claims, total };
  },

  /**
   * Get all entered entries for a giveaway (for drawing).
   */
  async getEnteredForOffer(offerId) {
    return db('offer_claims')
      .join('clients', 'offer_claims.client_id', 'clients.id')
      .where('offer_claims.offer_id', offerId)
      .where('offer_claims.status', 'entered')
      .select(
        'offer_claims.*',
        'clients.name as client_name',
        'clients.email as client_email',
        'clients.current_tier as client_tier'
      );
  },

  /**
   * Bulk update status for entries (mark losers).
   */
  async bulkUpdateStatus(ids, status) {
    return db('offer_claims')
      .whereIn('id', ids)
      .update({ status, updated_at: db.fn.now() });
  },

  /**
   * List client's own offer claims.
   */
  async listByClient(clientId) {
    return db('offer_claims')
      .join('offers', 'offer_claims.offer_id', 'offers.id')
      .where('offer_claims.client_id', clientId)
      .select(
        'offer_claims.*',
        'offers.title as offer_title',
        'offers.type as offer_type',
        'offers.image_url as offer_image_url',
        'offers.prize_details',
        'offers.sweepstakes_draw_date',
        'offers.end_date as offer_end_date'
      )
      .orderBy('offer_claims.created_at', 'desc');
  }
};

module.exports = OfferClaim;
