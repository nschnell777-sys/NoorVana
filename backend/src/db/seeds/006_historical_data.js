/**
 * Seeds 2 years of historical fulfillment & offer data (Mar 2024 → Dec 2025).
 * APPENDS to existing data — does NOT delete anything.
 *
 * @param {import('knex').Knex} knex
 */
exports.seed = async (knex) => {
  // ── Look up clients ──
  const clients = await knex('clients').select('id', 'name', 'email', 'current_tier', 'is_active',
    'unenrolled_at', 'address_street', 'address_city', 'address_state', 'address_zip', 'created_at');
  const byName = {};
  for (const c of clients) byName[c.name] = c;

  const activeClients = clients.filter(c => c.is_active);
  const allClients = clients;

  // ── Look up rewards catalog ──
  const rewards = await knex('rewards_catalog').select('id', 'name', 'brand', 'category', 'points_cost', 'dollar_value');
  const giftCardRewards = rewards.filter(r => r.category === 'gift_card');
  const serviceCredit = rewards.find(r => r.category === 'service_credit');

  // ── Helpers ──
  let vSeq = 1;
  const voucher = () => `NV-H${String(vSeq++).padStart(4, '0')}`;

  // Deterministic pseudo-random
  const mulberry32 = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const rng = mulberry32(42);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const randInt = (min, max) => min + Math.floor(rng() * (max - min + 1));
  const randDate = (year, month) => {
    const day = randInt(1, 28);
    const hour = randInt(8, 17);
    const min = randInt(0, 59);
    return new Date(year, month, day, hour, min, 0);
  };
  const iso = (d) => d.toISOString();
  const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

  const clientActiveAt = (client, date) => {
    if (new Date(client.created_at) > date) return false;
    if (!client.is_active && client.unenrolled_at && new Date(client.unenrolled_at) < date) return false;
    return true;
  };

  const redemptionAmounts = [
    { points: 2000, credit: 10, label: '$10.00' },
    { points: 5000, credit: 25, label: '$25.00' },
    { points: 10000, credit: 50, label: '$50.00' },
    { points: 20000, credit: 100, label: '$100.00' },
  ];

  const deniedReasons = [
    'Duplicate request — already fulfilled this billing cycle',
    'Insufficient points balance at time of processing',
    'Vendor temporarily out of stock — points refunded',
    'Account under review — please contact support',
    'Gift card brand discontinued by vendor',
    'Request exceeds monthly redemption limit',
  ];

  const giftCardBrands = ['Amazon', 'Starbucks', 'Target', 'Nordstrom', 'Home Depot', 'Apple',
    'Saks Fifth Avenue', 'Darden', 'American Airlines', 'Marriott', 'Hilton', 'Visa Prepaid'];
  const codePrefix = { 'Amazon': 'AMZN', 'Starbucks': 'SBUX', 'Target': 'TGT', 'Nordstrom': 'NORD',
    'Home Depot': 'HD', 'Apple': 'APPL', 'Saks Fifth Avenue': 'SAKS', 'Darden': 'DARD',
    'American Airlines': 'AA', 'Marriott': 'MARR', 'Hilton': 'HILT', 'Visa Prepaid': 'VISA' };

  // ═══════════════════════════════════════════════════════════════
  // 1. HISTORICAL REDEMPTIONS  (Mar 2024 → Dec 2025, ~200 records)
  // ═══════════════════════════════════════════════════════════════
  const redemptions = [];
  for (let y = 2024; y <= 2025; y++) {
    const startMonth = (y === 2024) ? 2 : 0; // Mar 2024 (0-indexed=2), Jan 2025
    const endMonth = (y === 2025) ? 11 : 11;  // Dec
    for (let m = startMonth; m <= endMonth; m++) {
      const count = randInt(7, 12);
      for (let i = 0; i < count; i++) {
        const date = randDate(y, m);
        const eligible = allClients.filter(c => clientActiveAt(c, date));
        if (eligible.length === 0) continue;
        const client = pick(eligible);
        const amt = pick(redemptionAmounts);
        const roll = rng();
        const category = roll < 0.4 ? 'service_credit' : roll < 0.7 ? 'gift_card' : 'product_credit';

        let rewardName, deliveryMethod, fulfillmentDetails = null;
        if (category === 'service_credit') {
          rewardName = `${amt.label} Service Credit`;
          deliveryMethod = 'invoice_credit';
        } else if (category === 'gift_card') {
          const brand = pick(giftCardBrands);
          rewardName = `${brand} Gift Card`;
          deliveryMethod = 'email';
          const pfx = codePrefix[brand] || 'GC';
          fulfillmentDetails = `${pfx}-${randInt(1000, 9999)}-${String.fromCharCode(65 + randInt(0, 25))}${randInt(0, 9)}`;
        } else {
          rewardName = `${amt.label} Product Credit`;
          deliveryMethod = 'shop_pay';
          fulfillmentDetails = `Shop Pay code: NVSHOP-${String.fromCharCode(65 + randInt(0, 25))}${randInt(1, 9)}${String.fromCharCode(65 + randInt(0, 25))}${randInt(1, 9)}${String.fromCharCode(65 + randInt(0, 25))}`;
        }

        const statusRoll = rng();
        let status, fulfilled_at = null, denied_reason = null;
        if (statusRoll < 0.85) {
          status = 'fulfilled';
          fulfilled_at = iso(addDays(date, randInt(1, 3)));
          if (category === 'service_credit') fulfillmentDetails = null; // service credits don't need a code
        } else if (statusRoll < 0.95) {
          status = 'denied';
          denied_reason = pick(deniedReasons);
          fulfillmentDetails = null;
        } else {
          status = 'fulfilled'; // older items shouldn't be pending
          fulfilled_at = iso(addDays(date, randInt(1, 5)));
          if (category === 'service_credit') fulfillmentDetails = null;
        }

        redemptions.push({
          client_id: client.id,
          points_redeemed: amt.points,
          credit_amount: amt.credit,
          voucher_code: voucher(),
          reward_name: rewardName,
          reward_category: category,
          delivery_method: deliveryMethod,
          delivery_status: status === 'fulfilled' ? 'delivered' : 'pending',
          status,
          redeemed_at: iso(date),
          fulfilled_at,
          denied_reason,
          fulfillment_details: status === 'fulfilled' ? fulfillmentDetails : null,
        });
      }
    }
  }

  // Insert in batches of 50
  for (let i = 0; i < redemptions.length; i += 50) {
    await knex('redemption_history').insert(redemptions.slice(i, i + 50));
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. HISTORICAL OFFERS  (~20 offers, Mar 2024 → Dec 2025)
  // ═══════════════════════════════════════════════════════════════
  const offerTemplates = [
    // Deals (8)
    { type: 'deal', title: 'Spring Savings — 15% Off Amazon Gift Cards', desc: 'Enjoy 15% off all Amazon Gift Card redemptions this spring.', min_tier: 'silver', discount: 15, brand: 'Amazon', monthOffset: 0 },
    { type: 'deal', title: 'Summer Special — 25% Off Starbucks Gift Cards', desc: 'Cool down with 25% off Starbucks Gift Cards all month.', min_tier: 'gold', discount: 25, brand: 'Starbucks', monthOffset: 3 },
    { type: 'deal', title: 'Back to School — 20% Off Target Gift Cards', desc: 'Stock up for the school year with 20% off Target Gift Cards.', min_tier: 'silver', discount: 20, brand: 'Target', monthOffset: 5 },
    { type: 'deal', title: 'Holiday Bonus — Double Service Credit Value', desc: 'Ring in the holidays with double the value on service credits.', min_tier: 'gold', discount: 50, brand: null, monthOffset: 9 },
    { type: 'deal', title: "Valentine's Day — 20% Off Nordstrom Gift Cards", desc: "Treat someone special with 20% off Nordstrom Gift Cards.", min_tier: 'platinum', discount: 20, brand: 'Nordstrom', monthOffset: 11 },
    { type: 'deal', title: 'Spring Refresh — 30% Off Home Depot Cards', desc: 'Get your spring projects started with 30% off Home Depot Gift Cards.', min_tier: 'silver', discount: 30, brand: 'Home Depot', monthOffset: 14 },
    { type: 'deal', title: 'Summer Travel — 15% Off American Airlines Cards', desc: 'Plan your summer getaway with discounted airline gift cards.', min_tier: 'gold', discount: 15, brand: 'American Airlines', monthOffset: 16 },
    { type: 'deal', title: 'Fall Harvest — 20% Off Darden Gift Cards', desc: 'Enjoy a family dinner out with 20% off Darden restaurant gift cards.', min_tier: 'silver', discount: 20, brand: 'Darden', monthOffset: 19 },
    // Experiences (7)
    { type: 'experience', title: 'NoorVana Spring Wellness Retreat', desc: 'Join us for a rejuvenating day of yoga, meditation, and gourmet lunch at the Four Seasons.', min_tier: 'gold', spots: 15, monthOffset: 1 },
    { type: 'experience', title: 'Wine Tasting Evening at Pappas Bros', desc: 'An exclusive wine tasting event with sommelier-guided pairings and a four-course dinner.', min_tier: 'platinum', spots: 8, monthOffset: 4 },
    { type: 'experience', title: 'Holiday Cooking Class with Chef Maria', desc: 'Learn to prepare a festive holiday meal with a private cooking class for NoorVana members.', min_tier: 'silver', spots: 20, monthOffset: 8 },
    { type: 'experience', title: 'Spa Day at The Joule Hotel', desc: 'A full day of pampering at The Joule Hotel spa including massage, facial, and lunch.', min_tier: 'gold', spots: 12, monthOffset: 10 },
    { type: 'experience', title: 'Private Museum Tour — Perot Museum', desc: 'Enjoy a private after-hours tour of the Perot Museum with a personal guide.', min_tier: 'silver', spots: 25, monthOffset: 13 },
    { type: 'experience', title: 'Garden Party & Live Jazz', desc: 'An afternoon garden party with live jazz music, canapés, and sparkling wine.', min_tier: 'gold', spots: 30, monthOffset: 17 },
    { type: 'experience', title: 'Thanksgiving Celebration Dinner', desc: 'A special Thanksgiving dinner for NoorVana members and their families at the Ritz-Carlton.', min_tier: 'silver', spots: 40, monthOffset: 20 },
    // Giveaways (5)
    { type: 'giveaway', title: 'Win a $500 Spa Gift Certificate', desc: 'Enter for a chance to win a $500 spa gift certificate for the spa of your choice.', min_tier: 'silver', winners: 1, monthOffset: 2 },
    { type: 'giveaway', title: 'Summer Sweepstakes — $1,000 Travel Voucher', desc: 'Enter to win a $1,000 travel voucher for your next vacation.', min_tier: 'bronze', winners: 2, monthOffset: 6 },
    { type: 'giveaway', title: 'Holiday Raffle — Apple iPad', desc: 'Enter for a chance to win a brand new Apple iPad.', min_tier: 'silver', winners: 1, monthOffset: 9 },
    { type: 'giveaway', title: 'Anniversary Drawing — $2,000 Shopping Spree', desc: 'Celebrate our anniversary with a chance to win a $2,000 shopping spree.', min_tier: 'silver', winners: 1, monthOffset: 15 },
    { type: 'giveaway', title: 'Year-End Raffle — Weekend Getaway Package', desc: 'Win a luxury weekend getaway package including hotel and dining.', min_tier: 'bronze', winners: 2, monthOffset: 21 },
  ];

  const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
  const meetsMinTier = (clientTier, minTier) => tierOrder.indexOf(clientTier) >= tierOrder.indexOf(minTier);

  const offerIds = [];
  for (const tmpl of offerTemplates) {
    const baseMonth = 2; // March 2024 = month index 2
    const totalMonthOffset = baseMonth + tmpl.monthOffset;
    const year = 2024 + Math.floor(totalMonthOffset / 12);
    const month = totalMonthOffset % 12;
    const startDate = new Date(year, month, randInt(1, 10));
    const endDate = addDays(startDate, randInt(14, 28));

    const offerData = {
      type: tmpl.type,
      title: tmpl.title,
      description: tmpl.desc,
      min_tier: tmpl.min_tier,
      start_date: iso(startDate),
      end_date: iso(endDate),
      status: 'expired',
      created_at: iso(addDays(startDate, -randInt(3, 10))),
      updated_at: iso(endDate),
    };

    if (tmpl.type === 'deal') {
      const reward = tmpl.brand ? giftCardRewards.find(r => r.brand === tmpl.brand) : serviceCredit;
      offerData.reward_id = reward ? reward.id : null;
      offerData.deal_discount_percentage = tmpl.discount;
      offerData.deal_quantity_limit = randInt(30, 100);
      offerData.deal_quantity_claimed = randInt(5, offerData.deal_quantity_limit);
    } else if (tmpl.type === 'experience') {
      offerData.claim_type = 'first_come';
      offerData.spots_available = tmpl.spots;
      offerData.spots_claimed = randInt(Math.floor(tmpl.spots * 0.5), tmpl.spots);
      offerData.prize_details = tmpl.desc;
      offerData.event_date = iso(addDays(endDate, randInt(1, 7)));
      offerData.experience_points_cost = pick([0, 0, 5000, 10000]);
    } else {
      offerData.sweepstakes_entries_allowed = 1;
      offerData.sweepstakes_winners_count = tmpl.winners;
      offerData.sweepstakes_drawn = true;
      offerData.sweepstakes_draw_date = iso(addDays(endDate, 1));
      offerData.prize_details = tmpl.desc;
    }

    const [inserted] = await knex('offers').insert(offerData).returning('id');
    const offerId = inserted.id || inserted;
    offerIds.push({ id: offerId, tmpl, startDate, endDate });
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. OFFER CLAIMS  (~100 claims across the 20 offers)
  // ═══════════════════════════════════════════════════════════════
  for (const offer of offerIds) {
    const { id, tmpl, startDate, endDate } = offer;
    const eligible = allClients.filter(c => meetsMinTier(c.current_tier, tmpl.min_tier) && clientActiveAt(c, startDate));
    if (eligible.length === 0) continue;

    let claimCount;
    if (tmpl.type === 'deal') claimCount = randInt(3, 10);
    else if (tmpl.type === 'experience') claimCount = randInt(3, Math.min(eligible.length, tmpl.spots || 10));
    else claimCount = randInt(4, Math.min(eligible.length, 12));

    const used = new Set();
    for (let i = 0; i < claimCount && used.size < eligible.length; i++) {
      let client;
      do { client = pick(eligible); } while (used.has(client.id));
      used.add(client.id);

      const claimDate = new Date(startDate.getTime() + rng() * (endDate.getTime() - startDate.getTime()));

      let claimType, status;
      if (tmpl.type === 'deal') {
        claimType = 'deal_redemption';
        status = rng() < 0.8 ? 'fulfilled' : 'claimed';
      } else if (tmpl.type === 'experience') {
        claimType = rng() < 0.5 ? 'rsvp' : 'experience_claim';
        status = rng() < 0.9 ? 'fulfilled' : 'claimed';
      } else {
        claimType = 'sweepstakes_entry';
        if (i < (tmpl.winners || 1)) status = 'won';
        else status = 'lost';
      }

      await knex('offer_claims').insert({
        offer_id: id,
        client_id: client.id,
        claim_type: claimType,
        status,
        created_at: iso(claimDate),
        updated_at: iso(claimDate),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. HISTORICAL GIFT CLAIMS  (~15, Mar 2024 → Nov 2025)
  // ═══════════════════════════════════════════════════════════════
  const giftTiers = ['silver', 'gold', 'platinum', 'diamond'];
  const giftNames = {
    silver: 'Silver NoorVana Collection Gift',
    gold: 'Gold NoorVana Collection Gift',
    platinum: 'Platinum NoorVana Collection Gift',
    diamond: 'Diamond NoorVana Collection Gift',
  };
  const giftClaims = [];
  for (let i = 0; i < 15; i++) {
    const monthOffset = randInt(0, 19); // spread across 20 months
    const year = 2024 + Math.floor((2 + monthOffset) / 12);
    const month = (2 + monthOffset) % 12;
    const date = randDate(year, month);
    const tier = pick(giftTiers);
    const eligible = allClients.filter(c => meetsMinTier(c.current_tier, tier) && clientActiveAt(c, date));
    if (eligible.length === 0) continue;
    const client = pick(eligible);

    const claimed = date;
    const processed = addDays(claimed, randInt(1, 3));
    const shipped = addDays(processed, randInt(3, 5));
    const delivered = addDays(shipped, randInt(4, 8));

    giftClaims.push({
      client_id: client.id,
      tier,
      gift_name: giftNames[tier],
      status: 'delivered',
      shipping_street: client.address_street,
      shipping_city: client.address_city,
      shipping_state: client.address_state,
      shipping_zip: client.address_zip,
      claimed_at: iso(claimed),
      processed_at: iso(processed),
      shipped_at: iso(shipped),
      delivered_at: iso(delivered),
      tracking_number: `${pick(['UPS', 'FEDEX', 'USPS'])}-${randInt(100000000, 999999999)}`,
      admin_notes: 'Delivered — confirmed by client.',
      created_at: iso(claimed),
    });
  }
  if (giftClaims.length > 0) await knex('gift_claims').insert(giftClaims);

  // ═══════════════════════════════════════════════════════════════
  // 5. HISTORICAL CARD REQUESTS  (~15, Mar 2024 → Dec 2025)
  // ═══════════════════════════════════════════════════════════════
  const cardBrands = [
    { brand: 'Costco', cat: 'retail' }, { brand: 'Whole Foods', cat: 'grocery' },
    { brand: 'Best Buy', cat: 'retail' }, { brand: 'Target', cat: 'retail' },
    { brand: 'Trader Joe\'s', cat: 'grocery' }, { brand: 'Home Depot', cat: 'retail' },
    { brand: 'Nordstrom', cat: 'retail' }, { brand: 'Starbucks', cat: 'dining' },
    { brand: 'Walmart', cat: 'retail' }, { brand: 'CVS', cat: 'retail' },
  ];
  const cardRequests = [];
  for (let i = 0; i < 15; i++) {
    const monthOffset = randInt(0, 21);
    const year = 2024 + Math.floor((2 + monthOffset) / 12);
    const month = (2 + monthOffset) % 12;
    const date = randDate(year, month);
    const eligible = allClients.filter(c => clientActiveAt(c, date));
    if (eligible.length === 0) continue;
    const client = pick(eligible);
    const cb = pick(cardBrands);
    const amount = pick(['$25', '$50', '$100']);
    const points = amount === '$25' ? 5000 : amount === '$50' ? 10000 : 20000;
    const credit = amount === '$25' ? 25 : amount === '$50' ? 50 : 100;

    const statusRoll = rng();
    let status, delivery_code = null;
    if (statusRoll < 0.75) {
      status = 'fulfilled';
      delivery_code = `${cb.brand.substring(0, 3).toUpperCase()}-${randInt(10000, 99999)}-${client.name.split(' ')[1]?.substring(0, 4).toUpperCase() || 'CUST'}`;
    } else {
      status = 'denied';
    }

    cardRequests.push({
      client_id: client.id,
      brand_name: cb.brand,
      category: cb.cat,
      preferred_amount: amount,
      status,
      points_deducted: status === 'fulfilled' ? points : null,
      credit_amount: status === 'fulfilled' ? credit : null,
      voucher_code: status === 'fulfilled' ? voucher() : null,
      delivery_code,
      admin_notes: status === 'fulfilled'
        ? `${cb.brand} digital card delivered.`
        : `${cb.brand} cards not available at this time.`,
      created_at: iso(date),
    });
  }
  if (cardRequests.length > 0) await knex('card_requests').insert(cardRequests);

  // ═══════════════════════════════════════════════════════════════
  // 6. HISTORICAL CONCIERGE REQUESTS  (~12, Mar 2024 → Nov 2025)
  // ═══════════════════════════════════════════════════════════════
  const requestTypes = ['elder_law', 'financial', 'real_estate', 'other'];
  const conciergeDetails = {
    elder_law: [
      'Need help updating power of attorney and healthcare directive documents.',
      'Seeking guidance on Medicaid eligibility and asset protection.',
      'Review and update existing estate plan after recent life changes.',
      'Need assistance with guardianship proceedings for elderly parent.',
    ],
    financial: [
      'Review retirement portfolio and long-term care planning.',
      'Need guidance on long-term care insurance options.',
      'Looking for help with tax planning for medical expenses.',
      'Want to set up a supplemental needs trust for family member.',
    ],
    real_estate: [
      'Need help finding an accessible single-story home.',
      'Looking for a condo with accessibility features near medical facilities.',
      'Want assistance evaluating home modifications vs. moving.',
    ],
    other: [
      'Help planning a milestone birthday celebration.',
      'Need recommendations for in-home meal delivery services.',
      'Looking for vetted home organization professionals.',
    ],
  };
  const conciergeRequests = [];
  for (let i = 0; i < 12; i++) {
    const monthOffset = randInt(0, 19);
    const year = 2024 + Math.floor((2 + monthOffset) / 12);
    const month = (2 + monthOffset) % 12;
    const date = randDate(year, month);
    const eligible = allClients.filter(c =>
      meetsMinTier(c.current_tier, 'gold') && clientActiveAt(c, date)
    );
    if (eligible.length === 0) continue;
    const client = pick(eligible);
    const reqType = pick(requestTypes);
    const details = pick(conciergeDetails[reqType]);
    const hours = pick([1.0, 1.0, 1.5, 2.0, 2.0, 3.0]);

    const statusRoll = rng();
    let status, client_response = null, client_response_at = null, decline_reason = null;
    if (statusRoll < 0.8) {
      status = 'completed';
      client_response = 'approved';
      client_response_at = iso(addDays(date, randInt(3, 7)));
    } else {
      status = 'declined';
      client_response = 'declined';
      client_response_at = iso(addDays(date, randInt(3, 7)));
      decline_reason = pick([
        'Decided to handle this ourselves with family help.',
        'Found a professional through our own network.',
        'Timing doesn\'t work — will request again later.',
      ]);
    }

    conciergeRequests.push({
      client_id: client.id,
      tier: client.current_tier,
      request_type: reqType,
      details,
      preferred_time: pick(['morning', 'afternoon', 'evening']),
      status,
      quoted_hours: hours,
      hours_allocated: status === 'completed' ? hours : 0,
      client_response,
      client_response_at,
      decline_reason,
      admin_notes: status === 'completed'
        ? 'Completed — client satisfied with consultation.'
        : 'Client declined quote. No hours used.',
      created_at: iso(date),
      updated_at: iso(addDays(date, randInt(7, 21))),
    });
  }
  if (conciergeRequests.length > 0) await knex('concierge_requests').insert(conciergeRequests);
};
