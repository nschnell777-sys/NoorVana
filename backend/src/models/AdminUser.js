const db = require('../db');

const AdminUser = {
  /**
   * @param {string} email
   * @returns {Promise<object|undefined>}
   */
  async findByEmail(email) {
    return db('admin_users')
      .where({ email: email.toLowerCase(), is_active: true })
      .first();
  },

  /**
   * @param {string} id
   * @returns {Promise<object|undefined>}
   */
  async findById(id) {
    return db('admin_users').where({ id, is_active: true }).first();
  },

  /**
   * @param {object} data
   * @returns {Promise<object>}
   */
  async create(data) {
    const [user] = await db('admin_users')
      .insert({
        ...data,
        email: data.email.toLowerCase()
      })
      .returning('*');
    return user;
  },

  /**
   * @param {string} id
   * @returns {Promise<void>}
   */
  async updateLastLogin(id) {
    await db('admin_users')
      .where({ id })
      .update({ last_login: db.fn.now() });
  }
};

module.exports = AdminUser;
