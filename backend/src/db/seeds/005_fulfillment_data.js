/**
 * Seeds realistic fulfillment data across all 6 tabs:
 * - Service Credits (redemption_history, reward_category = 'service_credit')
 * - Product Credits (redemption_history, reward_category = 'product_credit')
 * - Gift Cards (redemption_history, reward_category = 'gift_card')
 * - Requested Cards (card_requests)
 * - Gifts (gift_claims)
 * - Concierge (concierge_requests)
 *
 * Each category gets 1-3 pending items + a mix of approved/fulfilled/denied history.
 *
 * @param {import('knex').Knex} knex
 */
exports.seed = async (knex) => {
  // Clean fulfillment tables (leave points/tier data intact)
  await knex('card_requests').del();
  await knex('concierge_requests').del();
  await knex('gift_claims').del();
  await knex('redemption_history').del();

  // Look up real client IDs by name
  const clientsByName = {};
  const clients = await knex('clients').select('id', 'name', 'email', 'current_tier',
    'address_street', 'address_city', 'address_state', 'address_zip');
  for (const c of clients) {
    clientsByName[c.name] = c;
  }

  // Helper to get client or skip if not found
  const cl = (name) => {
    const c = clientsByName[name];
    if (!c) throw new Error(`Client "${name}" not found — run 002 + 004 seeds first`);
    return c;
  };

  // Voucher code generator
  let voucherSeq = 1;
  const voucher = () => `NV-SEED${String(voucherSeq++).padStart(3, '0')}`;

  // ═══════════════════════════════════════════════════════════════
  // 1. SERVICE CREDITS  (redemption_history, reward_category = 'service_credit')
  // ═══════════════════════════════════════════════════════════════
  await knex('redemption_history').insert([
    // --- 3 Pending ---
    {
      client_id: cl('Bob Smith').id,
      points_redeemed: 2000,
      credit_amount: 10.00,
      voucher_code: voucher(),
      reward_name: '$10.00 Service Credit',
      reward_category: 'service_credit',
      delivery_method: 'invoice_credit',
      status: 'pending',
      redeemed_at: '2026-02-25T14:30:00Z'
    },
    {
      client_id: cl('Carol Williams').id,
      points_redeemed: 10000,
      credit_amount: 50.00,
      voucher_code: voucher(),
      reward_name: '$50.00 Service Credit',
      reward_category: 'service_credit',
      delivery_method: 'invoice_credit',
      status: 'pending',
      redeemed_at: '2026-02-27T09:15:00Z'
    },
    {
      client_id: cl('Sandra Lee').id,
      points_redeemed: 5000,
      credit_amount: 25.00,
      voucher_code: voucher(),
      reward_name: '$25.00 Service Credit',
      reward_category: 'service_credit',
      delivery_method: 'invoice_credit',
      status: 'pending',
      redeemed_at: '2026-03-01T11:00:00Z'
    },
    // --- 5 Fulfilled (approved) ---
    {
      client_id: cl('Alice Johnson').id,
      points_redeemed: 2000,
      credit_amount: 10.00,
      voucher_code: voucher(),
      reward_name: '$10.00 Service Credit',
      reward_category: 'service_credit',
      delivery_method: 'invoice_credit',
      status: 'fulfilled',
      redeemed_at: '2026-01-10T10:00:00Z',
      fulfilled_at: '2026-01-11T09:30:00Z'
    },
    {
      client_id: cl('Bob Smith').id,
      points_redeemed: 5000,
      credit_amount: 25.00,
      voucher_code: voucher(),
      reward_name: '$25.00 Service Credit',
      reward_category: 'service_credit',
      delivery_method: 'invoice_credit',
      status: 'fulfilled',
      redeemed_at: '2026-01-18T14:00:00Z',
      fulfilled_at: '2026-01-19T10:00:00Z'
    },
    {
      client_id: cl('Carol Williams').id,
      points_redeemed: 10000,
      credit_amount: 50.00,
      voucher_code: voucher(),
      reward_name: '$50.00 Service Credit',
      reward_category: 'service_credit',
      delivery_method: 'invoice_credit',
      status: 'fulfilled',
      redeemed_at: '2026-01-22T08:45:00Z',
      fulfilled_at: '2026-01-23T11:00:00Z'
    },
    {
      client_id: cl('Henry Chen').id,
      points_redeemed: 10000,
      credit_amount: 50.00,
      voucher_code: voucher(),
      reward_name: '$50.00 Service Credit',
      reward_category: 'service_credit',
      delivery_method: 'invoice_credit',
      status: 'fulfilled',
      redeemed_at: '2026-02-05T16:00:00Z',
      fulfilled_at: '2026-02-06T09:00:00Z'
    },
    {
      client_id: cl('Nathan Patel').id,
      points_redeemed: 20000,
      credit_amount: 100.00,
      voucher_code: voucher(),
      reward_name: '$100.00 Service Credit',
      reward_category: 'service_credit',
      delivery_method: 'invoice_credit',
      status: 'fulfilled',
      redeemed_at: '2026-02-12T13:00:00Z',
      fulfilled_at: '2026-02-13T10:30:00Z'
    },
    // --- 2 Denied ---
    {
      client_id: cl('Luis Garcia').id,
      points_redeemed: 5000,
      credit_amount: 25.00,
      voucher_code: voucher(),
      reward_name: '$25.00 Service Credit',
      reward_category: 'service_credit',
      delivery_method: 'invoice_credit',
      status: 'denied',
      redeemed_at: '2026-01-15T10:00:00Z',
      denied_reason: 'Duplicate request — credit already applied to January invoice'
    },
    {
      client_id: cl('Thomas Wright').id,
      points_redeemed: 2000,
      credit_amount: 10.00,
      voucher_code: voucher(),
      reward_name: '$10.00 Service Credit',
      reward_category: 'service_credit',
      delivery_method: 'invoice_credit',
      status: 'denied',
      redeemed_at: '2026-02-01T09:00:00Z',
      denied_reason: 'Client account under review — please contact support'
    },
  ]);

  // ═══════════════════════════════════════════════════════════════
  // 2. PRODUCT CREDITS  (redemption_history, reward_category = 'product_credit')
  // ═══════════════════════════════════════════════════════════════
  await knex('redemption_history').insert([
    // --- 2 Pending ---
    {
      client_id: cl('Henry Chen').id,
      points_redeemed: 4000,
      credit_amount: 20.00,
      voucher_code: voucher(),
      reward_name: '$20.00 Product Credit',
      reward_category: 'product_credit',
      delivery_method: 'shop_pay',
      status: 'pending',
      redeemed_at: '2026-02-26T10:30:00Z'
    },
    {
      client_id: cl('Nathan Patel').id,
      points_redeemed: 10000,
      credit_amount: 50.00,
      voucher_code: voucher(),
      reward_name: '$50.00 Product Credit',
      reward_category: 'product_credit',
      delivery_method: 'shop_pay',
      status: 'pending',
      redeemed_at: '2026-02-28T15:00:00Z'
    },
    // --- 3 Fulfilled ---
    {
      client_id: cl('Bob Smith').id,
      points_redeemed: 4000,
      credit_amount: 20.00,
      voucher_code: voucher(),
      reward_name: '$20.00 Product Credit',
      reward_category: 'product_credit',
      delivery_method: 'shop_pay',
      delivery_status: 'delivered',
      status: 'fulfilled',
      redeemed_at: '2026-01-20T11:00:00Z',
      fulfilled_at: '2026-01-21T09:00:00Z',
      fulfillment_details: 'Shop Pay code: NVSHOP-A8K2M'
    },
    {
      client_id: cl('Carol Williams').id,
      points_redeemed: 10000,
      credit_amount: 50.00,
      voucher_code: voucher(),
      reward_name: '$50.00 Product Credit',
      reward_category: 'product_credit',
      delivery_method: 'shop_pay',
      delivery_status: 'delivered',
      status: 'fulfilled',
      redeemed_at: '2026-02-03T14:00:00Z',
      fulfilled_at: '2026-02-04T10:00:00Z',
      fulfillment_details: 'Shop Pay code: NVSHOP-C3J7P'
    },
    {
      client_id: cl('Sandra Lee').id,
      points_redeemed: 4000,
      credit_amount: 20.00,
      voucher_code: voucher(),
      reward_name: '$20.00 Product Credit',
      reward_category: 'product_credit',
      delivery_method: 'shop_pay',
      delivery_status: 'delivered',
      status: 'fulfilled',
      redeemed_at: '2026-02-10T09:30:00Z',
      fulfilled_at: '2026-02-11T08:00:00Z',
      fulfillment_details: 'Shop Pay code: NVSHOP-S1R9N'
    },
    // --- 1 Denied ---
    {
      client_id: cl('Diana Cooper').id,
      points_redeemed: 4000,
      credit_amount: 20.00,
      voucher_code: voucher(),
      reward_name: '$20.00 Product Credit',
      reward_category: 'product_credit',
      delivery_method: 'shop_pay',
      status: 'denied',
      redeemed_at: '2026-01-28T16:00:00Z',
      denied_reason: 'Product credit store currently unavailable — please try again next month'
    },
  ]);

  // ═══════════════════════════════════════════════════════════════
  // 3. GIFT CARDS  (redemption_history, reward_category = 'gift_card')
  // ═══════════════════════════════════════════════════════════════
  await knex('redemption_history').insert([
    // --- 3 Pending ---
    {
      client_id: cl('Carol Williams').id,
      points_redeemed: 10000,
      credit_amount: 50.00,
      voucher_code: voucher(),
      reward_name: 'Amazon Gift Card',
      reward_category: 'gift_card',
      delivery_method: 'email',
      status: 'pending',
      redeemed_at: '2026-02-24T10:00:00Z'
    },
    {
      client_id: cl('Bob Smith').id,
      points_redeemed: 5000,
      credit_amount: 25.00,
      voucher_code: voucher(),
      reward_name: 'Starbucks Gift Card',
      reward_category: 'gift_card',
      delivery_method: 'email',
      status: 'pending',
      redeemed_at: '2026-02-26T13:45:00Z'
    },
    {
      client_id: cl('Nathan Patel').id,
      points_redeemed: 20000,
      credit_amount: 100.00,
      voucher_code: voucher(),
      reward_name: 'Nordstrom Gift Card',
      reward_category: 'gift_card',
      delivery_method: 'email',
      status: 'pending',
      redeemed_at: '2026-03-01T08:30:00Z'
    },
    // --- 6 Fulfilled (various brands for grouping) ---
    {
      client_id: cl('Alice Johnson').id,
      points_redeemed: 5000,
      credit_amount: 25.00,
      voucher_code: voucher(),
      reward_name: 'Amazon Gift Card',
      reward_category: 'gift_card',
      delivery_method: 'email',
      status: 'fulfilled',
      redeemed_at: '2026-01-05T09:00:00Z',
      fulfilled_at: '2026-01-06T10:00:00Z',
      fulfillment_details: 'Amazon code: AMZN-X7K2-P9M1'
    },
    {
      client_id: cl('Henry Chen').id,
      points_redeemed: 10000,
      credit_amount: 50.00,
      voucher_code: voucher(),
      reward_name: 'Amazon Gift Card',
      reward_category: 'gift_card',
      delivery_method: 'email',
      status: 'fulfilled',
      redeemed_at: '2026-01-12T11:00:00Z',
      fulfilled_at: '2026-01-13T09:30:00Z',
      fulfillment_details: 'Amazon code: AMZN-R4N8-Q2L5'
    },
    {
      client_id: cl('Sandra Lee').id,
      points_redeemed: 5000,
      credit_amount: 25.00,
      voucher_code: voucher(),
      reward_name: 'Starbucks Gift Card',
      reward_category: 'gift_card',
      delivery_method: 'email',
      status: 'fulfilled',
      redeemed_at: '2026-01-20T14:00:00Z',
      fulfilled_at: '2026-01-21T10:00:00Z',
      fulfillment_details: 'Starbucks code: SBUX-8823-1199'
    },
    {
      client_id: cl('Bob Smith').id,
      points_redeemed: 5000,
      credit_amount: 25.00,
      voucher_code: voucher(),
      reward_name: 'Starbucks Gift Card',
      reward_category: 'gift_card',
      delivery_method: 'email',
      status: 'fulfilled',
      redeemed_at: '2026-02-01T09:15:00Z',
      fulfilled_at: '2026-02-02T08:00:00Z',
      fulfillment_details: 'Starbucks code: SBUX-4417-5502'
    },
    {
      client_id: cl('Luis Garcia').id,
      points_redeemed: 10000,
      credit_amount: 50.00,
      voucher_code: voucher(),
      reward_name: 'Target Gift Card',
      reward_category: 'gift_card',
      delivery_method: 'email',
      status: 'fulfilled',
      redeemed_at: '2026-02-08T10:30:00Z',
      fulfilled_at: '2026-02-09T09:00:00Z',
      fulfillment_details: 'Target code: TGT-29384-X'
    },
    {
      client_id: cl('Diana Cooper').id,
      points_redeemed: 20000,
      credit_amount: 100.00,
      voucher_code: voucher(),
      reward_name: 'Nordstrom Gift Card',
      reward_category: 'gift_card',
      delivery_method: 'email',
      status: 'fulfilled',
      redeemed_at: '2026-02-14T15:00:00Z',
      fulfilled_at: '2026-02-15T10:00:00Z',
      fulfillment_details: 'Nordstrom code: NORD-772B-MM1'
    },
    // --- 2 Denied ---
    {
      client_id: cl('George Palmer').id,
      points_redeemed: 5000,
      credit_amount: 25.00,
      voucher_code: voucher(),
      reward_name: 'Target Gift Card',
      reward_category: 'gift_card',
      delivery_method: 'email',
      status: 'denied',
      redeemed_at: '2026-01-25T11:00:00Z',
      denied_reason: 'Gift card vendor temporarily out of stock — points refunded'
    },
    {
      client_id: cl('Maria Nguyen').id,
      points_redeemed: 5000,
      credit_amount: 25.00,
      voucher_code: voucher(),
      reward_name: 'Amazon Gift Card',
      reward_category: 'gift_card',
      delivery_method: 'email',
      status: 'denied',
      redeemed_at: '2026-02-10T09:00:00Z',
      denied_reason: 'Duplicate redemption — same card already delivered on Feb 8'
    },
  ]);

  // ═══════════════════════════════════════════════════════════════
  // 4. REQUESTED CARDS  (card_requests)
  // ═══════════════════════════════════════════════════════════════
  await knex('card_requests').insert([
    // --- 2 Pending ---
    {
      client_id: cl('Bob Smith').id,
      brand_name: 'Costco',
      category: 'retail',
      preferred_amount: '$50',
      notes: 'Would love a Costco card for bulk household supplies.',
      status: 'pending',
      created_at: '2026-02-22T10:00:00Z'
    },
    {
      client_id: cl('Sandra Lee').id,
      brand_name: 'Whole Foods',
      category: 'grocery',
      preferred_amount: '$25',
      notes: 'Organic groceries for meal prep at home.',
      status: 'pending',
      created_at: '2026-02-28T14:00:00Z'
    },
    // --- 1 Quoted (waiting for client) ---
    {
      client_id: cl('Carol Williams').id,
      brand_name: 'REI',
      category: 'retail',
      preferred_amount: '$100',
      notes: 'Outdoor gear and accessories.',
      status: 'quoted',
      admin_notes: 'REI cards available in $25/$50/$100 denominations. Quoted at $100 = 20,000 pts.',
      created_at: '2026-02-18T11:00:00Z'
    },
    // --- 3 Approved (client confirmed, awaiting delivery code) ---
    {
      client_id: cl('Henry Chen').id,
      brand_name: 'Best Buy',
      category: 'retail',
      preferred_amount: '$50',
      notes: 'New headphones for my caregiver.',
      status: 'approved',
      points_deducted: 10000,
      credit_amount: 50.00,
      admin_notes: 'Best Buy digital card. Client confirmed.',
      created_at: '2026-02-10T09:00:00Z'
    },
    // --- 3 Fulfilled ---
    {
      client_id: cl('Nathan Patel').id,
      brand_name: 'Whole Foods',
      category: 'grocery',
      preferred_amount: '$50',
      status: 'fulfilled',
      points_deducted: 10000,
      credit_amount: 50.00,
      voucher_code: voucher(),
      delivery_code: 'WF-88432-PATEL',
      admin_notes: 'Whole Foods digital card delivered.',
      created_at: '2026-01-15T10:00:00Z'
    },
    {
      client_id: cl('Bob Smith').id,
      brand_name: 'Best Buy',
      category: 'retail',
      preferred_amount: '$25',
      status: 'fulfilled',
      points_deducted: 5000,
      credit_amount: 25.00,
      voucher_code: voucher(),
      delivery_code: 'BB-11290-SMITH',
      admin_notes: 'Best Buy $25 digital card sent via email.',
      created_at: '2026-01-08T14:00:00Z'
    },
    {
      client_id: cl('Carol Williams').id,
      brand_name: 'Costco',
      category: 'retail',
      preferred_amount: '$50',
      status: 'fulfilled',
      points_deducted: 10000,
      credit_amount: 50.00,
      voucher_code: voucher(),
      delivery_code: 'COSTCO-55781-WILL',
      created_at: '2026-01-22T10:00:00Z'
    },
    // --- 2 Denied ---
    {
      client_id: cl('Luis Garcia').id,
      brand_name: 'GameStop',
      category: 'retail',
      preferred_amount: '$25',
      notes: 'For my grandson who visits.',
      status: 'denied',
      admin_notes: 'GameStop cards not available through our vendor network at this time.',
      created_at: '2026-01-12T10:00:00Z'
    },
    {
      client_id: cl('Thomas Wright').id,
      brand_name: 'Trader Joe\'s',
      category: 'grocery',
      preferred_amount: '$25',
      notes: 'Love their snacks.',
      status: 'denied',
      admin_notes: 'Trader Joe\'s does not offer gift cards. Suggested Whole Foods as an alternative.',
      created_at: '2026-02-05T09:00:00Z'
    },
  ]);

  // ═══════════════════════════════════════════════════════════════
  // 5. GIFTS  (gift_claims)
  // ═══════════════════════════════════════════════════════════════
  await knex('gift_claims').insert([
    // --- 2 Claimed (pending) ---
    {
      client_id: cl('Bob Smith').id,
      tier: 'silver',
      gift_name: 'Silver NoorVana Collection Gift',
      status: 'claimed',
      shipping_street: '456 Elm St',
      shipping_city: 'Plano',
      shipping_state: 'TX',
      shipping_zip: '75024',
      claimed_at: '2026-02-20T10:00:00Z',
      created_at: '2026-02-20T10:00:00Z'
    },
    {
      client_id: cl('Sandra Lee').id,
      tier: 'gold',
      gift_name: 'Gold NoorVana Collection Gift',
      status: 'claimed',
      shipping_street: '7000 E Camelback Rd',
      shipping_city: 'Scottsdale',
      shipping_state: 'AZ',
      shipping_zip: '85251',
      claimed_at: '2026-02-28T09:00:00Z',
      created_at: '2026-02-28T09:00:00Z'
    },
    // --- 1 Processing ---
    {
      client_id: cl('Carol Williams').id,
      tier: 'gold',
      gift_name: 'Gold NoorVana Collection Gift',
      status: 'processing',
      shipping_street: '789 Maple Dr',
      shipping_city: 'Frisco',
      shipping_state: 'TX',
      shipping_zip: '75034',
      claimed_at: '2026-02-10T11:00:00Z',
      processed_at: '2026-02-12T09:00:00Z',
      admin_notes: 'Order placed with Boundless Collection — order #BC-4412',
      created_at: '2026-02-10T11:00:00Z'
    },
    // --- 1 Shipped ---
    {
      client_id: cl('Henry Chen').id,
      tier: 'silver',
      gift_name: 'Silver NoorVana Collection Gift',
      status: 'shipped',
      shipping_street: '3400 Turtle Creek Blvd',
      shipping_city: 'Dallas',
      shipping_state: 'TX',
      shipping_zip: '75219',
      claimed_at: '2026-01-28T10:00:00Z',
      processed_at: '2026-01-30T09:00:00Z',
      shipped_at: '2026-02-03T14:00:00Z',
      tracking_number: 'UPS-1Z999AA10123456784',
      admin_notes: 'Boundless Collection order #BC-4389. Shipped via UPS Ground.',
      created_at: '2026-01-28T10:00:00Z'
    },
    // --- 5 Delivered (various gifts for grouping) ---
    {
      client_id: cl('Alice Johnson').id,
      tier: 'silver',
      gift_name: 'Silver NoorVana Collection Gift',
      status: 'delivered',
      shipping_street: '123 Oak Ln',
      shipping_city: 'Dallas',
      shipping_state: 'TX',
      shipping_zip: '75201',
      claimed_at: '2025-12-01T10:00:00Z',
      processed_at: '2025-12-03T09:00:00Z',
      shipped_at: '2025-12-07T14:00:00Z',
      delivered_at: '2025-12-12T11:00:00Z',
      tracking_number: 'UPS-1Z999AA10123450001',
      admin_notes: 'Delivered — confirmed by client.',
      created_at: '2025-12-01T10:00:00Z'
    },
    {
      client_id: cl('Nathan Patel').id,
      tier: 'silver',
      gift_name: 'Silver NoorVana Collection Gift',
      status: 'delivered',
      shipping_street: '500 E Palmetto Park Rd',
      shipping_city: 'Boca Raton',
      shipping_state: 'FL',
      shipping_zip: '33432',
      claimed_at: '2025-12-10T09:00:00Z',
      processed_at: '2025-12-12T10:00:00Z',
      shipped_at: '2025-12-15T13:00:00Z',
      delivered_at: '2025-12-20T10:00:00Z',
      tracking_number: 'FEDEX-794644790568',
      created_at: '2025-12-10T09:00:00Z'
    },
    {
      client_id: cl('Nathan Patel').id,
      tier: 'gold',
      gift_name: 'Gold NoorVana Collection Gift',
      status: 'delivered',
      shipping_street: '500 E Palmetto Park Rd',
      shipping_city: 'Boca Raton',
      shipping_state: 'FL',
      shipping_zip: '33432',
      claimed_at: '2026-01-05T09:00:00Z',
      processed_at: '2026-01-07T10:00:00Z',
      shipped_at: '2026-01-10T14:00:00Z',
      delivered_at: '2026-01-15T11:30:00Z',
      tracking_number: 'FEDEX-794644790612',
      created_at: '2026-01-05T09:00:00Z'
    },
    {
      client_id: cl('Luis Garcia').id,
      tier: 'silver',
      gift_name: 'Silver NoorVana Collection Gift',
      status: 'delivered',
      shipping_street: '800 Brickell Ave',
      shipping_city: 'Miami',
      shipping_state: 'FL',
      shipping_zip: '33131',
      claimed_at: '2026-01-08T14:00:00Z',
      processed_at: '2026-01-10T09:00:00Z',
      shipped_at: '2026-01-14T12:00:00Z',
      delivered_at: '2026-01-18T15:00:00Z',
      tracking_number: 'UPS-1Z999AA10123450088',
      created_at: '2026-01-08T14:00:00Z'
    },
    {
      client_id: cl('Diana Cooper').id,
      tier: 'silver',
      gift_name: 'Silver NoorVana Collection Gift',
      status: 'delivered',
      shipping_street: '100 Market St',
      shipping_city: 'Charleston',
      shipping_state: 'SC',
      shipping_zip: '29401',
      claimed_at: '2026-01-20T10:00:00Z',
      processed_at: '2026-01-22T09:00:00Z',
      shipped_at: '2026-01-25T13:00:00Z',
      delivered_at: '2026-01-30T10:30:00Z',
      tracking_number: 'USPS-9405511899563771234567',
      created_at: '2026-01-20T10:00:00Z'
    },
  ]);

  // ═══════════════════════════════════════════════════════════════
  // 6. CONCIERGE  (concierge_requests)
  // ═══════════════════════════════════════════════════════════════
  await knex('concierge_requests').insert([
    // --- 1 New ---
    {
      client_id: cl('Sandra Lee').id,
      tier: 'diamond',
      request_type: 'elder_law',
      details: 'Need help reviewing my mother\'s estate plan and updating her power of attorney documents. She recently moved from Arizona to be closer to family.',
      preferred_date: 'March 10-14, 2026',
      preferred_time: 'morning',
      status: 'new',
      created_at: '2026-02-28T09:00:00Z'
    },
    // --- 1 Reviewing ---
    {
      client_id: cl('Nathan Patel').id,
      tier: 'gold',
      request_type: 'financial',
      details: 'Looking for guidance on long-term care insurance options and how they interact with our family trust.',
      preferred_date: 'March 5-7, 2026',
      preferred_time: 'afternoon',
      status: 'reviewing',
      admin_notes: 'Researching LTC insurance advisors in Boca Raton area. Two candidates identified.',
      created_at: '2026-02-22T14:00:00Z'
    },
    // --- 1 Quoted (waiting for client) ---
    {
      client_id: cl('Carol Williams').id,
      tier: 'platinum',
      request_type: 'real_estate',
      details: 'Need assistance finding a single-story home with accessibility features in the Frisco/McKinney area. Budget around $500K-$700K.',
      preferred_date: 'March 2026',
      preferred_time: 'afternoon',
      status: 'quoted',
      quoted_hours: 2.0,
      admin_notes: 'Connected with Sara Mitchell, accessibility-focused realtor at Compass. Quoted 2 hours for initial consultation and property tours.',
      created_at: '2026-02-15T10:00:00Z'
    },
    // --- 1 Approved ---
    {
      client_id: cl('Sandra Lee').id,
      tier: 'diamond',
      request_type: 'financial',
      details: 'Would like help setting up a supplemental needs trust for my daughter with special needs. Need someone familiar with Arizona state requirements.',
      preferred_date: 'February 20, 2026',
      preferred_time: 'morning',
      status: 'approved',
      quoted_hours: 3.0,
      hours_allocated: 3.0,
      client_response: 'approved',
      client_response_at: '2026-02-12T10:00:00Z',
      admin_notes: 'Approved. Connecting with Thomas Kline, special needs planning attorney at Fennemore Craig.',
      created_at: '2026-02-05T11:00:00Z'
    },
    // --- 1 Connected ---
    {
      client_id: cl('Nathan Patel').id,
      tier: 'platinum',
      request_type: 'elder_law',
      details: 'Assist with Medicaid planning and asset protection strategy. Father-in-law may need nursing home care within the next year.',
      preferred_date: 'February 2026',
      preferred_time: 'evening',
      status: 'connected',
      quoted_hours: 2.0,
      hours_allocated: 2.0,
      client_response: 'approved',
      client_response_at: '2026-01-28T14:00:00Z',
      appointment_date: 'February 18, 2026 at 5:30 PM',
      admin_notes: 'Connected with Elder Law Associates of South Florida. Initial meeting scheduled.',
      created_at: '2026-01-20T09:00:00Z'
    },
    // --- 4 Completed (various types for grouping) ---
    {
      client_id: cl('Sandra Lee').id,
      tier: 'diamond',
      request_type: 'real_estate',
      details: 'Needed help finding an accessible condo in Scottsdale with 24-hour concierge service and medical facility proximity.',
      status: 'completed',
      quoted_hours: 2.0,
      hours_allocated: 2.0,
      client_response: 'approved',
      client_response_at: '2025-11-05T10:00:00Z',
      appointment_date: 'November 10, 2025 at 10:00 AM',
      admin_notes: 'Completed — client toured 4 properties and made an offer on unit at The Optima.',
      created_at: '2025-10-28T10:00:00Z'
    },
    {
      client_id: cl('Carol Williams').id,
      tier: 'gold',
      request_type: 'elder_law',
      details: 'Update will and establish durable power of attorney for healthcare decisions.',
      status: 'completed',
      quoted_hours: 1.0,
      hours_allocated: 1.0,
      client_response: 'approved',
      client_response_at: '2025-12-10T09:00:00Z',
      appointment_date: 'December 15, 2025 at 2:00 PM',
      admin_notes: 'Completed — all documents executed and filed. Client very satisfied.',
      created_at: '2025-12-01T10:00:00Z'
    },
    {
      client_id: cl('Nathan Patel').id,
      tier: 'gold',
      request_type: 'financial',
      details: 'Review retirement portfolio allocation given changing care needs and expenses.',
      status: 'completed',
      quoted_hours: 1.0,
      hours_allocated: 1.0,
      client_response: 'approved',
      client_response_at: '2025-12-18T11:00:00Z',
      appointment_date: 'December 22, 2025 at 3:00 PM',
      admin_notes: 'Completed — financial advisor provided portfolio adjustment recommendations.',
      created_at: '2025-12-12T09:00:00Z'
    },
    {
      client_id: cl('Henry Chen').id,
      tier: 'gold',
      request_type: 'elder_law',
      details: 'Need help with guardianship proceedings for an elderly parent who can no longer manage finances.',
      status: 'completed',
      quoted_hours: 1.0,
      hours_allocated: 1.0,
      client_response: 'approved',
      client_response_at: '2026-01-08T10:00:00Z',
      appointment_date: 'January 12, 2026 at 11:00 AM',
      admin_notes: 'Completed — guardianship petition filed with Dallas County probate court.',
      created_at: '2026-01-02T10:00:00Z'
    },
    // --- 2 Declined ---
    {
      client_id: cl('Carol Williams').id,
      tier: 'platinum',
      request_type: 'other',
      details: 'Looking for help planning a 50th wedding anniversary party at a venue in the DFW area.',
      status: 'declined',
      quoted_hours: 1.5,
      client_response: 'declined',
      client_response_at: '2026-02-03T16:00:00Z',
      decline_reason: 'We decided to plan the party ourselves with help from family. Thank you though!',
      admin_notes: 'Client declined quote. No hours used.',
      created_at: '2026-01-25T10:00:00Z'
    },
    {
      client_id: cl('Henry Chen').id,
      tier: 'gold',
      request_type: 'financial',
      details: 'Want to explore reverse mortgage options for my home in Dallas.',
      status: 'declined',
      quoted_hours: 1.0,
      client_response: 'declined',
      client_response_at: '2026-02-10T09:00:00Z',
      decline_reason: 'After discussing with family, we decided a reverse mortgage isn\'t the right move for us right now.',
      admin_notes: 'Client declined. No further action needed.',
      created_at: '2026-02-02T14:00:00Z'
    },
  ]);
};
