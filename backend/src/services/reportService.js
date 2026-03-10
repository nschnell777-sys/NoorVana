const db = require('../db');
const PointsTransaction = require('../models/PointsTransaction');

/**
 * Gets tier distribution statistics.
 * @returns {Promise<object>}
 */
const getTierDistribution = async () => {
  const results = await db('clients')
    .select('current_tier')
    .count('* as count')
    .where({ is_active: true })
    .groupBy('current_tier');

  const distribution = { bronze: 0, silver: 0, gold: 0, platinum: 0, diamond: 0 };
  let totalClients = 0;

  for (const row of results) {
    distribution[row.current_tier] = parseInt(row.count, 10);
    totalClients += parseInt(row.count, 10);
  }

  const avgResult = await db('clients')
    .where({ is_active: true })
    .avg('lifetime_points as avg')
    .first();

  const totalRedeemable = await db('clients')
    .where({ is_active: true })
    .sum('redeemable_points as total')
    .first();

  return {
    report_date: new Date().toISOString().split('T')[0],
    total_clients: totalClients,
    tier_distribution: distribution,
    average_lifetime_points: Math.round(parseFloat(avgResult.avg) || 0),
    total_redeemable_points: parseInt(totalRedeemable.total, 10) || 0
  };
};

/**
 * Gets monthly points and redemption statistics, plus period-filtered client stats.
 * @param {number} months
 * @returns {Promise<object>}
 */
const getMonthlyStats = async (months = 6, granularity = 'month', { days } = {}) => {
  const monthlyData = await PointsTransaction.getMonthlyStats(months, granularity, { days });

  // Clients active at any point during the period:
  //   enrolled before now AND (still active OR unenrolled after period start)
  const isSqlite = db.client.config.client === 'better-sqlite3';
  let periodStart;
  if (granularity === 'week') {
    periodStart = isSqlite
      ? db.raw(`date('now', 'weekday 0', '-6 days', '-${months} months')`)
      : db.raw(`date_trunc('week', NOW() - INTERVAL '${months} months')`);
  } else if (granularity === 'day') {
    periodStart = isSqlite
      ? db.raw(`date('now', '-${months} months')`)
      : db.raw(`NOW() - INTERVAL '${months} months'`);
  } else {
    periodStart = isSqlite
      ? db.raw(`date('now', 'start of month', '-${months} months')`)
      : db.raw(`date_trunc('month', NOW() - INTERVAL '${months} months')`);
  }

  const periodClients = await db('clients')
    .where('is_active', true)
    .select(
      db.raw('COUNT(*) as count'),
      db.raw(isSqlite
        ? "AVG(julianday('now') - julianday(created_at)) as avg_days"
        : "AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400) as avg_days"
      )
    )
    .first();

  // Clients per tier (period-filtered)
  const clientsPerTierRows = await db('clients')
    .select('current_tier')
    .count('* as count')
    .where('is_active', true)
    .groupBy('current_tier');

  const clientsPerTier = { bronze: 0, silver: 0, gold: 0, platinum: 0, diamond: 0 };
  for (const row of clientsPerTierRows) {
    clientsPerTier[row.current_tier] = parseInt(row.count, 10);
  }

  // Revenue per tier (period-filtered, based on client's current tier)
  const revenuePerTierRows = await db('points_transactions')
    .join('clients', 'points_transactions.client_id', 'clients.id')
    .select('clients.current_tier as tier')
    .sum('points_transactions.invoice_amount as revenue')
    .where('points_transactions.transaction_type', 'earn')
    .andWhere('points_transactions.created_at', '>=', periodStart)
    .andWhere('clients.is_active', true)
    .groupBy('clients.current_tier');

  const revenuePerTier = { bronze: 0, silver: 0, gold: 0, platinum: 0, diamond: 0 };
  for (const row of revenuePerTierRows) {
    revenuePerTier[row.tier] = parseFloat(row.revenue) || 0;
  }

  // Revenue per state (period-filtered)
  const revenuePerStateRows = await db('points_transactions')
    .join('clients', 'points_transactions.client_id', 'clients.id')
    .select('clients.address_state as state')
    .sum('points_transactions.invoice_amount as revenue')
    .where('points_transactions.transaction_type', 'earn')
    .andWhere('points_transactions.created_at', '>=', periodStart)
    .andWhere('clients.is_active', true)
    .groupBy('clients.address_state')
    .orderBy('revenue', 'desc');

  const revenuePerState = revenuePerStateRows.map(row => ({
    state: row.state || 'Unknown',
    revenue: parseFloat(row.revenue) || 0
  }));

  // Clients per state (period-filtered)
  const clientsPerStateRows = await db('clients')
    .select('address_state as state')
    .count('* as count')
    .where('is_active', true)
    .groupBy('address_state')
    .orderBy('count', 'desc');

  const clientsPerState = clientsPerStateRows.map(row => ({
    state: row.state || 'Unknown',
    count: parseInt(row.count, 10) || 0
  }));

  // Lifetime revenue per client per tier (all-time, based on client's current tier)
  const lifetimeRevPerTierRows = await db('points_transactions')
    .join('clients', 'points_transactions.client_id', 'clients.id')
    .select(
      'clients.current_tier as tier',
      db.raw('SUM(points_transactions.invoice_amount) as revenue'),
      db.raw('COUNT(DISTINCT points_transactions.client_id) as clients')
    )
    .where('points_transactions.transaction_type', 'earn')
    .andWhere('clients.is_active', true)
    .groupBy('clients.current_tier');

  const lifetimeRevPerClientPerTier = { bronze: 0, silver: 0, gold: 0, platinum: 0, diamond: 0 };
  for (const row of lifetimeRevPerTierRows) {
    const rev = parseFloat(row.revenue) || 0;
    const count = parseInt(row.clients, 10) || 0;
    lifetimeRevPerClientPerTier[row.tier] = count > 0 ? rev / count : 0;
  }

  // Revenue per client per state (derived)
  const revenuePerClientPerState = clientsPerState.map(cs => {
    const stateRev = revenuePerState.find(rs => rs.state === cs.state);
    const revenue = stateRev ? stateRev.revenue : 0;
    return {
      state: cs.state,
      revenue_per_client: cs.count > 0 ? revenue / cs.count : 0
    };
  });

  const dataKey = granularity === 'day' ? 'days' : granularity === 'week' ? 'weeks' : 'months';
  return {
    [dataKey]: monthlyData,
    period_clients: parseInt(periodClients?.count, 10) || 0,
    period_avg_tenure_days: Math.round(parseFloat(periodClients?.avg_days) || 0),
    clients_per_tier: clientsPerTier,
    revenue_per_tier: revenuePerTier,
    revenue_per_state: revenuePerState,
    clients_per_state: clientsPerState,
    lifetime_rev_per_client_per_tier: lifetimeRevPerClientPerTier,
    revenue_per_client_per_state: revenuePerClientPerState
  };
};

