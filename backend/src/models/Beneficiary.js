const db = require('../db');

const Beneficiary = {
  async findByClientId(clientId) {
    return db('beneficiaries').where({ client_id: clientId }).first();
  },

  async upsert(clientId, data) {
    const existing = await this.findByClientId(clientId);
    if (existing) {
      const [updated] = await db('beneficiaries')
        .where({ client_id: clientId })
        .update({ ...data, updated_at: db.fn.now() })
        .returning('*');
      return updated;
    }
    const [created] = await db('beneficiaries')
      .insert({ ...data, client_id: clientId })
      .returning('*');
    return created;
  },

  async deleteByClientId(clientId) {
    return db('beneficiaries').where({ client_id: clientId }).del();
  }
};

module.exports = Beneficiary;
