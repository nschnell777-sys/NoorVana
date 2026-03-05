const { getMarketAnalytics } = require('../services/marketService');

/**
 * GET /api/v1/admin/reports/markets
 */
const marketAnalytics = async (req, res, next) => {
  try {
    const months = parseInt(req.query.months, 10) || 6;
    const state = req.query.state || undefined;
    const market = req.query.market || undefined;
    const city = req.query.city || undefined;
    const g = req.query.granularity;
    const granularity = g === 'week' ? 'week' : g === 'day' ? 'day' : 'month';
    const days = req.query.days ? parseInt(req.query.days, 10) : undefined;
    const data = await getMarketAnalytics({ months, state, market, city, granularity, days });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

module.exports = { marketAnalytics };
