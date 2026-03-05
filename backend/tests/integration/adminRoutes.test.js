const request = require('supertest');
const app = require('../../src/app');
const { cleanDatabase, createTestClient, createTestAdmin, generateToken } = require('../setup');

let admin;
let adminToken;
let client;

beforeEach(async () => {
  await cleanDatabase();
  admin = await createTestAdmin();
  client = await createTestClient({
    lifetime_points: 25000,
    redeemable_points: 12000,
    current_tier: 'gold'
  });
  adminToken = generateToken({ user_id: admin.id, user_type: 'admin', role: 'admin' });
});

describe('POST /api/v1/admin/auth/login', () => {
  test('login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: admin.email, password: 'TestPassword123!' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.admin.id).toBe(admin.id);
    expect(res.body.admin.role).toBe('admin');
  });

  test('login with invalid password', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: admin.email, password: 'WrongPassword123!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('GET /api/v1/admin/clients', () => {
  test('lists clients', async () => {
    const res = await request(app)
      .get('/api/v1/admin/clients')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.clients).toHaveLength(1);
    expect(res.body.clients[0].name).toBe('Test Client');
  });

  test('filters by tier', async () => {
    const res = await request(app)
      .get('/api/v1/admin/clients?tier=gold')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.clients).toHaveLength(1);
  });

  test('search by name', async () => {
    const res = await request(app)
      .get('/api/v1/admin/clients?search=Test')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.clients).toHaveLength(1);
  });
});

describe('GET /api/v1/admin/clients/:id', () => {
  test('returns detailed client info', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/clients/${client.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.client.id).toBe(client.id);
    expect(res.body.client.current_tier).toBe('gold');
    expect(res.body.recent_transactions).toBeDefined();
    expect(res.body.recent_redemptions).toBeDefined();
    expect(res.body.tier_history).toBeDefined();
  });
});

describe('POST /api/v1/admin/transactions', () => {
  test('records manual transaction', async () => {
    const res = await request(app)
      .post('/api/v1/admin/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        client_id: client.id,
        invoice_id: 'INV-TEST-001',
        invoice_amount: 2000
      });

    expect(res.status).toBe(201);
    expect(res.body.points_earned).toBe(4000); // Gold 2.0x
    expect(res.body.multiplier_applied).toBe(2);
  });
});

describe('POST /api/v1/admin/clients/:id/adjust', () => {
  test('adjusts points for both buckets', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/clients/${client.id}/adjust`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        points: 1000,
        reason: 'Billing error correction for last month',
        adjust_lifetime: true,
        adjust_redeemable: true
      });

    expect(res.status).toBe(201);
    expect(res.body.lifetime_points_after).toBe(26000);
    expect(res.body.redeemable_points_after).toBe(13000);
  });

  test('manager role cannot adjust points', async () => {
    const managerToken = generateToken({ user_id: admin.id, user_type: 'admin', role: 'manager' });

    const res = await request(app)
      .post(`/api/v1/admin/clients/${client.id}/adjust`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        points: 1000,
        reason: 'Billing error correction for last month',
        adjust_lifetime: true,
        adjust_redeemable: true
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('Reports', () => {
  test('GET /api/v1/admin/reports/tiers', async () => {
    const res = await request(app)
      .get('/api/v1/admin/reports/tiers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total_clients).toBe(1);
    expect(res.body.tier_distribution).toBeDefined();
    expect(res.body.tier_distribution.gold).toBe(1);
  });

  test('GET /api/v1/admin/reports/monthly-stats', async () => {
    const res = await request(app)
      .get('/api/v1/admin/reports/monthly-stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.months).toBeDefined();
  });

  test('GET /api/v1/admin/reports/top-clients', async () => {
    const res = await request(app)
      .get('/api/v1/admin/reports/top-clients')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.clients).toHaveLength(1);
  });
});
