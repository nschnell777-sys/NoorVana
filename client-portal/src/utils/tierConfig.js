export const TIER_COLORS = {
  bronze: { bg: '#CD7F32', text: '#FFFFFF', glow: 'rgba(205,127,50,0.35)' },
  silver: { bg: '#C0C0C0', text: '#333333', glow: 'rgba(192,192,192,0.35)' },
  gold: { bg: '#FFD700', text: '#333333', glow: 'rgba(255,215,0,0.35)' },
  platinum: { bg: '#E5E4E2', text: '#333333', glow: 'rgba(229,228,226,0.5)', shimmer: true },
  diamond: { bg: '#B9F2FF', text: '#1A1A1A', glow: 'rgba(185,242,255,0.5)', shimmer: true }
};

export const TIER_LABELS = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond'
};

export const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

export const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 10000,
  gold: 25000,
  platinum: 50000,
  diamond: 100000
};

export const TIER_MULTIPLIERS = {
  bronze: 1.0,
  silver: 1.5,
  gold: 2.0,
  platinum: 2.5,
  diamond: 3.0
};

/** Flat rate: 1,000 points = $5.00 */
export const REDEMPTION_POINTS_PER_UNIT = 1000;
export const REDEMPTION_CREDIT_PER_UNIT = 5;
