# NoorVana Advantage Loyalty System - Deployment Handoff

## Overview

This document outlines what the development team needs to do after Claude Code generates the loyalty system backend code and admin web dashboard.

---

## What Claude Code Generated

✅ **Complete backend codebase** including:
- Database schema with migrations (PostgreSQL)
- REST API endpoints (Node.js + Express)
- Business logic for point accrual, tier upgrades, redemption
- AxisCare webhook endpoint (primary payment trigger)
- Generic webhook endpoint (backup for QuickBooks or other sources)
- Authentication middleware (JWT)
- Input validation and error handling
- Test suite with unit and integration tests
- API documentation (Swagger/OpenAPI)
- README with local setup instructions

✅ **Admin web dashboard** including:
- React frontend application
- Login page with authentication
- Client search and management interface (searchable by name, email, or AxisCare ID)
- Point adjustment modal
- Reports page with charts and analytics
- Responsive UI with component library

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         AxisCare                             │
│          (Scheduling, Invoicing, Payment Processing)         │
└──────────┬───────────────────────────────┬──────────────────┘
           │ Webhook (Payment Created)      │ Built-in Sync
           ↓                                ↓
┌──────────────────────────┐    ┌─────────────────────┐
│   Loyalty Backend API    │    │     QuickBooks       │
│  (Node.js + PostgreSQL)  │    │  (Tax & Accounting)  │
│                          │    │  No custom work      │
│  • Point calculation     │    │  needed here         │
│  • Tier management       │    └─────────────────────┘
│  • Redemption processing │
│  • REST API endpoints    │
└──┬──────────┬────────────┘
   │          │
   │ Client   │ Admin
   │ APIs     │ APIs
   ↓          ↓
┌────────┐  ┌─────────────────────┐
│ Mobile │  │  Admin Web Dashboard │
│  App   │  │  (React)             │
│(iOS/   │  │                      │
│Android)│  │  • Client search     │
│        │  │  • Point adjustment  │
│        │  │  • Reports           │
└────────┘  └─────────────────────┘
   ↓
┌────────┐
│ Client │
│  Web   │
│ Portal │
└────────┘
```

**Key point**: AxisCare is the single source of truth for payments. AxisCare automatically syncs to QuickBooks for tax/accounting — the loyalty system does NOT need a direct QuickBooks connection.

---

## Tier Structure & Multipliers

| Tier | Threshold | Multiplier | Cash-Back Equivalent |
|------|-----------|------------|---------------------|
| Bronze | 0 points | 1.0x | 0.5% |
| Silver | 10,000 points | 1.5x | 0.75% |
| Gold | 25,000 points | 2.0x | 1.0% |
| Platinum | 50,000 points | 2.5x | 1.25% |
| Diamond | 100,000 points | 3.0x | 1.5% |

---

## What Development Team Needs to Do

### Phase 1: Development Environment Setup (Week 1)

#### 1.1 Clone Repository
```bash
git clone <repository-url>
cd noorvana-loyalty-system
npm install
```

#### 1.2 Local Database Setup
- Install PostgreSQL locally or use Docker
- Create database: `noorvana_loyalty_dev`
- Copy `.env.example` to `.env` and configure:
  - `DATABASE_URL`
  - `JWT_SECRET` (generate strong secret)
  - `AXISCARE_WEBHOOK_SECRET` (use test value locally)
  - Other environment variables

#### 1.3 Run Migrations
```bash
npm run migrate
```

#### 1.4 Seed Test Data (Optional)
```bash
npm run seed
```

#### 1.5 Start Development Servers
```bash
# Terminal 1: Backend API
cd backend
npm run dev

# Terminal 2: Admin Dashboard
cd admin-dashboard
npm run dev
```

#### 1.6 Verify System
- Import Swagger/OpenAPI spec into Postman
- Test all API endpoints locally
- Test AxisCare webhook endpoint with sample payload
- Test generic webhook endpoint with sample payload
- Access admin dashboard at `http://localhost:3001`
- Test admin login and client management features
- Verify Diamond tier correctly applies 3.0x multiplier

**Deliverable**: Local environment running successfully, all tests passing

---

### Phase 2: Cloud Infrastructure Setup (Week 2)

#### 2.1 Choose Cloud Provider
Recommended: **AWS**

