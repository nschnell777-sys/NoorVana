# NoorVana Advantage Loyalty System

## Project Overview

NoorVana Advantage is a five-tier loyalty program for a home healthcare company. This system includes a backend API that tracks client spending, calculates tier status and points, manages two separate point buckets (lifetime and redeemable), and provides both mobile app APIs and an admin web dashboard.

## Business Context

NoorVana provides three Care Packages:
- **Care Essentials**: $40/hr (minimum 24 hrs/week)
- **Care Premium**: $50/hr (minimum 32 hrs/week)
- **White Glove**: $60/hr (minimum 40 hrs/week)

Clients earn loyalty points based on Care Package spending. Points drive tier progression and unlock benefits (gifts, concierge services, priority access to events).

**Billing System**: NoorVana uses **AxisCare** as their home care management and billing platform. AxisCare handles scheduling, invoicing, and payment processing. AxisCare has a built-in QuickBooks sync for accounting/tax purposes — the loyalty system does NOT need to connect to QuickBooks directly.

## Program Mechanics

### Five-Tier System

| Tier | Threshold | Earn Rate | Multiplier |
|------|-----------|-----------|------------|
| Bronze | 0 points | 1 point per $1 spent | 1.0x |
| Silver | 10,000 points | 1.5 points per $1 spent | 1.5x |
| Gold | 25,000 points | 2 points per $1 spent | 2.0x |
| Platinum | 50,000 points | 2.5 points per $1 spent | 2.5x |
| Diamond | 100,000 points | 3 points per $1 spent | 3.0x |

### Two-Bucket Point System

**Lifetime Points (Tier Bucket):**
- Accumulate forever, never expire
- Determine tier status
- Never decrease (even after redemption)

**Redeemable Points (Spend Bucket):**
- Available for redemption against future care services
- Decrease when redeemed
- Replenish with ongoing spending
- Redemption rate: 10,000 points = $50 credit

## System Architecture

### Technology Stack
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT tokens
- **API Style**: REST
- **Admin Frontend**: React.js
- **Environment**: Cloud-ready (AWS/Azure/GCP)

### Core Components

1. **Database Layer**
   - Client accounts table
   - Points transactions table (both lifetime and redeemable)
   - Tier history table
   - Redemption history table
   - Admin users table

2. **Business Logic Layer**
   - Point calculation engine
   - Tier determination logic
   - Redemption processing
   - Transaction validation

3. **API Layer**
   - Client endpoints (view points, tier status, redemption)
   - Admin endpoints (manual adjustments, reporting)
   - Webhook endpoint for AxisCare payment integration
   - Generic webhook endpoint (backup, can accept other billing sources)

4. **Admin Web Dashboard**
   - Client search and management
   - Point adjustment interface
   - Tier distribution reports
   - Transaction and redemption history views
   - Credit voucher management

5. **Mobile/Web Interface Integration**
   - REST APIs consumed by:
     - iOS/Android mobile app (client-facing)
     - Client web portal (client-facing)
     - Admin web dashboard (internal)

## Billing Integration: AxisCare

**Primary integration**: AxisCare API
- AxisCare is NoorVana's home care management platform
- AxisCare handles scheduling, invoicing, and payment collection
- When a payment is processed in AxisCare, it triggers the loyalty system via API/webhook
- AxisCare has a built-in QuickBooks sync for accounting — loyalty system does NOT connect to QuickBooks

**Integration flow**:
```
Client pays invoice → AxisCare processes payment
                         ↓
                    AxisCare API/webhook triggers loyalty system
                         ↓
                    Loyalty system calculates and awards points
                         
Meanwhile (separate, already built-in):
AxisCare → auto-syncs payment to QuickBooks for tax/accounting
```

**Webhook endpoint design**:
- Primary: `/webhook/axiscare/payment` — receives AxisCare payment events
- Backup: `/webhook/generic/payment` — generic endpoint that can accept payment data from any source (QuickBooks, manual, etc.) using a standard format

**AxisCare webhook payload (expected format)**:
```json
{
  "event_type": "payment.created",
  "client_id": "string",
  "client_name": "string",
  "client_email": "string",
  "invoice_id": "string",
  "payment_amount": 2500.00,
  "payment_date": "2026-02-13T12:00:00Z",
  "care_package": "premium"
}
```

**Generic webhook payload (backup format)**:
```json
{
  "source": "quickbooks" | "manual" | "other",
  "client_email": "string",
  "invoice_id": "string",
  "payment_amount": 2500.00,
  "payment_date": "2026-02-13T12:00:00Z"
}
```

