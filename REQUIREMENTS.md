# NoorVana Advantage Loyalty System - Detailed Requirements

## Functional Requirements

### 1. Client Management

#### 1.1 Client Account
**Description**: Store client loyalty account data
**Fields**:
- `id`: Unique identifier (UUID)
- `axiscare_client_id`: String (maps to AxisCare system, used for webhook matching)
- `name`: Full name
- `email`: Email address (unique)
- `care_package`: One of ['essentials', 'premium', 'white_glove']
- `current_tier`: One of ['bronze', 'silver', 'gold', 'platinum', 'diamond']
- `lifetime_points`: Integer (never decreases)
- `redeemable_points`: Integer (decreases on redemption)
- `tier_upgraded_at`: Timestamp of last tier change
- `is_active`: Boolean (active account status)
- `created_at`, `updated_at`: Timestamps

**Business Rules**:
- Lifetime points start at 0, tier starts at 'bronze'
- Email must be unique across all clients
- axiscare_client_id must be unique (used to match webhook events to clients)
- Care package can change over time (client upgrades/downgrades service)

---

### 2. Point Accrual System

#### 2.1 Record Payment Transaction
**Primary Trigger**: AxisCare webhook sends payment event
**Backup Trigger**: Generic webhook or admin manual entry

**AxisCare Webhook Input** (`POST /webhook/axiscare/payment`):
```json
{
  "event_type": "payment.created",
  "client_id": "axiscare-id-12345",
  "client_name": "Jane Doe",
  "client_email": "jane@example.com",
  "invoice_id": "INV-2026-001234",
  "payment_amount": 2500.00,
  "payment_date": "2026-02-13T12:00:00Z",
  "care_package": "premium"
}
```

**Generic Webhook Input** (`POST /webhook/generic/payment`):
```json
{
  "source": "quickbooks",
  "client_email": "jane@example.com",
  "invoice_id": "INV-2026-001234",
  "payment_amount": 2500.00,
  "payment_date": "2026-02-13T12:00:00Z"
}
```

**Process**:
1. Receive payment event from AxisCare (or generic webhook)
2. Match client by `axiscare_client_id` (primary) or `email` (fallback)
3. If client not found, log warning and skip (do not auto-create)
4. Get client's current tier
5. Look up tier multiplier:
   - Bronze: 1.0
   - Silver: 1.5
   - Gold: 2.0
   - Platinum: 2.5
   - Diamond: 3.0
6. Calculate points: `payment_amount × tier_multiplier`
7. Add points to BOTH `lifetime_points` and `redeemable_points`
8. Check if `lifetime_points` crossed next tier threshold
9. If yes, upgrade tier and log tier change
10. Create `PointsTransaction` record with `source: 'axiscare'`
11. Return: new tier, total lifetime points, total redeemable points

**Output**:
```json
{
  "transaction_id": "uuid",
  "points_earned": 7500,
  "lifetime_points": 107500,
  "redeemable_points": 45750,
  "current_tier": "diamond",
  "tier_upgraded": true,
  "new_tier": "diamond",
  "multiplier_applied": 3.0,
  "source": "axiscare"
}
```

**Edge Cases**:
- Payment amount must be > 0
- Client must exist and be active
- Same invoice_id should not be processed twice (idempotency)
- If AxisCare sends a client_id not in our system, log warning but don't error
- Webhook must verify signature/secret before processing

#### 2.2 Tier Upgrade Logic
**Tier Thresholds**:
- Bronze → Silver: 10,000 lifetime points
- Silver → Gold: 25,000 lifetime points
- Gold → Platinum: 50,000 lifetime points
- Platinum → Diamond: 100,000 lifetime points

**Process**:
1. After adding points, check: `lifetime_points >= next_tier_threshold`
2. If true:
   - Update `current_tier`
   - Update `tier_upgraded_at` to current timestamp
   - Create `TierHistory` record
   - (Future: trigger gift fulfillment notification - not in MVP)

**Important**: Tier upgrades are permanent. Clients never downgrade even if they stop spending.

---

### 3. Point Redemption System