/**
 * Gets top clients by lifetime points.
 * @param {number} limit
 * @returns {Promise<object[]>}
 */
const getTopClients = async (limit = 10) => {
  return db('clients')
    .where({ is_active: true })
    .orderBy('lifetime_points', 'desc')
    .limit(limit);
};

/**
 * Gets a comprehensive dashboard summary.
 * @returns {Promise<object>}
 */
const getDashboardSummary = async () => {
  const tierData = await getTierDistribution();

  const totalLifetime = await db('clients')
    .where({ is_active: true })
    .sum('lifetime_points as total')
    .first();

  const redemptionStats = await db('redemption_history')
    .count('* as total_redemptions')
    .sum('credit_amount as total_credit_issued')
    .first();

  const recentTransactions = await db('points_transactions')
    .join('clients', 'points_transactions.client_id', 'clients.id')
    .select(
      'points_transactions.id',
      'points_transactions.transaction_type',
      'points_transactions.lifetime_points_change',
      'points_transactions.redeemable_points_change',
      'points_transactions.description',
      'points_transactions.created_at',
      'clients.name as client_name'
    )
    .orderBy('points_transactions.created_at', 'desc')
    .limit(10);

  // Average client tenure in days (active clients only)
  const tenureResult = await db('clients')
    .where('is_active', true)
    .select(db.raw("AVG(julianday('now') - julianday(created_at)) as avg_days"))
    .first();

  // Total clients including inactive
  const allClientsResult = await db('clients').count('* as count').first();
  const totalClientsAll = parseInt(allClientsResult.count, 10) || 0;

  // Average revenue per client (active clients only)
  const revenueResult = await db('points_transactions')
    .join('clients', 'points_transactions.client_id', 'clients.id')
    .where('points_transactions.transaction_type', 'earn')
    .where('clients.is_active', true)
    .select(db.raw('SUM(points_transactions.invoice_amount) as total_revenue, COUNT(DISTINCT points_transactions.client_id) as client_count'))
    .first();

  // Active clients with no earn transactions in 90+ days (or never)
  const inactiveAlerts = await db('clients')
    .leftJoin('points_transactions', function () {
      this.on('points_transactions.client_id', '=', 'clients.id')
        .andOn('points_transactions.transaction_type', '=', db.raw("'earn'"));
    })
    .where('clients.is_active', true)
    .select(
      'clients.id',
      'clients.name',
      'clients.current_tier',
      'clients.care_package',
      db.raw('MAX(points_transactions.created_at) as last_earn_date')
    )
    .groupBy('clients.id')
    .havingRaw("MAX(points_transactions.created_at) < datetime('now', '-90 days') OR MAX(points_transactions.created_at) IS NULL");

  const totalClients = tierData.total_clients || 1;
  const avgTenureDays = Math.round(parseFloat(tenureResult?.avg_days) || 0);
  const totalRevenue = parseFloat(revenueResult?.total_revenue) || 0;
  const avgRevenuePerClient = totalClients > 0 ? totalRevenue / totalClients : 0;

  return {
    total_clients: totalClientsAll,
    active_clients: tierData.total_clients,
    total_lifetime_points: parseInt(totalLifetime.total, 10) || 0,
    total_redeemable_points: tierData.total_redeemable_points,
    total_redemptions: parseInt(redemptionStats.total_redemptions, 10) || 0,
    total_credit_issued: parseFloat(redemptionStats.total_credit_issued) || 0,
    avg_redemptions_per_client: totalClients > 0
      ? (parseFloat(redemptionStats.total_credit_issued) || 0) / totalClients
      : 0,
    avg_tenure_days: avgTenureDays,
    avg_revenue_per_client: avgRevenuePerClient,
    tier_distribution: tierData.tier_distribution,
    recent_activity: recentTransactions,
    inactive_alerts: inactiveAlerts.map((a) => ({
      id: a.id,
      name: a.name,
      current_tier: a.current_tier,
      care_package: a.care_package,
      last_earn_date: a.last_earn_date || null
    }))
  };
};

module.exports = {
  getTierDistribution,
  getMonthlyStats,
  getTopClients,
  getDashboardSummary
};