**Note for development team**: AxisCare's exact API format may differ. The development team will need to coordinate with AxisCare support to confirm the exact webhook payload structure and authentication method. The loyalty system should be flexible enough to map AxisCare's actual payload to internal data models.

## Key Business Rules

### Point Accrual
```
When client pays invoice (via AxisCare webhook):
1. Get client's current tier
2. Calculate points: payment_amount × tier_multiplier
3. Add to BOTH lifetime and redeemable buckets
4. Check if tier threshold crossed
5. If threshold crossed, update tier and trigger gift fulfillment notification
```

### Tier Multipliers
```javascript
const TIER_MULTIPLIERS = {
  bronze: 1.0,
  silver: 1.5,
  gold: 2.0,
  platinum: 2.5,
  diamond: 3.0
};
```

### Tier Thresholds
```javascript
const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 10000,
  gold: 25000,
  platinum: 50000,
  diamond: 100000
};
```

### Tier Upgrades
- Automatic when lifetime points cross threshold
- Irreversible (clients never downgrade)
- Tier multiplier applies to ALL future spending

### Point Redemption
```
When client redeems points:
1. Validate: redeemable_points >= redemption_amount
2. Calculate credit: (redemption_points / 10,000) × $50
3. Deduct from redeemable bucket ONLY
4. Lifetime bucket unchanged
5. Generate credit voucher for next invoice
```

### Edge Cases to Handle
- Partial redemptions allowed
- Cannot redeem more points than available
- Points earned during same billing cycle can be redeemed immediately
- Tier changes affect only future transactions (not retroactive)

## Data Models (Conceptual)

