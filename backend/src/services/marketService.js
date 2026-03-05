const db = require('../db');

/**
 * Applies geographic filters to a query builder on the clients table.
 * @param {object} query - Knex query builder
 * @param {object} filters - { state, market, city }
 * @param {string} [tableAlias] - table alias prefix (e.g. 'clients.')
 */
const applyGeoFilters = (query, { state, market, city }, tableAlias = '') => {
  if (state) query.where(`${tableAlias}address_state`, state);
  if (market) query.where(`${tableAlias}market`, market);
  if (city) query.where(`${tableAlias}address_city`, city);
  return query;
};

/**
 * Applies period filter for clients active during the period.
 */
const applyPeriodFilter = (query, periodStart, tableAlias = '') => {
  return query
    .where(`${tableAlias}created_at`, '<=', db.fn.now())
    .andWhere(function () {
      this.whereNull(`${tableAlias}unenrolled_at`)
        .orWhere(`${tableAlias}unenrolled_at`, '>=', periodStart);
    });
};

/**
 * Gets geographic analytics with drill-down capability.
 * @param {object} options
 * @param {number} options.months
 * @param {string} [options.state]
 * @param {string} [options.market]
 * @param {string} [options.city]
 * @returns {Promise<object>}
 */
const getMarketAnalytics = async ({ months = 6, state, market, city, granularity = 'month', days } = {}) => {
  const isSqlite = db.client.config.client === 'better-sqlite3';
  const periodStart = isSqlite
    ? db.raw(`date('now', 'start of month', '-${months} months')`)
    : db.raw(`date_trunc('month', NOW() - INTERVAL '${months} months')`);

  // Determine current level and groupBy field
  let level, groupByField;
  if (!state) {
    level = 'country';
    groupByField = 'address_state';
  } else if (!market) {
    level = 'state';
    groupByField = 'market';
  } else if (!city) {
    level = 'market';
    groupByField = 'address_city';
  } else {
    level = 'territory';
    groupByField = null;
  }

  const filters = { state, market, city };

  // --- Summary KPIs ---
  const summaryQuery = db('clients').select(
    db.raw('COUNT(*) as total_clients'),
    db.raw('SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_clients'),
    db.raw(isSqlite
      ? "AVG(julianday(COALESCE(unenrolled_at, 'now')) - julianday(created_at)) as avg_days"
      : "AVG(EXTRACT(EPOCH FROM (COALESCE(unenrolled_at, NOW()) - created_at)) / 86400) as avg_days"
    )
  );
  applyGeoFilters(summaryQuery, filters);
  applyPeriodFilter(summaryQuery, periodStart);
  const summaryRow = await summaryQuery.first();

  const revenueQuery = db('points_transactions as pt')
    .join('clients as c', 'pt.client_id', 'c.id')
    .where('pt.transaction_type', 'earn')
    .andWhere('pt.created_at', '>=', periodStart)
    .select(db.raw('SUM(pt.invoice_amount) as total_revenue'));
  applyGeoFilters(revenueQuery, filters, 'c.');
  const revenueRow = await revenueQuery.first();

  const totalClients = parseInt(summaryRow?.total_clients, 10) || 0;
  const activeClients = parseInt(summaryRow?.active_clients, 10) || 0;
  const totalRevenue = parseFloat(revenueRow?.total_revenue) || 0;

  const summary = {
    total_clients: totalClients,
    active_clients: activeClients,
    total_revenue: totalRevenue,
    avg_revenue_per_client: totalClients > 0 ? totalRevenue / totalClients : 0,
    avg_tenure_days: Math.round(parseFloat(summaryRow?.avg_days) || 0),
    retention_pct: totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0
  };

  // --- Breakdown rows (or client list at territory level) ---
  let breakdown = [];
  let clients = [];

  if (level === 'territory') {
    // Leaf level: return individual clients with lifetime revenue and duration
    const clientQuery = db('clients')
      .leftJoin('points_transactions as pt', function () {
        this.on('pt.client_id', '=', 'clients.id')
          .andOn('pt.transaction_type', '=', db.raw("'earn'"));
      })
      .select(
        'clients.id', 'clients.name', 'clients.email', 'clients.care_package',
        'clients.current_tier', 'clients.lifetime_points', 'clients.redeemable_points',
        'clients.is_active', 'clients.created_at',
        db.raw('COALESCE(SUM(pt.invoice_amount), 0) as lifetime_revenue'),
        db.raw(isSqlite
          ? "CAST(julianday(COALESCE(clients.unenrolled_at, 'now')) - julianday(clients.created_at) AS INTEGER) as duration_days"
          : "EXTRACT(EPOCH FROM (COALESCE(clients.unenrolled_at, NOW()) - clients.created_at))::integer / 86400 as duration_days"
        )
      )
      .groupBy('clients.id');
    applyGeoFilters(clientQuery, filters, 'clients.');
    applyPeriodFilter(clientQuery, periodStart, 'clients.');
    clients = await clientQuery.orderBy('clients.lifetime_points', 'desc');
  } else {
    // Client counts per group
    const clientCountQuery = db('clients')
      .select(`${groupByField} as name`)
      .count('* as clients')
      .select(db.raw('SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_clients'))
      .select(db.raw(isSqlite
        ? "AVG(julianday(COALESCE(unenrolled_at, 'now')) - julianday(created_at)) as avg_days"
        : "AVG(EXTRACT(EPOCH FROM (COALESCE(unenrolled_at, NOW()) - created_at)) / 86400) as avg_days"
      ))
      .groupBy(groupByField);
    applyGeoFilters(clientCountQuery, filters);
    applyPeriodFilter(clientCountQuery, periodStart);
    const clientRows = await clientCountQuery;

    // Revenue per group
    const revQuery = db('points_transactions as pt')
      .join('clients as c', 'pt.client_id', 'c.id')
      .select(`c.${groupByField} as name`)
      .sum('pt.invoice_amount as revenue')
      .where('pt.transaction_type', 'earn')
      .andWhere('pt.created_at', '>=', periodStart)
      .groupBy(`c.${groupByField}`);
    applyGeoFilters(revQuery, filters, 'c.');
    const revRows = await revQuery;

    // Tier counts per group
    const tierGroupQuery = db('clients')
      .select(`${groupByField} as name`, 'current_tier')
      .count('* as count')
      .groupBy(groupByField, 'current_tier');
    applyGeoFilters(tierGroupQuery, filters);
    applyPeriodFilter(tierGroupQuery, periodStart);
    const tierGroupRows = await tierGroupQuery;

    const tierGroupMap = {};
    for (const r of tierGroupRows) {
      const key = r.name || 'Unknown';
      if (!tierGroupMap[key]) tierGroupMap[key] = { bronze: 0, silver: 0, gold: 0, platinum: 0, diamond: 0 };
      tierGroupMap[key][r.current_tier] = parseInt(r.count, 10);
    }

    // Care package counts per group
    const pkgGroupQuery = db('clients')
      .select(`${groupByField} as name`, 'care_package')
      .count('* as count')
      .groupBy(groupByField, 'care_package');
    applyGeoFilters(pkgGroupQuery, filters);
    applyPeriodFilter(pkgGroupQuery, periodStart);
    const pkgGroupRows = await pkgGroupQuery;

    const pkgGroupMap = {};
    for (const r of pkgGroupRows) {
      const key = r.name || 'Unknown';
      if (!pkgGroupMap[key]) pkgGroupMap[key] = { essentials: 0, premium: 0, white_glove: 0 };
      pkgGroupMap[key][r.care_package] = parseInt(r.count, 10);
    }

    // Merge results
    const revMap = {};
    for (const r of revRows) {
      revMap[r.name || 'Unknown'] = parseFloat(r.revenue) || 0;
    }

    breakdown = clientRows.map(row => {
      const name = row.name || 'Unknown';
      const rowClients = parseInt(row.clients, 10) || 0;
      const rowActive = parseInt(row.active_clients, 10) || 0;
      const rowRevenue = revMap[name] || 0;
      const tiers = tierGroupMap[name] || { bronze: 0, silver: 0, gold: 0, platinum: 0, diamond: 0 };
      const pkgs = pkgGroupMap[name] || { essentials: 0, premium: 0, white_glove: 0 };
      return {
        name,
        clients: rowClients,
        active_clients: rowActive,
        revenue: rowRevenue,
        avg_revenue_per_client: rowClients > 0 ? rowRevenue / rowClients : 0,
        avg_tenure_days: Math.round(parseFloat(row.avg_days) || 0),
        retention_pct: rowClients > 0 ? Math.round((rowActive / rowClients) * 100) : 0,
        bronze_clients: tiers.bronze,
        silver_clients: tiers.silver,
        gold_clients: tiers.gold,
        platinum_clients: tiers.platinum,
        diamond_clients: tiers.diamond,
        essentials_clients: pkgs.essentials,
        premium_clients: pkgs.premium,
        white_glove_clients: pkgs.white_glove
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }

  // --- Trends (daily, weekly, or monthly) ---
  const byDay = granularity === 'day';
  const byWeek = granularity === 'week';

  let sqliteGroupExpr, pgGroupExpr, periodCol, trendsStart;

  if (byDay) {
    periodCol = 'day';
    sqliteGroupExpr = "date(pt.created_at)";
    pgGroupExpr = "pt.created_at::date";
    trendsStart = days
      ? (isSqlite ? db.raw(`date('now', '-${days} days')`) : db.raw(`NOW() - INTERVAL '${days} days'`))
      : (isSqlite ? db.raw(`date('now', '-${months} months')`) : db.raw(`NOW() - INTERVAL '${months} months'`));
  } else if (byWeek) {
    periodCol = 'week';
    sqliteGroupExpr = "date(pt.created_at, 'weekday 0', '-6 days')";
    pgGroupExpr = "date_trunc('week', pt.created_at)::date";
    trendsStart = isSqlite
      ? db.raw(`date('now', 'weekday 0', '-6 days', '-${months} months')`)
      : db.raw(`date_trunc('week', NOW() - INTERVAL '${months} months')`);
  } else {
    periodCol = 'month';
    sqliteGroupExpr = "strftime('%Y-%m', pt.created_at)";
    pgGroupExpr = "TO_CHAR(pt.created_at, 'YYYY-MM')";
    trendsStart = periodStart;
  }

  const trendsQuery = db('points_transactions as pt')
    .join('clients as c', 'pt.client_id', 'c.id')
    .select(
      db.raw(isSqlite
        ? `${sqliteGroupExpr} as ${periodCol}`
        : `${pgGroupExpr} as ${periodCol}`
      ),
      db.raw("SUM(CASE WHEN pt.transaction_type = 'earn' THEN pt.invoice_amount ELSE 0 END) as revenue"),
      db.raw("SUM(CASE WHEN pt.transaction_type = 'earn' THEN pt.lifetime_points_change ELSE 0 END) as points_accrued")
    )
    .where('pt.created_at', '>=', trendsStart)
    .groupByRaw(isSqlite ? sqliteGroupExpr : pgGroupExpr)
    .orderByRaw(isSqlite ? `${sqliteGroupExpr} ASC` : `${pgGroupExpr} ASC`);
  applyGeoFilters(trendsQuery, filters, 'c.');
  const trendRows = await trendsQuery;
  const trendsKey = byDay ? 'daily_trends' : byWeek ? 'weekly_trends' : 'monthly_trends';
  const trends = trendRows.map(row => ({
    [periodCol]: row[periodCol],
    revenue: parseFloat(row.revenue) || 0,
    points_accrued: parseInt(row.points_accrued, 10) || 0
  }));

  // --- Tier distribution ---
  const tierQuery = db('clients')
    .select('current_tier')
    .count('* as count')
    .groupBy('current_tier');
  applyGeoFilters(tierQuery, filters);
  applyPeriodFilter(tierQuery, periodStart);
  const tierRows = await tierQuery;

  const tierDistribution = { bronze: 0, silver: 0, gold: 0, platinum: 0, diamond: 0 };
  for (const row of tierRows) {
    tierDistribution[row.current_tier] = parseInt(row.count, 10);
  }

  // --- Care package mix ---
  const pkgQuery = db('clients')
    .select('care_package')
    .count('* as count')
    .groupBy('care_package');
  applyGeoFilters(pkgQuery, filters);
  applyPeriodFilter(pkgQuery, periodStart);
  const pkgRows = await pkgQuery;

  const carePackageMix = { essentials: 0, premium: 0, white_glove: 0 };
  for (const row of pkgRows) {
    carePackageMix[row.care_package] = parseInt(row.count, 10);
  }

  const result = {
    level,
    filters,
    summary,
    [trendsKey]: trends,
    tier_distribution: tierDistribution,
    care_package_mix: carePackageMix
  };

  if (level === 'territory') {
    result.clients = clients;
  } else {
    result.breakdown = breakdown;
  }

  return result;
};

module.exports = { getMarketAnalytics };
