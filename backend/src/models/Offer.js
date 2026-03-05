const db = require('../db');

const Offer = {
  async findById(id) {
    const offer = await db('offers')
      .select('offers.*', 'rewards_catalog.name as reward_name', 'rewards_catalog.logo_url as reward_logo_url', 'rewards_catalog.brand as reward_brand')
      .leftJoin('rewards_catalog', 'offers.reward_id', 'rewards_catalog.id')
      .where('offers.id', id)
      .first();
    return offer;
  },

  async create(data) {
    const [offer] = await db('offers').insert(data).returning('*');
    return offer;
  },

  async update(id, data) {
    const [offer] = await db('offers')
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*');
    return offer;
  },

  async delete(id) {
    return db('offers').where({ id }).del();
  },

  /**
   * List offers with optional filters.
   */
  async list({ status, type, min_tier, page = 1, limit = 50 } = {}) {
    let query = db('offers')
      .select('offers.*', 'rewards_catalog.name as reward_name', 'rewards_catalog.logo_url as reward_logo_url', 'rewards_catalog.brand as reward_brand')
      .leftJoin('rewards_catalog', 'offers.reward_id', 'rewards_catalog.id');
    if (status) query = query.where('offers.status', status);
    if (type) query = query.where('offers.type', type);
    if (min_tier) query = query.where('offers.min_tier', min_tier);

    const countResult = await query.clone().count('* as total').first();
    const total = parseInt(countResult.total, 10);

    const offers = await query
      .orderBy('offers.created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return { offers, total };
  },

  /**
   * List active offers a client is eligible for (by tier).
   */
  async listActiveForClient(clientTier, tierOrder) {
    const now = new Date().toISOString();
    const todayDate = now.slice(0, 10); // 'YYYY-MM-DD' — for date-only comparisons
    const eligibleTiers = tierOrder.slice(0, tierOrder.indexOf(clientTier) + 1);

    // Auto-expire past offers (compare date portion only so end_date day is fully included)
    await db('offers')
      .where('status', 'active')
      .whereRaw("substr(end_date, 1, 10) < ?", [todayDate])
      .update({ status: 'expired', updated_at: db.fn.now() });

    return db('offers')
      .select('offers.*', 'rewards_catalog.name as reward_name', 'rewards_catalog.logo_url as reward_logo_url', 'rewards_catalog.brand as reward_brand')
      .leftJoin('rewards_catalog', 'offers.reward_id', 'rewards_catalog.id')
      .where('offers.status', 'active')
      .whereRaw("substr(offers.start_date, 1, 10) <= ?", [todayDate])
      .whereRaw("substr(offers.end_date, 1, 10) >= ?", [todayDate])
      .whereIn('offers.min_tier', eligibleTiers)
      .orderBy('offers.end_date', 'asc');
  },

  async incrementDealClaimed(id) {
    return db('offers').where({ id }).increment('deal_quantity_claimed', 1).update({ updated_at: db.fn.now() });
  },

  async incrementSpotsClaimed(id) {
    return db('offers').where({ id }).increment('spots_claimed', 1).update({ updated_at: db.fn.now() });
  },

  async markDrawn(id) {
    return db('offers').where({ id }).update({ sweepstakes_drawn: true, updated_at: db.fn.now() });
  }
};

module.exports = Offer;
