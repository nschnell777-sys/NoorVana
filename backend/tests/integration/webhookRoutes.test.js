const crypto = require('crypto');
const request = require('supertest');
const app = require('../../src/app');
const { cleanDatabase, createTestClient } = require('../setup');

const AXISCARE_SECRET = process.env.AXISCARE_WEBHOOK_SECRET || 'test-axiscare-secret';
const GENERIC_SECRET = process.env.GENERIC_WEBHOOK_SECRET || 'test-generic-secret';

const signPayload = (payload, secret) => {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
};

let client;

beforeEach(async () => {
  await cleanDatabase();
  client = await createTestClient({
    axiscare_client_id: 'AC-12345',
    email: 'webhook-test@example.com',
    current_tier: 'bronze',
    lifetime_points: 0,
    redeemable_points: 0
  });
});

describe('POST /webhook/axiscare/payment', () => {
  const makePayload = (overrides = {}) => ({
    event_type: 'payment.created',
    client_id: 'AC-12345',
    client_name: 'Test Client',
    client_email: 'webhook-test@example.com',
    invoice_id: `INV-${Date.now()}`,
    payment_amount: 2000,
    payment_date: new Date().toISOString(),
    care_package: 'premium',
    ...overrides
  });

  test('processes payment and awards Bronze 1.0x points', async () => {
    const payload = makePayload();
    const signature = signPayload(payload, AXISCARE_SECRET);

    const res = await request(app)
      .post('/webhook/axiscare/payment')
      .set('x-axiscare-signature', signature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.points_earned).toBe(2000);
    expect(res.body.multiplier_applied).toBe(1);
    expect(res.body.source).toBe('axiscare');
  });

  test('handles unknown client gracefully (returns 200)', async () => {
    const payload = makePayload({ client_id: 'AC-UNKNOWN', client_email: 'unknown@example.com' });
    const signature = signPayload(payload, AXISCARE_SECRET);

    const res = await request(app)
      .post('/webhook/axiscare/payment')
      .set('x-axiscare-signature', signature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.skipped).toBe(true);
  });

  test('skips duplicate invoice (returns 200)', async () => {
    const payload = makePayload({ invoice_id: 'INV-DUPE-001' });
    const signature = signPayload(payload, AXISCARE_SECRET);

    // First request
    await request(app)
      .post('/webhook/axiscare/payment')
      .set('x-axiscare-signature', signature)
      .send(payload);

    // Second request with same invoice
    const res = await request(app)
      .post('/webhook/axiscare/payment')
      .set('x-axiscare-signature', signature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.skipped).toBe(true);
  });

  test('rejects invalid signature', async () => {
    const payload = makePayload();

    const res = await request(app)
      .post('/webhook/axiscare/payment')
      .set('x-axiscare-signature', 'invalid-signature')
      .send(payload);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('WEBHOOK_SIGNATURE_INVALID');
  });

  test('rejects missing signature', async () => {
    const payload = makePayload();

    const res = await request(app)
      .post('/webhook/axiscare/payment')
      .send(payload);

    expect(res.status).toBe(401);
  });
});

describe('POST /webhook/generic/payment', () => {
  test('processes payment by email match', async () => {
    const payload = {
      source: 'quickbooks',
      client_email: 'webhook-test@example.com',
      invoice_id: `INV-GEN-${Date.now()}`,
      payment_amount: 1500,
      payment_date: new Date().toISOString()
    };
    const signature = signPayload(payload, GENERIC_SECRET);

    const res = await request(app)
      .post('/webhook/generic/payment')
      .set('x-webhook-signature', signature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.points_earned).toBe(1500);
    expect(res.body.source).toBe('quickbooks');
  });
});