#### 3.1 Redeem Points for Credit
**Trigger**: Client initiates redemption via mobile app or client web portal
**Input**:
```json
{
  "client_id": "uuid",
  "points_to_redeem": 20000
}
```

**Validation**:
- `points_to_redeem` must be > 0
- `points_to_redeem` must be ≤ `redeemable_points`
- `points_to_redeem` must be multiple of 10,000 (minimum redemption unit)

**Process**:
1. Validate redemption amount
2. Calculate credit: `(points_to_redeem / 10,000) × 50`
3. Deduct points from `redeemable_points` ONLY
4. Leave `lifetime_points` unchanged
5. Generate unique voucher code (format: `NV-XXXXXX`)
6. Create `RedemptionHistory` record
7. Create `PointsTransaction` record (type: 'redeem')
8. Return voucher details

**Output**:
```json
{
  "redemption_id": "uuid",
  "points_redeemed": 20000,
  "credit_amount": 100.00,
  "voucher_code": "NV-A7B2C9",
  "remaining_redeemable_points": 5750,
  "redeemed_at": "2026-02-13T18:30:00Z"
}
```

**Edge Cases**:
- If `redeemable_points` < `points_to_redeem`, return error: "Insufficient points"
- If not multiple of 10,000, return error: "Minimum redemption is 10,000 points ($50 credit)"
- Voucher code must be unique

---

### 4. Admin User Management

#### 4.1 Admin Authentication
**Description**: Admin users log in to access the admin web dashboard

**Login Process**:
- Admin enters email and password
- System validates credentials
- If valid, generate JWT token with 2-hour expiration
- Return token to frontend
- Frontend stores token and includes in all API requests

**Admin Roles**:
- `admin` - Full access (all features)
- `customer_service` - Can view clients, adjust points, view reports
- `manager` - Can view reports only (read-only)

**Admin User Fields**:
- `id`: UUID
- `name`: Full name
- `email`: Email (unique)
- `password_hash`: Bcrypt-hashed password
- `role`: Enum ['admin', 'customer_service', 'manager']
- `created_at`, `last_login`: Timestamps

---

### 5. API Endpoints

#### 5.1 Client APIs (Mobile App & Client Web Portal)

**GET `/api/v1/clients/:client_id/loyalty`**
Returns current loyalty status

Response:
```json
{
  "client_id": "uuid",
  "name": "Jane Doe",
  "current_tier": "diamond",
  "lifetime_points": 107500,
  "redeemable_points": 45750,
  "next_tier": null,
  "points_to_next_tier": 0,
  "progress_percentage": 100.0,
  "tier_multiplier": 3.0,
  "credit_available": 228.75
}
```

Note: When client is at Diamond (highest tier), `next_tier` is null, `points_to_next_tier` is 0, and `progress_percentage` is 100.

**POST `/api/v1/clients/:client_id/redeem`**
Redeem points for credit

Request:
```json
{
  "points": 20000
}
```

Response: (See 3.1 Output)

**GET `/api/v1/clients/:client_id/transactions`**
Get points transaction history (paginated)

Query params: `?page=1&limit=20&type=earn|redeem|adjustment`