Alternative: Azure, Google Cloud Platform

#### 2.2 Provision Database
**AWS RDS (Recommended)**
- Service: Amazon RDS for PostgreSQL
- Instance: db.t3.small (start here, scale as needed)
- Storage: 20GB SSD (auto-scaling enabled)
- Backup: Daily automated backups with 7-day retention
- Security: VPC with private subnet, security groups
- Encryption: Enable at-rest encryption

**Estimated Cost**: ~$30-50/month

#### 2.3 Provision Application Servers

**Backend API Server:**
- **AWS Elastic Beanstalk** (recommended)
  - Platform: Node.js 18.x
  - Instance type: t3.small
  - Load balancer: Application Load Balancer (for HTTPS)
- **Estimated Cost**: $25-50/month

**Admin Dashboard Hosting:**
- **AWS S3 + CloudFront** (recommended for static React app)
  - S3 bucket for static files
  - CloudFront for CDN and HTTPS
- **Estimated Cost**: $5-10/month

#### 2.4 Configure Environment Variables

**Backend API**:
- `DATABASE_URL` (from RDS endpoint)
- `JWT_SECRET` (generate production secret with 32+ characters)
- `NODE_ENV=production`
- `PORT=3000`
- `API_VERSION=v1`
- `ADMIN_FRONTEND_URL=https://admin.noorvana.com`
- `AXISCARE_WEBHOOK_SECRET` (from AxisCare configuration)
- `AXISCARE_API_BASE_URL` (AxisCare API endpoint)
- `AXISCARE_API_KEY` (from AxisCare)
- `GENERIC_WEBHOOK_SECRET` (generate for backup webhook)

**Admin Dashboard**:
- `REACT_APP_API_URL=https://api.noorvana.com`
- `REACT_APP_ENVIRONMENT=production`

#### 2.5 Setup SSL Certificates
- **Backend API**: AWS Certificate Manager for `api.noorvana.com`
- **Admin Dashboard**: AWS Certificate Manager for `admin.noorvana.com`

#### 2.6 Deploy Applications

**Backend API**:
```bash
cd backend
eb init
eb create production
eb deploy
```

**Admin Dashboard**:
```bash
cd admin-dashboard
npm run build
aws s3 sync build/ s3://admin-noorvana-com
aws cloudfront create-invalidation --distribution-id XXXXX --paths "/*"
```

**Deliverable**: Backend API and admin dashboard running in cloud with HTTPS endpoints

---

### Phase 3: AxisCare Integration (Week 3)

#### 3.1 Configure AxisCare Webhook
**Task**: Set up AxisCare to send payment notifications to the loyalty system

**Steps**:
1. Contact AxisCare support or access AxisCare API settings
2. Register webhook endpoint: `https://api.noorvana.com/webhook/axiscare/payment`
3. Configure event type: Payment created
4. Set webhook secret (store as `AXISCARE_WEBHOOK_SECRET` in backend)
5. Note: AxisCare has an open API — confirm exact payload format with their documentation or support team

**AxisCare API Documentation**:
- AxisCare provides REST API access for custom integrations
- API documentation available through AxisCare support or developer portal
- Development team should request API credentials from NoorVana's AxisCare account admin

**Testing**:
1. Create test client in both AxisCare and loyalty system (matching `axiscare_client_id`)
2. Create test invoice in AxisCare
3. Process test payment in AxisCare
4. Verify:
   - Webhook received by loyalty system
   - Client matched correctly
   - Points calculated with correct tier multiplier
   - Transaction logged with source: 'axiscare'
5. Test Diamond tier specifically: Confirm 3.0x multiplier

**Important Notes**:
- AxisCare's exact webhook payload format may differ from what's in REQUIREMENTS.md
- The development team should create a mapping layer that converts AxisCare's actual payload to the loyalty system's internal format
- If AxisCare doesn't support webhooks directly, use polling (check AxisCare API periodically for new payments) or use AxisCare's integration with Celigo/Zapier as middleware

#### 3.2 Verify AxisCare → QuickBooks Sync
**Task**: Confirm that AxisCare's built-in QuickBooks sync is working separately

This is NOT a loyalty system task — just verify the existing sync:
- Payments processed in AxisCare automatically appear in QuickBooks
- No custom development needed for this
- QuickBooks handles all tax/accounting from the synced data

