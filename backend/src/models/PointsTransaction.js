const db = require('../db');

const PointsTransaction = {
  /**
   * @param {object} data
   * @returns {Promise<object>}
   */
  async create(data) {
    const [transaction] = await db('points_transactions')
      .insert(data)
      .returning('*');
    return transaction;
  },

  /**
   * @param {string} invoiceId
   * @returns {Promise<object|undefined>}
   */
  async findByInvoiceId(invoiceId) {
    return db('points_transactions')
      .where({ invoice_id: invoiceId, transaction_type: 'earn' })
      .first();
  },

  /**
   * @param {string} clientId
   * @param {object} options
   * @param {number} options.page
   * @param {number} options.limit
   * @param {string} [options.type]
   * @returns {Promise<{transactions: object[], total: number}>}
   */
  async findByClientId(clientId, { page = 1, limit = 20, type, search, dateFrom, dateTo } = {}) {
    // Inner query: all client transactions with cumulative redeemable balance via window function
    const innerQuery = db('points_transactions')
      .select('*')
      .select(db.raw('SUM(redeemable_points_change) OVER (ORDER BY created_at ASC, id ASC) as running_balance'))
      .select(db.raw('SUM(lifetime_points_change) OVER (ORDER BY created_at ASC, id ASC) as lifetime_running_balance'))
      .where({ client_id: clientId });

    // Outer query: apply type filter on top (so running_balance is computed over ALL types)
    let query = db.from(innerQuery.as('t'));
    if (type) {
      query = query.where('t.transaction_type', type);
    }
    if (search) {
      query = query.where('t.description', 'like', `%${search}%`);
    }
    if (dateFrom) {
      query = query.where('t.created_at', '>=', dateFrom);
    }
    if (dateTo) {
      query = query.where('t.created_at', '<=', dateTo);
    }

    const countResult = await query.clone().count('* as total').first();
    const total = parseInt(countResult.total, 10);

    const transactions = await query.clone()
      .orderBy('t.created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return { transactions, total };
  },

  /**
   * @param {number} months - Number of months to look back
   * @returns {Promise<object[]>}
   */
  async getMonthlyStats(months = 6, granularity = 'month', { days } = {}) {
    const isSqlite = db.client.config.client === 'better-sqlite3';
    const byDay = granularity === 'day';
    const byWeek = granularity === 'week';

    let sqliteGroupExpr, sqliteStartExpr, pgGroupExpr, pgStartExpr, periodCol;

    if (byDay) {
      periodCol = 'day';
      sqliteGroupExpr = "date(created_at)";
      sqliteStartExpr = days
        ? `date('now', '-${days} days')`
        : `date('now', '-${months} months')`;
      pgGroupExpr = "created_at::date";
      pgStartExpr = days
        ? `NOW() - INTERVAL '${days} days'`
        : `NOW() - INTERVAL '${months} months'`;
    } else if (byWeek) {
      periodCol = 'week';
      sqliteGroupExpr = "date(created_at, 'weekday 0', '-6 days')";
      sqliteStartExpr = `date('now', 'weekday 0', '-6 days', '-${months} months')`;
      pgGroupExpr = "date_trunc('week', created_at)::date";
      pgStartExpr = `date_trunc('week', NOW() - INTERVAL '${months} months')`;
    } else {
      periodCol = 'month';
      sqliteGroupExpr = "strftime('%Y-%m', created_at)";
      sqliteStartExpr = `date('now', 'start of month', '-${months} months')`;
      pgGroupExpr = "TO_CHAR(created_at, 'YYYY-MM')";
      pgStartExpr = `date_trunc('month', NOW() - INTERVAL '${months} months')`;
    }

    if (isSqlite) {
      return db('points_transactions')
        .select(
          db.raw(`${sqliteGroupExpr} as ${periodCol}`),
          db.raw("SUM(CASE WHEN transaction_type = 'earn' THEN invoice_amount ELSE 0 END) as revenue"),
          db.raw("SUM(CASE WHEN transaction_type = 'earn' THEN lifetime_points_change ELSE 0 END) as points_accrued"),
          db.raw("COUNT(CASE WHEN transaction_type = 'redeem' THEN 1 END) as redemptions_count"),
          db.raw("SUM(CASE WHEN transaction_type = 'redeem' THEN ABS(redeemable_points_change) ELSE 0 END) / 1000.0 * 5.0 as redemptions_value")
        )
        .where('created_at', '>=', db.raw(sqliteStartExpr))
        .groupByRaw(sqliteGroupExpr)
        .orderByRaw(`${sqliteGroupExpr} ASC`);
    }

    return db('points_transactions')
      .select(
        db.raw(`${pgGroupExpr} as ${periodCol}`),
        db.raw("SUM(CASE WHEN transaction_type = 'earn' THEN invoice_amount ELSE 0 END) as revenue"),
        db.raw("SUM(CASE WHEN transaction_type = 'earn' THEN lifetime_points_change ELSE 0 END) as points_accrued"),
        db.raw("COUNT(CASE WHEN transaction_type = 'redeem' THEN 1 END) as redemptions_count"),
        db.raw("SUM(CASE WHEN transaction_type = 'redeem' THEN ABS(redeemable_points_change) ELSE 0 END) / 1000.0 * 5.0 as redemptions_value")
      )
      .where('created_at', '>=', db.raw(pgStartExpr))
      .groupByRaw(pgGroupExpr)
      .orderByRaw(`${pgGroupExpr} ASC`);
  }
};

module.exports = PointsTransaction;
