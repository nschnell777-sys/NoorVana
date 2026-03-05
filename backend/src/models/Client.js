const db = require('../db');

const Client = {
  /**
   * @param {string} id
   * @returns {Promise<object|undefined>}
   */
  async findById(id) {
    return db('clients').where({ id }).first();
  },

  /**
   * @param {string} email
   * @returns {Promise<object|undefined>}
   */
  async findByEmail(email) {
    return db('clients').where({ email: email.toLowerCase() }).first();
  },

  /**
   * @param {string} axisCareId
   * @returns {Promise<object|undefined>}
   */
  async findByAxisCareId(axisCareId) {
    return db('clients').where({ axiscare_client_id: axisCareId }).first();
  },

  /**
   * @param {object} data
   * @returns {Promise<object>}
   */
  async create(data) {
    const [client] = await db('clients')
      .insert({
        ...data,
        email: data.email.toLowerCase()
      })
      .returning('*');
    return client;
  },

  /**
   * @param {string} id
   * @param {number} lifetimeChange
   * @param {number} redeemableChange
   * @returns {Promise<object>}
   */
  async updatePoints(id, lifetimeChange, redeemableChange) {
    const [client] = await db('clients')
      .where({ id })
      .increment('lifetime_points', lifetimeChange)
      .increment('redeemable_points', redeemableChange)
      .update({ updated_at: db.fn.now() })
      .returning('*');
    return client;
  },

  /**
   * @param {string} id
   * @param {number} change - positive to hold, negative to release
   * @returns {Promise<object>}
   */
  async updateHeldPoints(id, change) {
    const [client] = await db('clients')
      .where({ id })
      .increment('held_points', change)
      .update({ updated_at: db.fn.now() })
      .returning('*');
    return client;
  },

  /**
   * @param {string} id
   * @param {string} newTier
   * @returns {Promise<object>}
   */
  async updateTier(id, newTier) {
    const [client] = await db('clients')
      .where({ id })
      .update({
        current_tier: newTier,
        tier_upgraded_at: db.fn.now(),
        updated_at: db.fn.now()
      })
      .returning('*');
    return client;
  },

  /**
   * @param {object} options
   * @param {number} options.page
   * @param {number} options.limit
   * @param {string} [options.tier]
   * @param {string} [options.carePackage]
   * @param {string} [options.search]
   * @returns {Promise<{clients: object[], total: number}>}
   */
  /**
   * @param {string} id
   * @param {object} data - { phone, address, address_street, address_apt, address_city, address_state, address_zip }
   * @returns {Promise<object>}
   */
  async updateProfile(id, data) {
    const allowedFields = ['phone', 'address', 'address_street', 'address_apt', 'address_city', 'address_state', 'address_zip'];
    const updates = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) updates[field] = data[field];
    }
    if (Object.keys(updates).length === 0) {
      return this.findById(id);
    }
    updates.updated_at = db.fn.now();
    const [client] = await db('clients')
      .where({ id })
      .update(updates)
      .returning('*');
    return client;
  },

  async markSetupCompleted(id) {
    const [client] = await db('clients')
      .where({ id })
      .update({ setup_completed: true, updated_at: db.fn.now() })
      .returning('*');
    return client;
  },

  async search({ page = 1, limit = 50, tier, carePackage, search }) {
    let query = db('clients').where({ is_active: true });

    if (tier) {
      query = query.where({ current_tier: tier.toLowerCase() });
    }
    if (carePackage) {
      query = query.where({ care_package: carePackage.toLowerCase() });
    }
    if (search) {
      const term = `%${search}%`;
      query = query.where(function () {
        this.whereRaw('LOWER(name) LIKE LOWER(?)', [term])
          .orWhereRaw('LOWER(email) LIKE LOWER(?)', [term])
          .orWhereRaw('LOWER(axiscare_client_id) LIKE LOWER(?)', [term]);
      });
    }

    const countResult = await query.clone().count('* as total').first();
    const total = parseInt(countResult.total, 10);

    const clients = await query
      .orderBy('name', 'asc')
      .limit(limit)
      .offset((page - 1) * limit);

    return { clients, total };
  }
};

module.exports = Client;
