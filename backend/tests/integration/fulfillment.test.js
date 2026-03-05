const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/db');
const { cleanDatabase, createTestClient, createTestAdmin, generateToken } = require('../setup');

// ---------------------------------------------------------------------------
// Gift Claims Workflow
// ---------------------------------------------------------------------------
describe('Gift Claims Fulfillment Workflow', () => {
  let admin;
  let adminToken;
  let client;
  let claimId;

  beforeEach(async () => {
    await cleanDatabase();

    admin = await createTestAdmin();
    client = await createTestClient({
      current_tier: 'gold',
      lifetime_points: 25000,
      redeemable_points: 10000
    });

    adminToken = generateToken({ user_id: admin.id, role: 'admin', type: 'admin' });

    // Insert a gift_claim directly
    await db('gift_claims').insert({
      client_id: client.id,
      tier: 'gold',
      gift_name: 'Gold NoorVana Collection Gift',
      status: 'claimed',
      shipping_address: '123 Main St\nAnytown, CA 90210'
    });

    // SQLite may not return from .returning(), so look it up
    const claim = await db('gift_claims')
      .where({ client_id: client.id, tier: 'gold' })
      .first();
    claimId = claim.id;
  });

  test('GET /api/v1/admin/gift-claims returns claims list', async () => {
    const res = await request(app)
      .get('/api/v1/admin/gift-claims')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.claims).toHaveLength(1);
    expect(res.body.claims[0].status).toBe('claimed');
    expect(res.body.claims[0].client_name).toBe(client.name);
  });

  test('PATCH to "processing" succeeds', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/gift-claims/${claimId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'processing' });

    expect(res.status).toBe(200);
    expect(res.body.claim.status).toBe('processing');
    expect(res.body.claim.processed_at).toBeTruthy();
  });

  test('PATCH to "shipped" without tracking_number fails with 400', async () => {
    // First move to processing
    await request(app)
      .patch(`/api/v1/admin/gift-claims/${claimId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'processing' });

    // Attempt to ship without tracking
    const res = await request(app)
      .patch(`/api/v1/admin/gift-claims/${claimId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'shipped' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_TRACKING');
  });

  test('PATCH to "shipped" with tracking_number succeeds', async () => {
    // Move to processing first
    await request(app)
      .patch(`/api/v1/admin/gift-claims/${claimId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'processing' });

    // Ship with tracking
    const res = await request(app)
      .patch(`/api/v1/admin/gift-claims/${claimId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'shipped', tracking_number: 'TRACK-12345' });

    expect(res.status).toBe(200);
    expect(res.body.claim.status).toBe('shipped');
    expect(res.body.claim.tracking_number).toBe('TRACK-12345');
    expect(res.body.claim.shipped_at).toBeTruthy();
  });

  test('PATCH to "delivered" succeeds after shipped', async () => {
    // processing -> shipped -> delivered
    await request(app)
      .patch(`/api/v1/admin/gift-claims/${claimId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'processing' });

    await request(app)
      .patch(`/api/v1/admin/gift-claims/${claimId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'shipped', tracking_number: 'TRACK-99999' });

    const res = await request(app)
      .patch(`/api/v1/admin/gift-claims/${claimId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'delivered' });

    expect(res.status).toBe(200);
    expect(res.body.claim.status).toBe('delivered');
    expect(res.body.claim.delivered_at).toBeTruthy();
  });

  test('Invalid transition (delivered -> claimed) fails with 400', async () => {
    // Walk through the full lifecycle first
    await request(app)
      .patch(`/api/v1/admin/gift-claims/${claimId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'processing' });

    await request(app)
      .patch(`/api/v1/admin/gift-claims/${claimId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'shipped', tracking_number: 'TRACK-00001' });

    await request(app)
      .patch(`/api/v1/admin/gift-claims/${claimId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'delivered' });

    // Try to go backwards
    const res = await request(app)
      .patch(`/api/v1/admin/gift-claims/${claimId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'claimed' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  test('Invalid transition (claimed -> shipped) fails with 400', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/gift-claims/${claimId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'shipped', tracking_number: 'TRACK-SKIP' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });
});

// ---------------------------------------------------------------------------
// Concierge Requests Workflow
// ---------------------------------------------------------------------------
describe('Concierge Requests Fulfillment Workflow', () => {
  let admin;
  let adminToken;
  let client;
  let requestId;

  beforeEach(async () => {
    await cleanDatabase();

    admin = await createTestAdmin();
    client = await createTestClient({
      current_tier: 'gold',
      lifetime_points: 25000,
      redeemable_points: 10000
    });

    adminToken = generateToken({ user_id: admin.id, role: 'admin', type: 'admin' });

    // Insert a concierge_request directly
    await db('concierge_requests').insert({
      client_id: client.id,
      tier: 'gold',
      request_type: 'elder_law',
      details: 'Need help with estate planning',
      status: 'new'
    });

    // SQLite fallback lookup
    const record = await db('concierge_requests')
      .where({ client_id: client.id })
      .orderBy('created_at', 'desc')
      .first();
    requestId = record.id;
  });

  test('GET /api/v1/admin/concierge-requests returns requests list', async () => {
    const res = await request(app)
      .get('/api/v1/admin/concierge-requests')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.requests).toHaveLength(1);
    expect(res.body.requests[0].status).toBe('new');
    expect(res.body.requests[0].client_name).toBe(client.name);
    expect(res.body.requests[0].request_type).toBe('elder_law');
  });

  test('PATCH to "reviewing" succeeds', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/concierge-requests/${requestId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'reviewing' });

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('reviewing');
  });

  test('PATCH to "quoted" without quoted_hours fails with 400', async () => {
    // Move to reviewing first
    await request(app)
      .patch(`/api/v1/admin/concierge-requests/${requestId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'reviewing' });

    // Try to quote without hours
    const res = await request(app)
      .patch(`/api/v1/admin/concierge-requests/${requestId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'quoted' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_QUOTED_HOURS');
  });

  test('PATCH to "quoted" with quoted_hours=0.5 succeeds', async () => {
    // Move to reviewing first
    await request(app)
      .patch(`/api/v1/admin/concierge-requests/${requestId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'reviewing' });

    const res = await request(app)
      .patch(`/api/v1/admin/concierge-requests/${requestId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'quoted', quoted_hours: 0.5 });

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('quoted');
    expect(parseFloat(res.body.request.quoted_hours)).toBe(0.5);
  });

  test('Admin trying to set status="approved" fails with 400', async () => {
    // Move to reviewing -> quoted so we are in a realistic state
    await request(app)
      .patch(`/api/v1/admin/concierge-requests/${requestId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'reviewing' });

    await request(app)
      .patch(`/api/v1/admin/concierge-requests/${requestId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'quoted', quoted_hours: 0.5 });

    // Admin attempts to approve (only clients can)
    const res = await request(app)
      .patch(`/api/v1/admin/concierge-requests/${requestId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_STATUS');
  });

  test('Admin trying to set status="declined" fails with 400', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/concierge-requests/${requestId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'declined' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_STATUS');
  });

  test('PATCH to "quoted" with hours exceeding tier limit fails with 400', async () => {
    // Gold tier limit is 1 hour
    await request(app)
      .patch(`/api/v1/admin/concierge-requests/${requestId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'reviewing' });

    const res = await request(app)
      .patch(`/api/v1/admin/concierge-requests/${requestId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'quoted', quoted_hours: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('EXCEEDS_TIER_LIMIT');
  });

  test('Invalid transition (new -> quoted) fails with 400', async () => {
    // Must go new -> reviewing -> quoted; skipping reviewing should fail
    const res = await request(app)
      .patch(`/api/v1/admin/concierge-requests/${requestId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'quoted', quoted_hours: 0.5 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });
});

// ---------------------------------------------------------------------------
// Admin Redemption Fulfill / Deny Workflow
// ---------------------------------------------------------------------------
describe('Admin Redemption Fulfill and Deny Workflow', () => {
  let admin;
  let adminToken;
  let client;
  let clientToken;

  beforeEach(async () => {
    await cleanDatabase();

    admin = await createTestAdmin();
    client = await createTestClient({
      current_tier: 'silver',
      lifetime_points: 15000,
      redeemable_points: 15000
    });

    adminToken = generateToken({ user_id: admin.id, role: 'admin', type: 'admin' });
    clientToken = generateToken({ user_id: client.id, user_type: 'client', role: 'client', type: 'client' });
  });

  test('Full fulfill workflow: redeem -> list pending -> fulfill', async () => {
    // Client redeems 10,000 points
    const redeemRes = await request(app)
      .post(`/api/v1/clients/${client.id}/redeem`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ points: 10000 });

    expect(redeemRes.status).toBe(201);
    expect(redeemRes.body.credit_amount).toBe(50);
    expect(redeemRes.body.remaining_redeemable_points).toBe(5000);

    const redemptionId = redeemRes.body.redemption_id;

    // Admin lists pending redemptions
    const listRes = await request(app)
      .get('/api/v1/admin/redemptions?status=pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.redemptions).toHaveLength(1);
    expect(listRes.body.redemptions[0].id).toBe(redemptionId);
    expect(listRes.body.redemptions[0].status).toBe('pending');
    expect(listRes.body.redemptions[0].client_name).toBe(client.name);

    // Admin fulfills the redemption
    const fulfillRes = await request(app)
      .patch(`/api/v1/admin/redemptions/${redemptionId}/fulfill`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fulfillment_details: 'Applied to invoice INV-2026-001' });

    expect(fulfillRes.status).toBe(200);
    expect(fulfillRes.body.redemption.status).toBe('fulfilled');
    expect(fulfillRes.body.redemption.fulfilled_at).toBeTruthy();
    expect(fulfillRes.body.redemption.fulfillment_details).toBe('Applied to invoice INV-2026-001');
  });

  test('Deny workflow: redeem -> deny -> points refunded', async () => {
    // Client redeems 10,000 points
    const redeemRes = await request(app)
      .post(`/api/v1/clients/${client.id}/redeem`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ points: 10000 });

    expect(redeemRes.status).toBe(201);
    const redemptionId = redeemRes.body.redemption_id;

    // Verify redeemable points decreased
    const beforeDeny = await request(app)
      .get(`/api/v1/clients/${client.id}/loyalty`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(beforeDeny.body.redeemable_points).toBe(5000);

    // Admin denies the redemption
    const denyRes = await request(app)
      .patch(`/api/v1/admin/redemptions/${redemptionId}/deny`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ denied_reason: 'Client account under review' });

    expect(denyRes.status).toBe(200);
    expect(denyRes.body.redemption.status).toBe('denied');
    expect(denyRes.body.redemption.denied_reason).toBe('Client account under review');
    expect(denyRes.body.points_refunded).toBe(10000);

    // Verify points were refunded
    const afterDeny = await request(app)
      .get(`/api/v1/clients/${client.id}/loyalty`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(afterDeny.body.redeemable_points).toBe(15000);
    // Lifetime points should be unchanged throughout
    expect(afterDeny.body.lifetime_points).toBe(15000);
  });

  test('Deny without reason fails with 400', async () => {
    // Client redeems
    const redeemRes = await request(app)
      .post(`/api/v1/clients/${client.id}/redeem`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ points: 10000 });

    const redemptionId = redeemRes.body.redemption_id;

    // Admin tries to deny without reason
    const denyRes = await request(app)
      .patch(`/api/v1/admin/redemptions/${redemptionId}/deny`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(denyRes.status).toBe(400);
    expect(denyRes.body.error.code).toBe('MISSING_REASON');
  });

  test('Cannot fulfill an already fulfilled redemption', async () => {
    // Redeem and fulfill
    const redeemRes = await request(app)
      .post(`/api/v1/clients/${client.id}/redeem`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ points: 10000 });

    const redemptionId = redeemRes.body.redemption_id;

    await request(app)
      .patch(`/api/v1/admin/redemptions/${redemptionId}/fulfill`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fulfillment_details: 'Done' });

    // Try to fulfill again
    const res = await request(app)
      .patch(`/api/v1/admin/redemptions/${redemptionId}/fulfill`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fulfillment_details: 'Attempt 2' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_STATUS');
  });

  test('Cannot deny an already denied redemption', async () => {
    const redeemRes = await request(app)
      .post(`/api/v1/clients/${client.id}/redeem`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ points: 10000 });

    const redemptionId = redeemRes.body.redemption_id;

    await request(app)
      .patch(`/api/v1/admin/redemptions/${redemptionId}/deny`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ denied_reason: 'First denial' });

    const res = await request(app)
      .patch(`/api/v1/admin/redemptions/${redemptionId}/deny`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ denied_reason: 'Second denial' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_STATUS');
  });
});