#### 3.3 Create Admin User Accounts
Create admin user accounts for:
- NoorVana management team (role: admin)
- Customer service team (role: customer_service)
- QA team (role: admin)

#### 3.4 Import Existing Clients
**Task**: Migrate existing NoorVana clients into loyalty system

**Process**:
1. Export client list from AxisCare (name, email, AxisCare client ID, care package)
2. Create migration script:
   ```javascript
   for (client of axiscareClients) {
     await createClient({
       axiscare_client_id: client.axiscare_id,
       name: client.name,
       email: client.email,
       care_package: client.package_type,
       current_tier: 'bronze',
       lifetime_points: 0,
       redeemable_points: 0
     });
   }
   ```
3. Run migration script
4. Verify: All clients imported with correct AxisCare IDs

**Optional**: Backfill points for historical spending
- Pull historical payment data from AxisCare API
- Calculate total historical spend per client
- Award lifetime and redeemable points retroactively (applying correct tier multipliers as they progress)
- Update tier based on final lifetime points
- Create `PointsTransaction` records marked source: "manual", description: "historical backfill"

#### 3.5 Mobile App API Integration
**Task**: Connect loyalty endpoints to NoorVana iOS/Android mobile app

**Coordination with Mobile Team**:
- Share API documentation (Swagger)
- Provide staging API endpoint
- Share test client credentials

**Mobile App Needs**:
- `GET /api/v1/clients/:id/loyalty` - Display tier badge, points balance, progress bar
- `POST /api/v1/clients/:id/redeem` - Redemption flow
- `GET /api/v1/clients/:id/transactions` - Points history screen
- `GET /api/v1/clients/:id/redemptions` - Redemption history screen

#### 3.6 Client Web Portal Integration
**Task**: Add loyalty section to NoorVana website or create standalone client portal

**Options**:
- **Option A**: Add `/my-rewards` section to existing noorvana.com
- **Option B**: Create standalone `rewards.noorvana.com` web portal

**Uses Same API**: All client endpoints already built, just need web UI

**Deliverable**: AxisCare webhook working, mobile app connected, clients imported

---

### Phase 4: HIPAA Compliance Review (Week 4)

#### 4.1 HIPAA Requirements Checklist

**⚠️ CRITICAL**: NoorVana is a healthcare company. Loyalty system must be HIPAA-compliant.

**Required Actions**:

1. **Business Associate Agreement (BAA)**
   - Sign AWS BAA (if using AWS)
   - Verify AxisCare BAA is in place (likely already signed)

2. **Data Encryption**
   - ✅ At-rest: Database encryption enabled
   - ✅ In-transit: HTTPS/TLS enforced (no HTTP)
   - ✅ Webhook communication over HTTPS only
   - ✅ Verify: No client data logged in plaintext

3. **Access Controls**
   - ✅ Role-based access (client vs. admin vs. manager)
   - ✅ Audit logging for all data access
   - ✅ Password policy (minimum 12 characters, complexity)
   - ✅ Webhook signature verification

4. **Audit Logging**
   - ✅ All point transactions logged (with source: axiscare/manual/etc.)
   - ✅ All tier upgrades logged
   - ✅ All redemptions logged
   - ✅ All admin adjustments logged with admin user ID
   - ✅ All webhook events logged
   - ✅ Log retention: 6 years minimum

5. **Data Retention Policy**
   - Recommended: 7 years per HIPAA guidelines
   - Implement soft delete (mark `is_active=false` instead of hard delete)

6. **PHI Minimization**
   - ✅ Loyalty system stores only: name, email, AxisCare ID, points, tier
   - ✅ No medical information stored
   - ✅ AxisCare ID links to main system (which has PHI)

7. **Security Incident Response Plan**
   - Document breach response process
   - Contact: HIPAA compliance officer at NoorVana
   - Timeline: Breach notification within 60 days

**Deliverable**: HIPAA compliance checklist signed off by NoorVana legal/compliance team

---

### Phase 5: Testing & QA (Week 5)