### Client
```javascript
{
  id: UUID,
  axiscare_client_id: String (maps to AxisCare system),
  name: String,
  email: String,
  care_package: Enum['essentials', 'premium', 'white_glove'],
  current_tier: Enum['bronze', 'silver', 'gold', 'platinum', 'diamond'],
  lifetime_points: Integer,
  redeemable_points: Integer,
  tier_upgraded_at: Timestamp,
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### PointsTransaction
```javascript
{
  id: UUID,
  client_id: UUID (FK),
  transaction_type: Enum['earn', 'redeem', 'adjustment'],
  source: Enum['axiscare', 'quickbooks', 'manual', 'other'],
  invoice_id: String,
  invoice_amount: Decimal (for 'earn' only),
  lifetime_points_change: Integer,
  redeemable_points_change: Integer,
  tier_at_transaction: String,
  multiplier_applied: Decimal,
  description: String,
  created_at: Timestamp
}
```

### TierHistory
```javascript
{
  id: UUID,
  client_id: UUID (FK),
  from_tier: String,
  to_tier: String,
  lifetime_points_at_upgrade: Integer,
  upgraded_at: Timestamp
}
```

### RedemptionHistory
```javascript
{
  id: UUID,
  client_id: UUID (FK),
  points_redeemed: Integer,
  credit_amount: Decimal,
  voucher_code: String,
  redeemed_at: Timestamp,
  applied_to_invoice: String (nullable)
}
```

### AdminUser
```javascript
{
  id: UUID,
  name: String,
  email: String,
  password_hash: String,
  role: Enum['admin', 'customer_service', 'manager'],
  created_at: Timestamp,
  last_login: Timestamp
}
```

## API Endpoints (Required)

### Client-Facing APIs (Mobile App & Client Web Portal)
- `GET /api/v1/clients/:id/loyalty` - Get tier, lifetime points, redeemable points, progress to next tier
- `POST /api/v1/clients/:id/redeem` - Redeem points for credit
- `GET /api/v1/clients/:id/transactions` - Get points history
- `GET /api/v1/clients/:id/redemptions` - Get redemption history

### Admin APIs (Admin Web Dashboard)
- `POST /api/v1/admin/transactions` - Record new spending manually
- `POST /api/v1/admin/clients/:id/adjust` - Manual point adjustment (with reason)
- `GET /api/v1/admin/clients` - List all clients with loyalty data
- `GET /api/v1/admin/clients/:id` - Get detailed client loyalty information
- `GET /api/v1/admin/reports/tiers` - Tier distribution report
- `GET /api/v1/admin/reports/monthly-stats` - Monthly points and redemption statistics
- `GET /api/v1/admin/reports/top-clients` - Top clients by lifetime points
- `POST /api/v1/admin/auth/login` - Admin authentication
- `POST /api/v1/admin/auth/logout` - Admin logout

### Integration Webhooks
- `POST /webhook/axiscare/payment` - Primary: AxisCare payment webhook
- `POST /webhook/generic/payment` - Backup: Generic payment webhook (accepts any source)

## Admin Web Dashboard Requirements

### Authentication & Authorization
- Login page with email/password
- JWT-based session management
- Role-based access control (admin, customer_service, manager)
- Session timeout after 2 hours of inactivity

### Dashboard Pages

**1. Home/Overview**
- Total clients enrolled
- Tier distribution (pie chart or bar chart)
- Points accrued this month vs. last month
- Redemptions this month vs. last month

**2. Client Search & Management**
- Search by name, email, or AxisCare client ID
- Filter by tier, care package
- Table view with: name, email, tier, lifetime points, redeemable points
- Click client row to view detailed profile

**3. Client Detail Page**
- Client information (name, email, care package, tier, AxisCare ID)
- Points balance (lifetime + redeemable)
- Progress bar to next tier
- Transaction history table
- Redemption history table
- "Adjust Points" button → opens modal

**4. Point Adjustment Modal**
- Input: Points amount (positive or negative)
- Checkboxes: Apply to lifetime points, apply to redeemable points
- Text area: Reason for adjustment (required)
- Submit button → creates adjustment transaction

**5. Reports**
- Tier distribution (table + chart)
- Monthly points accrued (line chart over time)
- Monthly redemptions (line chart over time)
- Top 10 clients by lifetime points
- Export to CSV button

### UI/UX Guidelines
- Clean, professional design
- Responsive layout (works on desktop and tablet)
- Loading states for API calls
- Error messages displayed clearly
- Success confirmations (toast notifications)
- Use a component library (Material-UI, Ant Design, or similar)

## Security Requirements
- JWT authentication for all endpoints
- Role-based access (client vs. admin)
- Webhook signature verification (AxisCare webhook secret)
- Rate limiting on redemption endpoints
- Audit logging for all point changes
- Input validation and sanitization
- Password hashing with bcrypt (minimum 12 characters)

## Testing Requirements
- Unit tests for point calculation logic (including Diamond 3.0x multiplier)
- Integration tests for API endpoints
- E2E tests for admin dashboard critical flows
- Webhook integration tests (AxisCare and generic endpoints)
- Test scenarios:
  - Client earns points and crosses tier threshold
  - Client redeems points successfully
  - Client attempts to redeem more points than available (should fail)
  - Admin adjusts points and audit log is created
  - Tier multiplier changes affect future transactions only
  - Diamond tier client earns 3x points correctly
  - AxisCare webhook triggers point accrual
  - Generic webhook triggers point accrual

## Development Priorities
1. Database schema and migrations
2. Core business logic (point calculation, tier determination)
3. REST API endpoints (client + admin)
4. AxisCare webhook integration endpoint
5. Generic webhook endpoint (backup)
6. Admin authentication system
7. Admin web dashboard (React frontend)
8. Input validation and error handling
9. Test suite
10. API documentation (OpenAPI/Swagger)

## Non-Requirements (Out of Scope for Claude Code)
- Client-facing mobile app UI (handled by mobile team)
- Client-facing web portal UI (handled by web team)
- AxisCare webhook registration (development team configures in AxisCare)
- QuickBooks integration (AxisCare handles this automatically)
- Email notifications for tier upgrades (will be added later)
- Gift fulfillment automation (will be added later)

## Deployment Notes for Development Team
- Code will be generated locally and pushed to GitHub
- Development team handles: cloud deployment, database hosting, AxisCare webhook setup, production monitoring
- All environment variables (DB credentials, JWT secret, AxisCare webhook secret) managed by deployment team
- HIPAA compliance review required before production launch

## Code Style Preferences
- Use ES6+ syntax (async/await, arrow functions, destructuring)
- Clear variable names (no abbreviations)
- Comprehensive error messages
- JSDoc comments for all functions
- Modular code structure:
  - `/backend` - Node.js API
  - `/admin-dashboard` - React web app
  - Separate files for routes, controllers, models, services

## Success Criteria
✅ All API endpoints functional and tested
✅ Point calculation matches business rules exactly (including Diamond 3.0x)
✅ Tier upgrades trigger automatically
✅ Redemptions decrease redeemable points only
✅ AxisCare webhook receives and processes payment events
✅ Generic webhook works as backup
✅ Database schema supports all required queries
✅ Admin dashboard allows client search, point adjustment, reporting
✅ Admin authentication and authorization working
✅ Code is deployment-ready (includes package.json, README, .env.example)
✅ Test coverage >80% for business logic
✅ API documentation (Swagger) generated
