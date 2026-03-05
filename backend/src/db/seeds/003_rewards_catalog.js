/**
 * @param {import('knex').Knex} knex
 */
exports.seed = async (knex) => {
  await knex('rewards_catalog').del();

  const BRAND_DOMAINS = {
    // Shopping
    'Amazon': 'amazon.com',
    'Apple': 'apple.com',
    'Saks Fifth Avenue': 'saksfifthavenue.com',
    'Nordstrom': 'nordstrom.com',
    'Target': 'target.com',
    'Home Depot': 'homedepot.com',
    // Dining
    'Starbucks': 'starbucks.com',
    'Darden': 'darden.com',
    "Landry's": 'landrysrestaurants.com',
    "Bloomin' Brands": 'bloominbrands.com',
    // Travel
    'Delta': 'delta.com',
    'American Airlines': 'aa.com',
    'United Airlines': 'united.com',
    'Four Seasons': 'fourseasons.com',
    'Marriott': 'marriott.com',
    'Hilton': 'hilton.com',
    'Airbnb': 'airbnb.com',
    'Hertz': 'hertz.com',
    // Cards
    'Amex Prepaid': 'americanexpress.com',
    'Visa Prepaid': 'visa.com'
  };

  const giftCards = [
    // Shopping (A-Z)
    { name: 'Amazon Gift Card', brand: 'Amazon', subcategory: 'shopping' },
    { name: 'Apple Gift Card', brand: 'Apple', subcategory: 'shopping' },
    { name: 'Home Depot Gift Card', brand: 'Home Depot', subcategory: 'shopping' },
    { name: 'Nordstrom Gift Card', brand: 'Nordstrom', subcategory: 'shopping' },
    { name: 'Saks Fifth Avenue Gift Card', brand: 'Saks Fifth Avenue', subcategory: 'shopping' },
    { name: 'Target Gift Card', brand: 'Target', subcategory: 'shopping' },
    // Dining
    { name: 'Starbucks Gift Card', brand: 'Starbucks', subcategory: 'dining' },
    { name: 'Darden Gift Card', brand: 'Darden', subcategory: 'dining' },
    { name: "Landry's Gift Card", brand: "Landry's", subcategory: 'dining' },
    { name: "Bloomin' Brands Gift Card", brand: "Bloomin' Brands", subcategory: 'dining' },
    // Travel
    { name: 'American Airlines Gift Card', brand: 'American Airlines', subcategory: 'travel' },
    { name: 'Delta Gift Card', brand: 'Delta', subcategory: 'travel' },
    { name: 'United Airlines Gift Card', brand: 'United Airlines', subcategory: 'travel' },
    { name: 'Four Seasons Gift Card', brand: 'Four Seasons', subcategory: 'travel' },
    { name: 'Marriott Gift Card', brand: 'Marriott', subcategory: 'travel' },
    { name: 'Hilton Gift Card', brand: 'Hilton', subcategory: 'travel' },
    { name: 'Airbnb Gift Card', brand: 'Airbnb', subcategory: 'travel' },
    { name: 'Hertz Gift Card', brand: 'Hertz', subcategory: 'travel' },
    // Cards (A-Z)
    { name: 'Amex Prepaid Card', brand: 'Amex Prepaid', subcategory: 'cards' },
    { name: 'Visa Prepaid Card', brand: 'Visa Prepaid', subcategory: 'cards' }
  ];

  // Brands with locally hosted high-quality app icons
  const LOCAL_LOGOS = {
    'Starbucks': '/uploads/logos/starbucks.png',
    'Airbnb': '/uploads/logos/airbnb.png',
    "Bloomin' Brands": '/uploads/logos/bloominbrands.png',
    'Darden': '/uploads/logos/darden.png'
  };

  const giftCardRows = giftCards.map((gc, idx) => ({
    name: gc.name,
    brand: gc.brand,
    category: 'gift_card',
    subcategory: gc.subcategory,
    sort_order: idx + 10,
    points_cost: null,
    dollar_value: null,
    delivery_method: 'email',
    delivery_timeline: 'Digital delivery',
    min_tier: 'silver',
    logo_url: LOCAL_LOGOS[gc.brand]
      || (BRAND_DOMAINS[gc.brand] ? `https://logo.uplead.com/${BRAND_DOMAINS[gc.brand]}` : null),
    is_active: true
  }));

  await knex('rewards_catalog').insert([
    // Service Credit
    {
      name: 'Service Credit',
      brand: 'NoorVana',
      category: 'service_credit',
      subcategory: null,
      points_cost: null,
      dollar_value: null,
      delivery_method: 'invoice_credit',
      delivery_timeline: 'Applied to next invoice',
      min_tier: 'silver',
      logo_url: null,
      is_active: true,
      sort_order: 1
    },
    // Gift Cards
    ...giftCardRows,
    // Product Credit (coming soon)
    {
      name: 'NoorVana Product Credit',
      brand: 'NoorVana',
      category: 'product_credit',
      subcategory: null,
      points_cost: null,
      dollar_value: null,
      delivery_method: 'shop_pay',
      delivery_timeline: 'Coming Soon',
      min_tier: 'silver',
      logo_url: null,
      is_active: true,
      sort_order: 100
    }
  ]);
};
