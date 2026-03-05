const TIER_MULTIPLIERS = {
  bronze: 1.0,
  silver: 1.5,
  gold: 2.0,
  platinum: 2.5,
  diamond: 3.0
};

const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 10000,
  gold: 25000,
  platinum: 50000,
  diamond: 100000
};

const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

const CARE_PACKAGES = ['essentials', 'premium', 'white_glove'];

const TRANSACTION_TYPES = ['earn', 'redeem', 'adjustment'];

const SOURCES = ['axiscare', 'quickbooks', 'manual', 'other'];

const ADMIN_ROLES = ['admin', 'customer_service', 'manager'];

/** Points required per $5 credit (flat rate: 1,000 pts = $5.00) */
const REDEMPTION_POINTS_PER_UNIT = 1000;

/** Dollar credit per redemption unit */
const REDEMPTION_CREDIT_PER_UNIT = 5;

module.exports = {
  TIER_MULTIPLIERS,
  TIER_THRESHOLDS,
  TIER_ORDER,
  CARE_PACKAGES,
  TRANSACTION_TYPES,
  SOURCES,
  ADMIN_ROLES,
  REDEMPTION_POINTS_PER_UNIT,
  REDEMPTION_CREDIT_PER_UNIT
};
