const request = require('supertest');
const app = require('../../src/app');
const { cleanDatabase, createTestClient, generateToken } = require('../setup');

describe('Full redemption flow', () => {
  let client;
  let token;

  beforeEach(async () => {
    await cleanDatabase();
    client = await createTestClient({
      lifetime_points: 50000,
      redeemable_points: 30000,
      current_tier: 'platinum'
    });
    token = generateToken({ user_id: client.id, user_type: 'client', client_id: client.id });
  });

  test('redeem, check balance, redeem again', async () => {
    // First redemption
    const res1 = await request(app)
      .post(`/api/v1/clients/${client.id}/redeem`)
      .set('Authorization', `Bearer ${token}`)
      .send({ points: 20000 });

    expect(res1.status).toBe(201);
    expect(res1.body.credit_amount).toBe(100);
    expect(res1.body.remaining_redeemable_points).toBe(10000);

    // Check balance - lifetime unchanged
    const status = await request(app)
      .get(`/api/v1/clients/${client.id}/loyalty`)
      .set('Authorization', `Bearer ${token}`);

    expect(status.body.lifetime_points).toBe(50000);
    expect(status.body.redeemable_points).toBe(10000);
    expect(status.body.current_tier).toBe('platinum');

    // Second redemption
    const res2 = await request(app)
      .post(`/api/v1/clients/${client.id}/redeem`)
      .set('Authorization', `Bearer ${token}`)
      .send({ points: 10000 });

    expect(res2.status).toBe(201);
    expect(res2.body.remaining_redeemable_points).toBe(0);

    // Cannot redeem more
    const res3 = await request(app)
      .post(`/api/v1/clients/${client.id}/redeem`)
      .set('Authorization', `Bearer ${token}`)
      .send({ points: 10000 });

    expect(res3.status).toBe(400);
    expect(res3.body.error.code).toBe('INSUFFICIENT_POINTS');
  });

  test('redemption appears in history', async () => {
    await request(app)
      .post(`/api/v1/clients/${client.id}/redeem`)
      .set('Authorization', `Bearer ${token}`)
      .send({ points: 10000 });

    const res = await request(app)
      .get(`/api/v1/clients/${client.id}/redemptions`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.redemptions).toHaveLength(1);
    expect(res.body.redemptions[0].points_redeemed).toBe(10000);
    expect(res.body.redemptions[0].credit_amount).toBe(50);
    expect(res.body.redemptions[0].voucher_code).toMatch(/^NV-/);
  });

  test('redemption creates transaction record', async () => {
    await request(app)
      .post(`/api/v1/clients/${client.id}/redeem`)
      .set('Authorization', `Bearer ${token}`)
      .send({ points: 10000 });

    const res = await request(app)
      .get(`/api/v1/clients/${client.id}/transactions?type=redeem`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.transactions).toHaveLength(1);
    expect(res.body.transactions[0].type).toBe('redeem');
  });
});

describe('Tier upgrade via payment does not affect redemption balance', () => {
  test('earning points that trigger tier upgrade', async () => {
    const client = await createTestClient({
      lifetime_points: 9500,
      redeemable_points: 9500,
      current_tier: 'bronze'
    });
    const token = generateToken({ user_id: client.id, user_type: 'client', client_id: client.id });
    const adminToken = generateToken({ user_id: 'admin-id', user_type: 'admin', role: 'admin' });

    // Admin records a payment that pushes past silver threshold
    const res = await request(app)
      .post('/api/v1/admin/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        client_id: client.id,
        invoice_id: 'INV-TIER-UP',
        invoice_amount: 1000
      });

    expect(res.status).toBe(201);
    expect(res.body.points_earned).toBe(1000); // Bronze 1.0x
    expect(res.body.tier_upgraded).toBe(true);
    expect(res.body.current_tier).toBe('silver');

    // Verify new status
    const status = await request(app)
      .get(`/api/v1/clients/${client.id}/loyalty`)
      .set('Authorization', `Bearer ${token}`);

    expect(status.body.current_tier).toBe('silver');
    expect(status.body.lifetime_points).toBe(10500);
    expect(status.body.redeemable_points).toBe(10500);
    expect(status.body.tier_multiplier).toBe(1.5);
  });
});
