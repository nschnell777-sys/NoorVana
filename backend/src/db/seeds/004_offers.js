/**
 * Seed example offers for testing.
 * @param {import('knex').Knex} knex
 */
exports.seed = async (knex) => {
  await knex('offer_claims').del();
  await knex('offers').del();

  // Look up the Starbucks reward for linking the deal
  const starbucks = await knex('rewards_catalog')
    .where({ brand: 'Starbucks', category: 'gift_card' })
    .first();

  // Look up some clients for seed entries
  const alice = await knex('clients').where({ email: 'alice@example.com' }).first();
  const bob = await knex('clients').where({ email: 'bob@example.com' }).first();
  const carol = await knex('clients').where({ email: 'carol@example.com' }).first();
  const david = await knex('clients').where({ email: 'david@example.com' }).first();

  const now = new Date();
  const feb14 = new Date('2026-02-14T00:00:00Z');
  const feb21 = new Date('2026-02-21T23:59:59Z');
  const feb28 = new Date('2026-02-28T23:59:59Z');
  const mar1 = new Date('2026-03-01T12:00:00Z');
  const jan1 = new Date('2026-01-01T00:00:00Z');
  const jan15 = new Date('2026-01-15T23:59:59Z');

  // 1. Active Deal: Presidents Day Special
  const [deal] = await knex('offers').insert({
    type: 'deal',
    title: "Presidents' Day Special — 20% Off Starbucks Gift Cards",
    description: 'Celebrate Presidents\' Day with 20% off all Starbucks Gift Cards. Redeem at the deal price of 8,000 points instead of the regular 10,000 points for a $50 card.',
    image_url: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=800&q=80',
    min_tier: 'gold',
    start_date: feb14.toISOString(),
    end_date: feb21.toISOString(),
    status: 'active',
    reward_id: starbucks ? starbucks.id : null,
    original_points: 10000,
    deal_points: 8000,
    deal_bonus_value: null,
    deal_quantity_limit: 50,
    deal_quantity_claimed: 0,
    claim_type: null,
    spots_available: null,
    prize_details: null
  }).returning('id');

  // 2. Active Experience: VIP Concert Tickets
  const [experience] = await knex('offers').insert({
    type: 'experience',
    title: 'VIP Concert Tickets for Two — March Gala',
    description: 'Join us for an exclusive evening at the NoorVana March Gala. Enjoy VIP seating, a private meet-and-greet, and complimentary dinner for two.',
    image_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80',
    min_tier: 'platinum',
    start_date: feb14.toISOString(),
    end_date: feb28.toISOString(),
    status: 'active',
    claim_type: 'first_come',
    spots_available: 10,
    spots_claimed: 0,
    prize_details: '2 VIP tickets to the NoorVana March Gala including dinner, drinks, and meet-and-greet access.'
  }).returning('id');

  // 3. Active Giveaway: Southwest Airlines Tickets
  const [giveaway] = await knex('offers').insert({
    type: 'giveaway',
    title: 'Win 2 Round-Trip Southwest Airlines Tickets',
    description: 'Enter for a chance to win two round-trip Southwest Airlines tickets to any domestic destination. One lucky winner will be drawn on March 1st.',
    image_url: 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=800&q=80',
    min_tier: 'silver',
    start_date: feb14.toISOString(),
    end_date: feb28.toISOString(),
    status: 'active',
    sweepstakes_entries_allowed: 1,
    sweepstakes_winners_count: 1,
    sweepstakes_drawn: false,
    sweepstakes_draw_date: mar1.toISOString(),
    prize_details: '2 round-trip Southwest Airlines tickets to any domestic destination (valued at up to $1,200).'
  }).returning('id');

  // 4. Expired Deal: New Year Special
  await knex('offers').insert({
    type: 'deal',
    title: 'New Year Special — Double Service Credit Value',
    description: 'Ring in the new year with double the value on service credits. Get $50 credit for just 5,000 points instead of 10,000.',
    image_url: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=800&q=80',
    min_tier: 'gold',
    start_date: jan1.toISOString(),
    end_date: jan15.toISOString(),
    status: 'expired',
    original_points: 10000,
    deal_points: 5000,
    deal_bonus_value: 50.00,
    deal_quantity_limit: 100,
    deal_quantity_claimed: 37
  });

  // Seed some sample entries for the giveaway
  const giveawayId = giveaway.id || giveaway;
  if (alice) {
    await knex('offer_claims').insert({
      offer_id: giveawayId,
      client_id: alice.id,
      claim_type: 'sweepstakes_entry',
      status: 'entered'
    });
  }
  if (bob) {
    await knex('offer_claims').insert({
      offer_id: giveawayId,
      client_id: bob.id,
      claim_type: 'sweepstakes_entry',
      status: 'entered'
    });
  }
  if (carol) {
    await knex('offer_claims').insert({
      offer_id: giveawayId,
      client_id: carol.id,
      claim_type: 'sweepstakes_entry',
      status: 'entered'
    });
  }
  if (david) {
    await knex('offer_claims').insert({
      offer_id: giveawayId,
      client_id: david.id,
      claim_type: 'sweepstakes_entry',
      status: 'entered'
    });
  }
};
