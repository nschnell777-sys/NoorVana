const db = require('../db');
const Client = require('../models/Client');
const { ClientNotFoundError } = require('../utils/errors');

/**
 * GET /api/v1/clients/:id/tier-rewards
 */
const getTierRewards = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new ClientNotFoundError(req.params.id);

    const rewards = await db('tier_rewards')
      .where({ client_id: client.id })
      .orderBy('created_at', 'asc');

    res.json({ rewards });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/clients/:id/tier-rewards/:rewardId/claim
 */
const claimTierReward = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new ClientNotFoundError(req.params.id);

    const reward = await db('tier_rewards')
      .where({ id: req.params.rewardId, client_id: client.id })
      .first();

    if (!reward) {
      return res.status(404).json({ error: { code: 'REWARD_NOT_FOUND', message: 'Tier reward not found' } });
    }

    if (reward.status !== 'available') {
      return res.status(400).json({ error: { code: 'ALREADY_CLAIMED', message: 'This reward has already been claimed' } });
    }

    const [updated] = await db('tier_rewards')
      .where({ id: req.params.rewardId })
      .update({ status: 'claimed', claimed_at: db.fn.now() })
      .returning('*');

    res.json({ reward: updated || { ...reward, status: 'claimed', claimed_at: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTierRewards, claimTierReward };
