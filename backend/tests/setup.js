const db = require('../src/db');

beforeAll(async () => {
  await db.migrate.latest();
});

afterAll(async () => {
  await db.destroy();
});

/**
 * Helper to clean all tables between tests.
 * Must delete in FK-safe order (child tables before parent).
 */
const cleanDatabase = async () => {
  await db('community_posts').del();
  await db('card_requests').del();
  await db('concierge_requests').del();
  await db('gift_claims').del();
  await db('tier_rewards').del();
  await db('redemption_history').del();
  await db('tier_history').del();
  await db('points_transactions').del();
  await db('admin_users').del();
  await db('clients').del();
};

/**
 * Helper to create a test client.
 */
const createTestClient = async (overrides = {}) => {
  const defaults = {
    axiscare_client_id: `AC-${Date.now()}`,
    name: 'Test Client',
    email: `test-${Date.now()}@example.com`,
    care_package: 'premium',
    current_tier: 'bronze',
    lifetime_points: 0,
    redeemable_points: 0
  };
  const [client] = await db('clients').insert({ ...defaults, ...overrides }).returning('*');
  return client;
};

/**
 * Helper to create a test admin user.
 */
const createTestAdmin = async (overrides = {}) => {
  const bcrypt = require('bcryptjs');
  const defaults = {
    name: 'Test Admin',
    email: `admin-${Date.now()}@noorvana.com`,
    password_hash: await bcrypt.hash('TestPassword123!', 12),
    role: 'admin'
  };
  const [admin] = await db('admin_users').insert({ ...defaults, ...overrides }).returning('*');
  return admin;
};

/**
 * Helper to generate a JWT token.
 */
const generateToken = (payload) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
};

module.exports = { cleanDatabase, createTestClient, createTestAdmin, generateToken };