Response:
```json
{
  "transactions": [
    {
      "id": "uuid",
      "type": "earn",
      "source": "axiscare",
      "date": "2026-02-10T10:00:00Z",
      "invoice_amount": 2500.00,
      "points_earned": 7500,
      "tier_at_transaction": "diamond",
      "multiplier": 3.0
    },
    {
      "id": "uuid",
      "type": "redeem",
      "source": null,
      "date": "2026-02-11T15:30:00Z",
      "points_redeemed": 10000,
      "credit_amount": 50.00,
      "voucher_code": "NV-X1Y2Z3"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

**GET `/api/v1/clients/:client_id/redemptions`**
Get redemption history (paginated)

Response: List of all redemptions with voucher codes and application status

---

#### 5.2 Admin APIs (Admin Web Dashboard)

**POST `/api/v1/admin/auth/login`**
Admin login

Request:
```json
{
  "email": "admin@noorvana.com",
  "password": "SecurePassword123"
}
```

Response:
```json
{
  "token": "jwt-token-here",
  "admin": {
    "id": "uuid",
    "name": "Admin Name",
    "email": "admin@noorvana.com",
    "role": "admin"
  }
}
```

**POST `/api/v1/admin/auth/logout`**
Admin logout (invalidate token)

**GET `/api/v1/admin/clients`**
List all clients with loyalty data (paginated, filterable)

Query params: `?page=1&limit=50&tier=gold&min_points=10000&search=jane`

Response:
```json
{
  "clients": [
    {
      "id": "uuid",
      "axiscare_client_id": "AC-12345",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "care_package": "premium",
      "current_tier": "gold",
      "lifetime_points": 32500,
      "redeemable_points": 12750
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1250,
    "total_pages": 25
  }
}
```

**GET `/api/v1/admin/clients/:client_id`**
Get detailed client information

Response: Complete client profile with transaction and redemption history

**POST `/api/v1/admin/transactions`**
Manually record spending (admin manual entry)

Request:
```json
{
  "client_id": "uuid",
  "invoice_id": "INV-2026-001234",
  "invoice_amount": 2500.00,
  "payment_date": "2026-02-13T12:00:00Z",
  "source": "manual"
}
```

Response: (See 2.1 Output)

**POST `/api/v1/admin/clients/:client_id/adjust`**
Manual point adjustment (customer service use)

Request:
```json
{
  "adjustment_type": "add",
  "points": 1000,
  "reason": "Billing error correction",
  "adjust_lifetime": true,
  "adjust_redeemable": true
}
```

Response:
```json
{
  "adjustment_id": "uuid",
  "client_id": "uuid",
  "lifetime_points_before": 25000,
  "lifetime_points_after": 26000,
  "redeemable_points_before": 8000,
  "redeemable_points_after": 9000,
  "adjusted_at": "2026-02-13T14:00:00Z",
  "adjusted_by": "Admin Name",
  "reason": "Billing error correction"
}
```

**GET `/api/v1/admin/reports/tier-distribution`**
Get tier distribution statistics

Response:
```json
{
  "report_date": "2026-02-13",
  "total_clients": 1250,
  "tier_distribution": {
    "bronze": 450,
    "silver": 320,
    "gold": 280,
    "platinum": 150,
    "diamond": 50
  },
  "average_lifetime_points": 18750,
  "total_redeemable_points": 15625000
}
```

**GET `/api/v1/admin/reports/monthly-stats`**
Get monthly points and redemption statistics

Query params: `?months=6`

Response:
```json
{
  "months": [
    {
      "month": "2026-02",
      "points_accrued": 125000,
      "redemptions_count": 45,
      "redemptions_value": 22500
    }
  ]
}
```

**GET `/api/v1/admin/reports/top-clients`**
Get top 10 clients by lifetime points

Response: Array of top 10 clients with full details

---

#### 5.3 Webhook Endpoints

**POST `/webhook/axiscare/payment`**
Primary webhook for AxisCare payment events

- Verify webhook signature using `AXISCARE_WEBHOOK_SECRET`
- Parse AxisCare payload
- Match client by `axiscare_client_id`
- Process payment and award points
- Return 200 OK on success, 400 on validation error, 500 on server error

**POST `/webhook/generic/payment`**
Backup webhook for other payment sources

- Verify webhook signature using `GENERIC_WEBHOOK_SECRET`
- Parse generic payload
- Match client by `email`
- Process payment and award points
- Return 200 OK on success

---

### 6. Admin Web Dashboard Requirements

#### 6.1 Dashboard Pages & Functionality

**Login Page** (`/admin/login`)
- Email and password fields
- Login button
- Error message display (invalid credentials)

**Home/Overview** (`/admin/dashboard`)
- Card: Total clients enrolled
- Card: Tier distribution (pie chart)
- Card: Points accrued this month vs. last month (% change)
- Card: Redemptions this month (count + dollar value)
- Line chart: Monthly points trend (last 6 months)

**Client List** (`/admin/clients`)
- Search bar (search by name, email, or AxisCare ID)
- Filters: Tier dropdown, Care Package dropdown
- Table columns: Name, Email, AxisCare ID, Tier, Lifetime Points, Redeemable Points
- Pagination controls (50 clients per page)
- Click row → navigate to client detail page

**Client Detail** (`/admin/clients/:id`)
- Section 1: Client Info Card
  - Name, email, AxisCare ID, care package, tier badge
  - Lifetime points, redeemable points
  - Progress bar to next tier (or "MAX TIER" badge for Diamond)
- Section 2: Transaction History Table
  - Columns: Date, Type, Source, Amount/Points, Description
  - Pagination
- Section 3: Redemption History Table
  - Columns: Date, Points Redeemed, Credit Amount, Voucher Code, Status
  - Pagination
- Button: "Adjust Points" → opens modal

**Point Adjustment Modal**
- Input: Points amount (number, can be positive or negative)
- Checkboxes:
  - [ ] Apply to lifetime points
  - [ ] Apply to redeemable points
- Text area: Reason (required, min 10 characters)
- Buttons: Cancel, Submit
- On submit: Show loading state, then success/error message

**Reports Page** (`/admin/reports`)
- Tab 1: Tier Distribution
  - Table: Tier, Count, Percentage
  - Pie chart visualization
- Tab 2: Monthly Trends
  - Line chart: Points accrued over time
  - Line chart: Redemptions over time
- Tab 3: Top Clients
  - Table: Top 10 clients by lifetime points
- Export to CSV button (for each tab)

#### 6.2 UI/UX Requirements
- Responsive design (desktop 1920×1080, tablet 1024×768)
- Loading spinners for all API calls
- Toast notifications for success/error messages
- Confirmation dialogs for destructive actions
- Accessible (ARIA labels, keyboard navigation)
- Use Material-UI, Ant Design, or Chakra UI component library

---

### 7. Data Validation Rules

#### Payment Amount
- Must be numeric
- Must be > 0
- Must have max 2 decimal places
- Must be < $1,000,000 (sanity check)

#### Points
- Must be integer
- Must be ≥ 0
- Redeemable points cannot be negative

#### Email
- Must be valid email format
- Must be unique

#### AxisCare Client ID
- Must be string
- Must be unique
- Used for matching webhook events to clients

#### Tier
- Must be one of: bronze, silver, gold, platinum, diamond
- Case-insensitive when received, stored lowercase

#### Care Package
- Must be one of: essentials, premium, white_glove
- Case-insensitive when received, stored lowercase

#### Admin Password
- Minimum 12 characters
- Must contain: uppercase, lowercase, number, special character

---

### 8. Error Handling

**Standard Error Response Format**:
```json
{
  "error": {
    "code": "INSUFFICIENT_POINTS",
    "message": "Client has 8,500 redeemable points but attempted to redeem 10,000 points",
    "details": {
      "redeemable_points": 8500,
      "requested_points": 10000
    }
  }
}
```

**Error Codes**:
- `CLIENT_NOT_FOUND`: Client ID does not exist
- `CLIENT_NOT_MATCHED`: Webhook client ID not found in loyalty system
- `INSUFFICIENT_POINTS`: Not enough redeemable points
- `INVALID_REDEMPTION_AMOUNT`: Points must be multiple of 10,000
- `DUPLICATE_INVOICE`: Invoice ID already processed
- `INVALID_INPUT`: Validation error on input fields
- `UNAUTHORIZED`: Authentication failed
- `FORBIDDEN`: User lacks permission for this action
- `WEBHOOK_SIGNATURE_INVALID`: Webhook signature verification failed
- `INTERNAL_ERROR`: Unexpected server error
- `INVALID_CREDENTIALS`: Login failed (wrong email/password)

---

### 9. Authentication & Authorization

#### JWT Token Structure
```json
{
  "user_id": "uuid",
  "user_type": "client" | "admin",
  "role": "admin" | "customer_service" | "manager",
  "client_id": "uuid",
  "iat": 1234567890,
  "exp": 1234571490
}
```

#### Access Rules
- **Client**: Can only access own data
- **Admin (all roles)**: Can access all `/api/v1/admin/*` endpoints
- **Manager role**: Read-only access (cannot adjust points)
- **Webhooks**: Authenticated via signature/secret (not JWT)

#### Rate Limiting
- Client endpoints: 100 requests per 15 minutes per client
- Admin endpoints: 1000 requests per 15 minutes per admin
- Redemption endpoint: 5 requests per hour per client
- Webhook endpoints: 500 requests per 15 minutes (per source IP)

---

### 10. Database Schema Requirements

#### Clients Table
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  axiscare_client_id VARCHAR(100) UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  care_package VARCHAR(50) NOT NULL CHECK (care_package IN ('essentials', 'premium', 'white_glove')),
  current_tier VARCHAR(50) NOT NULL DEFAULT 'bronze' CHECK (current_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  lifetime_points INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_points >= 0),
  redeemable_points INTEGER NOT NULL DEFAULT 0 CHECK (redeemable_points >= 0),
  tier_upgraded_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_tier ON clients(current_tier);
CREATE INDEX idx_clients_axiscare ON clients(axiscare_client_id);
```

#### Points Transactions Table
```sql
CREATE TABLE points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earn', 'redeem', 'adjustment')),
  source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('axiscare', 'quickbooks', 'manual', 'other')),
  invoice_id VARCHAR(100),
  invoice_amount DECIMAL(10,2),
  lifetime_points_change INTEGER NOT NULL,
  redeemable_points_change INTEGER NOT NULL,
  tier_at_transaction VARCHAR(50) NOT NULL,
  multiplier_applied DECIMAL(3,1),
  description TEXT,
  created_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_points_transactions_client ON points_transactions(client_id);
CREATE INDEX idx_points_transactions_type ON points_transactions(transaction_type);
CREATE INDEX idx_points_transactions_source ON points_transactions(source);
CREATE INDEX idx_points_transactions_invoice ON points_transactions(invoice_id);
CREATE INDEX idx_points_transactions_date ON points_transactions(created_at);
```

#### Tier History Table
```sql
CREATE TABLE tier_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  from_tier VARCHAR(50) NOT NULL,
  to_tier VARCHAR(50) NOT NULL,
  lifetime_points_at_upgrade INTEGER NOT NULL,
  upgraded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tier_history_client ON tier_history(client_id);
```

#### Redemption History Table
```sql
CREATE TABLE redemption_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  points_redeemed INTEGER NOT NULL,
  credit_amount DECIMAL(10,2) NOT NULL,
  voucher_code VARCHAR(20) UNIQUE NOT NULL,
  redeemed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  applied_to_invoice VARCHAR(100),
  applied_at TIMESTAMP
);

CREATE INDEX idx_redemption_history_client ON redemption_history(client_id);
CREATE INDEX idx_redemption_history_voucher ON redemption_history(voucher_code);
```

#### Admin Users Table
```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'customer_service', 'manager')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE INDEX idx_admin_users_email ON admin_users(email);
```

---

### 11. Testing Scenarios

#### Scenario 1: New Client First Purchase (Bronze 1.0x)
```
Given: New client (Bronze tier, 0 points)
When: AxisCare webhook sends $2,000 payment
Then:
  - Earn 2,000 points (Bronze 1.0x multiplier)
  - Lifetime points = 2,000
  - Redeemable points = 2,000
  - Tier remains Bronze
  - Source = 'axiscare'
```

#### Scenario 2: Tier Upgrade to Silver
```
Given: Client with 9,500 lifetime points (Bronze tier)
When: AxisCare webhook sends $1,000 payment
Then:
  - Earn 1,000 points (Bronze 1.0x)
  - Lifetime points = 10,500
  - Tier upgrades to Silver
  - Tier history record created
  - Future purchases earn 1.5x multiplier
```

#### Scenario 3: Diamond Tier Earning (3.0x)
```
Given: Client at Diamond tier (105,000 lifetime points)
When: AxisCare webhook sends $2,000 payment
Then:
  - Earn 6,000 points (Diamond 3.0x multiplier)
  - Lifetime points = 111,000
  - Redeemable points increased by 6,000
  - Tier remains Diamond (highest tier)
```

#### Scenario 4: Points Redemption
```
Given: Client with 25,000 redeemable points
When: Client redeems 20,000 points
Then:
  - Redeemable points = 5,000
  - Lifetime points unchanged
  - Credit voucher generated for $100
  - Redemption history created
```

#### Scenario 5: AxisCare Webhook with Unknown Client
```
Given: AxisCare sends webhook for client_id not in loyalty system
When: Webhook received
Then:
  - Log warning: "Client not found: AC-99999"
  - Return 200 OK (don't cause AxisCare to retry)
  - No points awarded
```

#### Scenario 6: Duplicate Invoice Prevention
```
Given: Client at Gold tier
When: AxisCare sends same invoice_id twice
Then:
  - First time: Points awarded normally
  - Second time: Return 200 OK but skip processing
  - Log: "Duplicate invoice skipped: INV-2026-001234"
```

#### Scenario 7: Generic Webhook (Backup)
```
Given: Client with email jane@example.com exists
When: Generic webhook sends payment of $1,500
Then:
  - Match client by email
  - Calculate points using client's current tier multiplier
  - Source = 'quickbooks' (or whatever source field says)
```

#### Scenario 8: Admin Point Adjustment
```
Given: Admin user logged in
When: Admin adjusts client points (+1,000 to both buckets, reason: "billing error")
Then:
  - Lifetime points increased by 1,000
  - Redeemable points increased by 1,000
  - Transaction created with type 'adjustment', source 'manual'
  - Admin ID logged in transaction
```

---

### 12. Environment Variables

Required environment variables (provide in `.env.example`):

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/noorvana_loyalty
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=2h

# API
PORT=3000
NODE_ENV=development
API_VERSION=v1

# Admin Dashboard
ADMIN_FRONTEND_URL=http://localhost:3001

# AxisCare Integration
AXISCARE_WEBHOOK_SECRET=axiscare-webhook-secret-here
AXISCARE_API_BASE_URL=https://api.axiscare.com
AXISCARE_API_KEY=your-axiscare-api-key

# Generic Webhook (Backup)
GENERIC_WEBHOOK_SECRET=generic-webhook-secret-here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

---

### 13. Non-Functional Requirements

#### Performance
- API response time < 200ms for 95% of requests
- Webhook processing < 5 seconds end-to-end
- Support 1,000 concurrent users
- Database queries optimized with proper indexes
- Admin dashboard loads within 2 seconds

#### Security
- All passwords hashed with bcrypt (cost factor 12)
- JWT tokens with expiration
- Webhook signature verification (HMAC-SHA256)
- SQL injection prevention (parameterized queries)
- Input sanitization
- HTTPS only in production
- CORS configured for admin dashboard domain only

#### Scalability
- Stateless API design (horizontal scaling)
- Database connection pooling
- Prepared statements for frequent queries

#### Logging
- Log all point transactions with timestamp and source
- Log all tier upgrades
- Log all redemptions
- Log all admin actions (who did what, when)
- Log all webhook events (received, processed, skipped, failed)
- Log all API errors with stack trace
- Use structured logging (JSON format)

#### Documentation
- README with setup instructions
- API documentation (Swagger/OpenAPI)
- Database ERD diagram
- Environment variables documented
- Admin dashboard user guide
- Webhook integration guide (for development team to configure AxisCare)

---

### 14. Deliverables Checklist

✅ Database schema with migrations
✅ All API endpoints implemented (client + admin + webhooks)
✅ Point accrual logic tested (all 5 tier multipliers including Diamond 3.0x)
✅ Tier upgrade logic tested
✅ Redemption logic tested
✅ AxisCare webhook endpoint with signature verification
✅ Generic webhook endpoint (backup)
✅ Admin authentication system
✅ Admin web dashboard (React)
✅ Client search and management UI
✅ Point adjustment modal
✅ Reports page with charts
✅ Input validation on all endpoints
✅ Error handling with standard format
✅ Test suite with >80% coverage
✅ README.md with setup instructions
✅ .env.example with all variables
✅ package.json with all dependencies
✅ API documentation (Swagger)
✅ Database seed data for testing
✅ Deployment instructions in HANDOFF.md
