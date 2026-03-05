const { getTierDistribution, getMonthlyStats, getTopClients, getDashboardSummary } = require('../services/reportService');

/**
 * GET /api/v1/admin/reports/tiers
 */
const tierDistribution = async (req, res, next) => {
  try {
    const report = await getTierDistribution();
    res.json(report);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/reports/monthly-stats
 */
const monthlyStats = async (req, res, next) => {
  try {
    const months = parseInt(req.query.months, 10) || 6;
    const days = req.query.days ? parseInt(req.query.days, 10) : undefined;
    const g = req.query.granularity;
    const granularity = g === 'week' ? 'week' : g === 'day' ? 'day' : 'month';
    const stats = await getMonthlyStats(months, granularity, { days });
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/reports/top-clients
 */
const topClients = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const clients = await getTopClients(limit);
    res.json({
      clients: clients.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        care_package: c.care_package,
        current_tier: c.current_tier,
        lifetime_points: c.lifetime_points,
        redeemable_points: c.redeemable_points
      }))
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/dashboard
 */
const dashboardSummary = async (req, res, next) => {
  try {
    const summary = await getDashboardSummary();
    res.json(summary);
  } catch (err) {
    next(err);
  }
};

module.exports = { tierDistribution, monthlyStats, topClients, dashboardSummary };
