const db = require('../db');

const SyncLog = {
  /**
   * @param {object} data
   * @returns {Promise<object>}
   */
  async create(data) {
    const insert = { ...data };
    if (insert.details && typeof insert.details === 'object') {
      insert.details = JSON.stringify(insert.details);
    }
    const [log] = await db('sync_logs').insert(insert).returning('*');
    return SyncLog._parse(log);
  },

  /**
   * @param {string} id
   * @returns {Promise<object|undefined>}
   */
  async findById(id) {
    const log = await db('sync_logs').where({ id }).first();
    return log ? SyncLog._parse(log) : undefined;
  },

  /**
   * @param {string} id
   * @param {object} data
   * @returns {Promise<object>}
   */
  async update(id, data) {
    const update = { ...data };
    if (update.details && typeof update.details === 'object') {
      update.details = JSON.stringify(update.details);
    }
    const [log] = await db('sync_logs').where({ id }).update(update).returning('*');
    return SyncLog._parse(log);
  },

  /**
   * @param {object} [options]
   * @param {number} [options.page]
   * @param {number} [options.limit]
   * @param {string} [options.sync_type]
   * @returns {Promise<{logs: object[], total: number}>}
   */
  async list({ page = 1, limit = 20, sync_type } = {}) {
    let query = db('sync_logs');
    if (sync_type) query = query.where('sync_type', sync_type);

    const countResult = await query.clone().count('* as total').first();
    const total = parseInt(countResult.total, 10);

    const logs = await query
      .orderBy('started_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return { logs: logs.map(SyncLog._parse), total };
  },

  /**
   * @param {string} syncType
   * @returns {Promise<object|undefined>}
   */
  async getLastSuccessful(syncType) {
    const log = await db('sync_logs')
      .where({ sync_type: syncType, status: 'completed' })
      .orderBy('completed_at', 'desc')
      .first();
    return log ? SyncLog._parse(log) : undefined;
  },

  /**
   * Parse JSON details field from text storage.
   * @param {object} log
   * @returns {object}
   */
  _parse(log) {
    if (!log) return log;
    if (log.details && typeof log.details === 'string') {
      try { log.details = JSON.parse(log.details); } catch { /* keep as string */ }
    }
    return log;
  }
};

module.exports = SyncLog;
