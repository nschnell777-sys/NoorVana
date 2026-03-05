const db = require('../db');

const TierHistory = {
  /**
   * @param {object} data
   * @returns {Promise<object>}
   */
  async create(data) {
    const [record] = await db('tier_history')
      .insert(data)
      .returning('*');
    return record;
  },

  /**
   * @param {string} clientId
   * @returns {Promise<object[]>}
   */
  async findByClientId(clientId) {
    return db('tier_history')
      .where({ client_id: clientId })
      .orderBy('upgraded_at', 'desc');
  }
};

module.exports = TierHistory;