#### 5.1 Functional Testing
- [ ] AxisCare webhook triggers point accrual correctly
- [ ] Generic webhook triggers point accrual correctly
- [ ] New client first purchase earns Bronze (1.0x) points
- [ ] Client crosses tier threshold, tier upgrades automatically
- [ ] Diamond tier client earns 3.0x points correctly
- [ ] Client redeems points via mobile app
- [ ] Client redeems points via web portal
- [ ] Client attempts to redeem more points than available (error)
- [ ] Admin logs into dashboard
- [ ] Admin searches for client by name, email, and AxisCare ID
- [ ] Admin adjusts points, audit log created
- [ ] Admin views tier distribution report
- [ ] Admin views monthly trends chart
- [ ] Reports export to CSV correctly

#### 5.2 Edge Case Testing
- [ ] Same invoice processed twice (idempotency — should skip second)
- [ ] AxisCare sends unknown client_id (should log warning, not error)
- [ ] Negative payment amount (validation error)
- [ ] Redemption amount not multiple of 10,000 (validation error)
- [ ] JWT token expired (authentication error)
- [ ] Client tries to access another client's data (authorization error)
- [ ] Admin with 'manager' role tries to adjust points (forbidden)
- [ ] Invalid webhook signature (rejected)
- [ ] Diamond client at max tier — progress shows 100%, next_tier is null

#### 5.3 Performance Testing
- [ ] Load test: 100 concurrent requests to `/loyalty` endpoint
- [ ] Target: 95% of requests < 200ms
- [ ] Webhook processing < 5 seconds end-to-end
- [ ] Database query performance with 10,000+ clients
- [ ] Admin dashboard loads within 2 seconds

#### 5.4 Security Testing
- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized
- [ ] Rate limiting enforced
- [ ] Invalid JWT token rejected
- [ ] Invalid webhook signature rejected
- [ ] CORS prevents unauthorized origins

**Deliverable**: QA sign-off, all tests passing

---

### Phase 6: Production Launch (Week 6)

#### 6.1 Pre-Launch Checklist
- [ ] All environment variables configured in production
- [ ] AxisCare webhook registered and tested with real payments
- [ ] AxisCare → QuickBooks sync verified (separate from loyalty system)
- [ ] Database backups scheduled (daily)
- [ ] SSL certificates installed and valid
- [ ] Monitoring enabled
- [ ] Error alerting configured
- [ ] API documentation published
- [ ] Admin team trained on dashboard
- [ ] Customer service scripts prepared

#### 6.2 Monitoring Setup
**Key Metrics to Monitor**:
- API uptime (target: 99.9%)
- Average response time (target: <200ms)
- Error rate (target: <1%)
- AxisCare webhook success rate (target: 100%)
- Database CPU usage (alert if >80%)
- Daily active users
- Points accrued per day
- Redemptions per day

#### 6.3 Error Alerting
**Setup alerts for**:
- Any 500 Internal Server Error
- Database connection failures
- API downtime >5 minutes
- Failed AxisCare webhook processing
- Unusual spike in redemptions (fraud detection)

#### 6.4 Launch Communication
**Internal**:
- Email to all NoorVana staff
- Training session for customer service team
- Admin dashboard training for management
- FAQ document

**Client-facing**:
- Mobile app notification: "Introducing NoorVana Advantage"
- Email to all clients
- Website update with loyalty program page

**Deliverable**: Production system live

---

### Phase 7: Post-Launch Support (Ongoing)

#### 7.1 First Week Monitoring
- [ ] Monitor AxisCare webhook logs daily
- [ ] Track redemption success rate
- [ ] Address mobile app or web portal issues
- [ ] Respond to customer service questions within 2 hours

#### 7.2 Monthly Maintenance
- [ ] Review database performance
- [ ] Update dependencies (security patches)
- [ ] Generate loyalty program report for management
- [ ] Review audit logs for unusual activity
- [ ] Verify AxisCare webhook reliability

#### 7.3 Future Enhancements (Backlog)
- Email notifications for tier upgrades
- Push notifications for points earned
- Referral bonus points
- Birthday bonus points
- Gift fulfillment automation (Boundless Collection integration)
- Advanced analytics dashboard
- Client-facing social sharing ("I just reached Gold tier!")

---

## Key Contacts

**NoorVana Team**:
- Product Owner: [Name, Email]
- AxisCare Account Admin: [Name, Email]
- Mobile App Team Lead: [Name, Email]
- Web Development Lead: [Name, Email]
- HIPAA Compliance Officer: [Name, Email]

