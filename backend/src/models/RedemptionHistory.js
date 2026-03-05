const db = require('../db');

const RedemptionHistory = {
  /**
   * @param {object} data
   * @returns {Promise<object>}
   */
  async create(data) {
    const [record] = await db('redemption_history')
      .insert(data)
      .returning('*');
    return record;
  },

  /**
   * @param {string} clientId
   * @param {object} options
   * @param {number} options.page
   * @param {number} options.limit
   * @returns {Promise<{redemptions: object[], total: number}>}
   */
  async findByClientId(clientId, { page = 1, limit = 20 } = {}) {
    const query = db('redemption_history').where({ client_id: clientId });

    const countResult = await query.clone().count('* as total').first();
    const total = parseInt(countResult.total, 10);

    const redemptions = await query
      .orderBy('redeemed_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return { redemptions, total };
  },

  /**
   * @param {string} voucherCode
   * @returns {Promise<object|undefined>}
   */
  async findByVoucherCode(voucherCode) {
    return db('redemption_history').where({ voucher_code: voucherCode }).first();
  }
};

module.exports = RedemptionHistory;
