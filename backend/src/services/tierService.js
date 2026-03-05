const { TIER_THRESHOLDS, TIER_ORDER, TIER_MULTIPLIERS } = require('../constants/loyalty');
const Client = require('../models/Client');
const TierHistory = require('../models/TierHistory');
const db = require('../db');
const logger = require('../utils/logger');

/**
 * Tier reward definitions — rewards unlocked at each tier.
 */
const TIER_REWARD_DEFINITIONS = {
  silver: [
    { reward_type: 'collection_gift', reward_name: 'Silver NoorVana Collection Gift' }
  ],
  gold: [
    { reward_type: 'collection_gift', reward_name: 'Gold NoorVana Collection Gift' },
    { reward_type: 'concierge_hours', reward_name: 'VIP Concierge Support — 1 Hour' }
  ],
  platinum: [
    { reward_type: 'collection_gift', reward_name: 'Platinum NoorVana Collection Gift' },
    { reward_type: 'concierge_hours', reward_name: 'VIP Concierge Support — 3 Hours Total' },
    { reward_type: 'experience', reward_name: 'Priority Access to Concerts/Shows' }
  ],
  diamond: [
    { reward_type: 'collection_gift', reward_name: 'Signature NoorVana Collection Gift' },
    { reward_type: 'concierge_hours', reward_name: 'VIP Concierge Support — 8 Hours Total' },
    { reward_type: 'experience', reward_name: 'Priority Access to Private Dinners/Events' }
  ]
};

/**
 * Determines the correct tier for a given lifetime points total.
 * @param {number} lifetimePoints
 * @returns {string} The tier name
 */
const determineTier = (lifetimePoints) => {
  let tier = 'bronze';
  for (const t of TIER_ORDER) {
    if (lifetimePoints >= TIER_THRESHOLDS[t]) {
      tier = t;
    }
  }
  return tier;
};

/**
 * Returns the next tier above the given tier, or null if at max.
 * @param {string} currentTier
 * @returns {string|null}
 */
const getNextTier = (currentTier) => {
  const index = TIER_ORDER.indexOf(currentTier);
  if (index < 0 || index >= TIER_ORDER.length - 1) return null;
  return TIER_ORDER[index + 1];
};

/**
 * Returns points needed to reach the next tier.
 * @param {string} currentTier
 * @param {number} lifetimePoints
 * @returns {number} 0 if already at max tier
 */
const pointsToNextTier = (currentTier, lifetimePoints) => {
  const nextTier = getNextTier(currentTier);
  if (!nextTier) return 0;
  return Math.max(0, TIER_THRESHOLDS[nextTier] - lifetimePoints);
};

/**
 * Returns progress percentage toward the next tier.
 * @param {string} currentTier
 * @param {number} lifetimePoints
 * @returns {number} 0-100
 */
const progressPercentage = (currentTier, lifetimePoints) => {
  const nextTier = getNextTier(currentTier);
  if (!nextTier) return 100;

  const currentThreshold = TIER_THRESHOLDS[currentTier];
  const nextThreshold = TIER_THRESHOLDS[nextTier];
  const range = nextThreshold - currentThreshold;
  const progress = lifetimePoints - currentThreshold;

  return Math.min(100, Math.round((progress / range) * 1000) / 10);
};

/**
 * Checks if a client should be upgraded and performs the upgrade.
 * @param {object} client - Client record from DB
 * @returns {Promise<{upgraded: boolean, newTier: string|null}>}
 */
const checkAndUpgradeTier = async (client) => {
  const correctTier = determineTier(client.lifetime_points);
  const currentIndex = TIER_ORDER.indexOf(client.current_tier);
  const correctIndex = TIER_ORDER.indexOf(correctTier);

  if (correctIndex <= currentIndex) {
    return { upgraded: false, newTier: null };
  }

  await Client.updateTier(client.id, correctTier);

  await TierHistory.create({
    client_id: client.id,
    from_tier: client.current_tier,
    to_tier: correctTier,
    lifetime_points_at_upgrade: client.lifetime_points
  });

  // Create tier rewards for all newly unlocked tiers
  await createTierRewardsForUpgrade(client.id, currentIndex, correctIndex);

  logger.info('Client tier upgraded', {
    clientId: client.id,
    fromTier: client.current_tier,
    toTier: correctTier,
    lifetimePoints: client.lifetime_points
  });

  return { upgraded: true, newTier: correctTier };
};

/**
 * Creates tier_rewards rows for all tiers between fromTierIndex (exclusive) and toTierIndex (inclusive).
 * Skips rewards that already exist to prevent duplicates.
 * @param {string} clientId
 * @param {number} fromTierIndex
 * @param {number} toTierIndex
 */
const createTierRewardsForUpgrade = async (clientId, fromTierIndex, toTierIndex) => {
  const rows = [];

  for (let i = fromTierIndex + 1; i <= toTierIndex; i++) {
    const tier = TIER_ORDER[i];
    const rewards = TIER_REWARD_DEFINITIONS[tier];
    if (!rewards) continue;

    for (const reward of rewards) {
      // Check if this reward already exists for the client
      const existing = await db('tier_rewards')
        .where({ client_id: clientId, tier, reward_name: reward.reward_name })
        .first();

      if (!existing) {
        rows.push({
          client_id: clientId,
          tier,
          reward_type: reward.reward_type,
          reward_name: reward.reward_name,
          status: 'available'
        });
      }
    }
  }

  if (rows.length > 0) {
    await db('tier_rewards').insert(rows);
    logger.info('Created tier rewards for upgrade', { clientId, rewardsCreated: rows.length });
  }
};

/**
 * Checks if a client should be downgraded after a point reduction and performs the downgrade.
 * @param {object} client - Client record from DB (with updated lifetime_points)
 * @returns {Promise<{downgraded: boolean, newTier: string|null}>}
 */
const checkAndDowngradeTier = async (client) => {
  const correctTier = determineTier(client.lifetime_points);
  const currentIndex = TIER_ORDER.indexOf(client.current_tier);
  const correctIndex = TIER_ORDER.indexOf(correctTier);

  if (correctIndex >= currentIndex) {
    return { downgraded: false, newTier: null };
  }

  await Client.updateTier(client.id, correctTier);

  await TierHistory.create({
    client_id: client.id,
    from_tier: client.current_tier,
    to_tier: correctTier,
    lifetime_points_at_upgrade: client.lifetime_points
  });

  logger.info('Client tier downgraded', {
    clientId: client.id,
    fromTier: client.current_tier,
    toTier: correctTier,
    lifetimePoints: client.lifetime_points
  });

  return { downgraded: true, newTier: correctTier };
};

module.exports = {
  determineTier,
  getNextTier,
  pointsToNextTier,
  progressPercentage,
  checkAndUpgradeTier,
  checkAndDowngradeTier,
  createTierRewardsForUpgrade
};
