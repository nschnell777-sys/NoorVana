const request = require('supertest');
const app = require('../../src/app');
const { cleanDatabase, createTestClient, generateToken } = require('../setup');

let client;
let token;

beforeEach(async () => {
  await cleanDatabase();
  client = await createTestClient({
    lifetime_points: 15000,
    redeemable_points: 15000,
    current_tier: 'silver'
  });
  token = generateToken({ user_id: client.id, user_type: 'client', client_id: client.id });
});

describe('GET /api/v1/clients/:id/loyalty', () => {
  test('returns loyalty status', async () => {
    const res = await request(app)
      .get(`/api/v1/clients/${client.id}/loyalty`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.client_id).toBe(client.id);
    expect(res.body.current_tier).toBe('silver');
    expect(res.body.lifetime_points).toBe(15000);
    expect(res.body.redeemable_points).toBe(15000);
    expect(res.body.next_tier).toBe('gold');
    expect(res.body.tier_multiplier).toBe(1.5);
    expect(res.body.points_to_next_tier).toBe(10000);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app)
      .get(`/api/v1/clients/${client.id}/loyalty`);
    expect(res.status).toBe(401);
  });

  test('returns 404 for non-existent client', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const fakeToken = generateToken({ user_id: fakeId, user_type: 'client', client_id: fakeId });
    const res = await request(app)
      .get(`/api/v1/clients/${fakeId}/loyalty`)
      .set('Authorization', `Bearer ${fakeToken}`);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/clients/:id/redeem', () => {
  test('redeems points successfully', async () => {
    const res = await request(app)
      .post(`/api/v1/clients/${client.id}/redeem`)
      .set('Authorization', `Bearer ${token}`)
      .send({ points: 10000 });

    expect(res.status).toBe(201);
    expect(res.body.points_redeemed).toBe(10000);
    expect(res.body.credit_amount).toBe(50);
    expect(res.body.voucher_code).toMatch(/^NV-/);
    expect(res.body.remaining_redeemable_points).toBe(5000);
  });

  test('fails with insufficient points', async () => {
    const res = await request(app)
      .post(`/api/v1/clients/${client.id}/redeem`)
      .set('Authorization', `Bearer ${token}`)
      .send({ points: 20000 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_POINTS');
  });

  test('fails with non-multiple of 1000', async () => {
    const res = await request(app)
      .post(`/api/v1/clients/${client.id}/redeem`)
      .set('Authorization', `Bearer ${token}`)
      .send({ points: 500 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_REDEMPTION_AMOUNT');
  });
});

describe('GET /api/v1/clients/:id/transactions', () => {
  test('returns empty transactions list', async () => {
    const res = await request(app)
      .get(`/api/v1/clients/${client.id}/transactions`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.transactions).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });
});

describe('GET /api/v1/clients/:id/redemptions', () => {
  test('returns empty redemptions list', async () => {
    const res = await request(app)
      .get(`/api/v1/clients/${client.id}/redemptions`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.redemptions).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });
});
