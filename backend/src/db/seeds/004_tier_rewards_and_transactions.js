/**
 * Simulates the AxisCare payment integration flow.
 * Processes weekly invoices for each client, calculates points using the
 * correct tier multiplier at each step, upgrades tiers when thresholds
 * are crossed, and updates the client's final state.
 *
 * @param {import('knex').Knex} knex
 */
exports.seed = async (knex) => {
  await knex('tier_rewards').del();
  await knex('tier_history').del();
  await knex('points_transactions').del();

  // --- Constants (mirrors backend/src/constants/loyalty.js) ---
  const TIER_THRESHOLDS = { bronze: 0, silver: 10000, gold: 25000, platinum: 50000, diamond: 100000 };
  const TIER_MULTIPLIERS = { bronze: 1.0, silver: 1.5, gold: 2.0, platinum: 2.5, diamond: 3.0 };
  const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

  // Care Package weekly rates: hourly rate × minimum hours/week
  const WEEKLY_RATES = {
    essentials: 960,   // $40/hr × 24 hrs/wk
    premium: 1600,     // $50/hr × 32 hrs/wk
    white_glove: 2400  // $60/hr × 40 hrs/wk
  };

  // Tier reward definitions (mirrors tierService.js)
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

  function determineTier(lifetimePoints) {
    let tier = 'bronze';
    for (const t of TIER_ORDER) {
      if (lifetimePoints >= TIER_THRESHOLDS[t]) tier = t;
    }
    return tier;
  }

  // Seeded PRNG for reproducible but varied invoice amounts
  // Simple mulberry32 — gives same data on every re-seed
  function mulberry32(seed) {
    let t = seed | 0;
    return function () {
      t = (t + 0x6D2B79F5) | 0;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  const clients = await knex('clients').select('id', 'name', 'care_package', 'created_at', 'is_active', 'unenrolled_at');
  const now = new Date();

  for (let ci = 0; ci < clients.length; ci++) {
    const client = clients[ci];
    const weeklyRate = WEEKLY_RATES[client.care_package] || 960;
    const enrollDate = new Date(client.created_at);
    // Start on the Monday of enrollment week
    const startDate = new Date(enrollDate);
    startDate.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7)); // align to Monday
    // Stop generating transactions at unenroll date for inactive clients
    const endDate = client.unenrolled_at ? new Date(client.unenrolled_at) : now;

    // Per-client seeded RNG for reproducible variance
    const rng = mulberry32(ci * 7919 + 42);

    let lifetimePoints = 0;
    let redeemablePoints = 0;
    let currentTier = 'bronze';
    let invoiceNum = 1;

    const txRows = [];
    const tierHistoryRows = [];

    // Process weekly AxisCare invoices from enrollment to endDate
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 7)) {
      // Vary hours ±20% around the base rate to simulate real scheduling variance
      const variance = 0.80 + rng() * 0.40; // 0.80 to 1.20
      const invoiceAmount = Math.round(weeklyRate * variance * 100) / 100;

      // Calculate points at the client's CURRENT tier (before upgrade check)
      const multiplier = TIER_MULTIPLIERS[currentTier];
      const pointsEarned = Math.floor(invoiceAmount * multiplier);

      lifetimePoints += pointsEarned;
      redeemablePoints += pointsEarned;

      // Invoice date: end of the billing week (Sunday), but never past the end date
      let txDate = new Date(d);
      txDate.setDate(txDate.getDate() + 6); // Sunday
      if (txDate > endDate) {
        txDate = new Date(endDate);
      }

      const firstName = client.name.split(' ')[0].toUpperCase();
      const invoiceId = `AC-INV-${firstName}-${String(invoiceNum).padStart(4, '0')}`;

      txRows.push({
        client_id: client.id,
        transaction_type: 'earn',
        source: 'axiscare',
        invoice_id: invoiceId,
        invoice_amount: invoiceAmount,
        lifetime_points_change: pointsEarned,
        redeemable_points_change: pointsEarned,
        tier_at_transaction: currentTier,
        multiplier_applied: multiplier,
        description: `AxisCare weekly payment — ${client.care_package.replace('_', ' ')} care package`,
        created_at: txDate.toISOString()
      });

      invoiceNum++;

      // Check for tier upgrade (same logic as tierService.checkAndUpgradeTier)
      const newTier = determineTier(lifetimePoints);
      if (TIER_ORDER.indexOf(newTier) > TIER_ORDER.indexOf(currentTier)) {
        tierHistoryRows.push({
          client_id: client.id,
          from_tier: currentTier,
          to_tier: newTier,
          lifetime_points_at_upgrade: lifetimePoints,
          upgraded_at: txDate.toISOString()
        });
        currentTier = newTier;
      }
    }

    // Insert transactions
    if (txRows.length > 0) {
      await knex('points_transactions').insert(txRows);
    }

    // Insert tier history
    if (tierHistoryRows.length > 0) {
      await knex('tier_history').insert(tierHistoryRows);
    }

    // Update client with final calculated state
    await knex('clients').where({ id: client.id }).update({
      lifetime_points: lifetimePoints,
      redeemable_points: redeemablePoints,
      current_tier: currentTier
    });

    // Create tier rewards for all tiers the client has reached
    const tierRewardRows = [];
    const clientTierIndex = TIER_ORDER.indexOf(currentTier);
    for (const tier of Object.keys(TIER_REWARD_DEFINITIONS)) {
      const tierIndex = TIER_ORDER.indexOf(tier);
      if (tierIndex <= clientTierIndex) {
        for (const reward of TIER_REWARD_DEFINITIONS[tier]) {
          tierRewardRows.push({
            client_id: client.id,
            tier,
            reward_type: reward.reward_type,
            reward_name: reward.reward_name,
            status: 'available'
          });
        }
      }
    }

    if (tierRewardRows.length > 0) {
      await knex('tier_rewards').insert(tierRewardRows);
    }
  }
};
