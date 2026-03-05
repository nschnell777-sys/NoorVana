const db = require('../db');

/**
 * GET /api/v1/rewards-catalog
 */
const getRewardsCatalog = async (req, res, next) => {
  try {
    const { category, subcategory } = req.query;
    let query = db('rewards_catalog').where({ is_active: true });

    if (category) {
      query = query.where({ category });
    }
    if (subcategory) {
      query = query.where({ subcategory });
    }

    const rewards = await query.orderBy('sort_order', 'asc');

    res.json({ rewards });
  } catch (err) {
    next(err);
  }
};

module.exports = { getRewardsCatalog };