**Development Team**:
- Backend Lead: [Name, Email]
- Frontend Lead: [Name, Email]
- DevOps Engineer: [Name, Email]
- QA Lead: [Name, Email]

---

## Estimated Timeline

| Phase | Duration | Key Deliverable |
|-------|----------|-----------------|
| Development Environment | 1 week | Local backend + dashboard running |
| Cloud Infrastructure | 1 week | Staging environment live |
| AxisCare Integration | 1 week | Webhook working, clients imported |
| HIPAA Compliance | 1 week | Legal sign-off |
| Testing & QA | 1 week | All tests passing |
| Production Launch | 1 week | Production live |
| **Total** | **6 weeks** | Fully operational system |

---

## Budget Estimate

| Item | Cost | Frequency |
|------|------|-----------|
| AWS RDS (PostgreSQL) | $35/month | Monthly |
| AWS Elastic Beanstalk (Backend API) | $35/month | Monthly |
| AWS S3 + CloudFront (Admin Dashboard) | $8/month | Monthly |
| Monitoring (CloudWatch) | $10/month | Monthly |
| SSL Certificates (AWS) | Free | - |
| **Total Infrastructure** | **~$88/month** | **Monthly** |

**vs. Open Loyalty Platform**: $500-2,000/month
**Savings**: $412-1,912/month = $4,944-22,944/year

---

## Success Criteria

✅ API uptime > 99.9%
✅ Average response time < 200ms
✅ AxisCare webhook triggers point accrual within 30 seconds
✅ Diamond tier correctly applies 3.0x multiplier
✅ Mobile app successfully displays loyalty data
✅ Client web portal successfully displays loyalty data
✅ Admin dashboard accessible and functional
✅ Clients can redeem points via mobile or web
✅ Admins can search clients and adjust points
✅ Reports page displays accurate analytics
✅ AxisCare → QuickBooks sync works independently (not our system)
✅ Zero HIPAA compliance violations

---

## Risk Mitigation

**Risk 1: AxisCare webhook integration issues**
Mitigation: Use generic webhook endpoint as backup; manual point accrual via admin dashboard as last resort

**Risk 2: AxisCare doesn't support direct webhooks**
Mitigation: Use Celigo integration platform (AxisCare has existing Celigo partnership) or polling approach

**Risk 3: Database performance issues at scale**
Mitigation: Optimize queries, add indexes, upgrade RDS instance

**Risk 4: HIPAA violation**
Mitigation: Compliance review before launch, annual audits

**Risk 5: High redemption fraud**
Mitigation: Rate limiting, unusual activity alerts, manual review

---

## Questions for Clarification

Before starting deployment, development team should clarify:

1. Does NoorVana have existing AWS account?
2. What are the AxisCare API credentials and webhook setup details?
3. Does AxisCare support direct webhooks, or do we need Celigo/Zapier middleware?
4. Who is the HIPAA compliance officer?
5. What is the target launch date?
6. Should we backfill points for historical spending from AxisCare, or start fresh?
7. What domain names should be used? (api.noorvana.com, admin.noorvana.com, rewards.noorvana.com)
8. Does NoorVana have existing authentication for client web portal, or build new?
9. Confirm AxisCare → QuickBooks sync is already working for tax purposes

---

## Appendix: Example Commands

**Database Backup**:
```bash
pg_dump -h <rds-endpoint> -U postgres noorvana_loyalty > backup.sql
```

**Deploy Backend**:
```bash
cd backend && eb deploy
```

**Deploy Admin Dashboard**:
```bash
cd admin-dashboard && npm run build
aws s3 sync build/ s3://admin-noorvana-com
aws cloudfront create-invalidation --distribution-id XXXXX --paths "/*"
```

**Test AxisCare Webhook Locally**:
```bash
curl -X POST http://localhost:3000/webhook/axiscare/payment \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-test-secret" \
  -d '{"event_type":"payment.created","client_id":"AC-12345","invoice_id":"INV-001","payment_amount":2500.00}'
```

**Check API Health**:
```bash
curl https://api.noorvana.com/health
```

---

**Document Version**: 3.0
**Last Updated**: February 13, 2026
**Owner**: Development Team Lead
