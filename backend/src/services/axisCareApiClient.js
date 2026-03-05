/**
 * AxisCare API Client
 *
 * Configurable HTTP client wrapping AxisCare's REST API.
 * All methods have placeholder endpoints marked with TODO comments.
 * Fill in actual endpoint paths, query parameters, and response mappings
 * once AxisCare API documentation is obtained.
 *
 * Configuration via environment variables:
 *   AXISCARE_API_BASE_URL - e.g., https://api.axiscare.com
 *   AXISCARE_API_KEY      - API key for authentication
 */

const logger = require('../utils/logger');
const { AxisCareApiError } = require('../utils/errors');

const BASE_URL = process.env.AXISCARE_API_BASE_URL;
const API_KEY = process.env.AXISCARE_API_KEY;
const MOCK_MODE = process.env.AXISCARE_MOCK === 'true';

// ============================================================
// DEV MOCK DATA — returned when AXISCARE_MOCK=true
// ============================================================
const MOCK_CLIENTS = {
  'AC-10042': {
    id: 'AC-10042',
    first_name: 'Sarah',
    last_name: 'Mitchell',
    email: 'sarah.mitchell@example.com',
    phone: '(305) 555-0147',
    care_level: 'premium',
    status: 'active',
    address: {
      street: '742 Coral Way',
      apt: 'Suite 3B',
      city: 'Miami',
      state: 'FL',
      zip: '33145'
    }
  },
  'AC-10043': {
    id: 'AC-10043',
    first_name: 'James',
    last_name: 'Nguyen',
    email: 'james.nguyen@example.com',
    phone: '(786) 555-0293',
    care_level: 'white_glove',
    status: 'active',
    address: {
      street: '1200 Brickell Ave',
      apt: 'PH-1',
      city: 'Miami',
      state: 'FL',
      zip: '33131'
    }
  }
};

/**
 * Generates mock payment history for a client.
 * Creates weekly invoices from the given date range.
 */
const generateMockPayments = (axisCareClientId, { from, to } = {}) => {
  const client = MOCK_CLIENTS[axisCareClientId];
  if (!client) return [];

  const hourlyRates = { essentials: 40, premium: 50, white_glove: 60 };
  const weeklyHours = { essentials: 24, premium: 32, white_glove: 40 };
  const level = (client.care_level || 'essentials').toLowerCase();
  const baseWeekly = (hourlyRates[level] || 50) * (weeklyHours[level] || 32);

  const startDate = from ? new Date(from) : new Date('2025-06-01');
  const endDate = to ? new Date(to) : new Date();
  const payments = [];
  let invoiceNum = 1001;

  const current = new Date(startDate);
  while (current <= endDate) {
    // Small variance ±15%
    const variance = 0.85 + (Math.sin(invoiceNum * 3.7) * 0.5 + 0.5) * 0.30;
    const amount = Math.round(baseWeekly * variance * 100) / 100;

    payments.push({
      id: `INV-${axisCareClientId}-${invoiceNum}`,
      client_id: axisCareClientId,
      invoice_number: `INV-${axisCareClientId}-${invoiceNum}`,
      amount,
      payment_date: current.toISOString(),
      status: 'completed'
    });

    invoiceNum++;
    current.setDate(current.getDate() + 7);
  }

  return payments;
};

/**
 * Check whether the AxisCare integration is configured.
 * @returns {boolean}
 */
const isConfigured = () => {
  return MOCK_MODE || !!(BASE_URL && API_KEY);
};

/**
 * Makes an authenticated request to the AxisCare API.
 * @param {string} method - HTTP method
 * @param {string} path   - API endpoint path (appended to BASE_URL)
 * @param {object} [options]
 * @param {object} [options.query]  - URL query parameters
 * @param {object} [options.body]   - Request body (JSON)
 * @returns {Promise<object>} Parsed JSON response
 * @throws {AxisCareApiError}
 */
const request = async (method, path, { query, body } = {}) => {
  if (!isConfigured()) {
    throw new AxisCareApiError(
      'AxisCare API is not configured. Set AXISCARE_API_BASE_URL and AXISCARE_API_KEY in your .env file.'
    );
  }

  const url = new URL(path, BASE_URL);
  if (query) {
    Object.entries(query).forEach(([key, val]) => {
      if (val !== undefined && val !== null) url.searchParams.set(key, String(val));
    });
  }

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    // TODO: Confirm AxisCare's authentication header format when docs arrive.
    // Common patterns: 'Authorization: Bearer <key>', 'X-API-Key: <key>', or query param.
    'Authorization': `Bearer ${API_KEY}`
  };

  logger.debug('AxisCare API request', { method, url: url.toString() });

  let response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (err) {
    throw new AxisCareApiError(`AxisCare API unreachable: ${err.message}`, {
      url: url.toString()
    });
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new AxisCareApiError(
      `AxisCare API returned ${response.status}: ${response.statusText}`,
      { status: response.status, body: text, url: url.toString() }
    );
  }

  return response.json();
};

/**
 * Pings the AxisCare API to verify connectivity.
 * @returns {Promise<{ok: boolean, message: string}>}
 */
const ping = async () => {
  if (!isConfigured()) {
    return { ok: false, message: 'AxisCare API not configured' };
  }
  if (MOCK_MODE) {
    return { ok: true, message: 'Mock mode (dev)' };
  }
  try {
    // TODO: Replace with actual AxisCare health/ping endpoint.
    // Possible endpoints: GET /api/v1/status, GET /api/v1/ping, GET /api/v1/me
    await request('GET', '/api/v1/status');
    return { ok: true, message: 'Connected' };
  } catch (err) {
    return { ok: false, message: err.message };
  }
};

// ============================================================
// CLIENT ENDPOINTS
// ============================================================

/**
 * Expected shape from AxisCare (placeholder — update when docs arrive):
 * {
 *   id: string,
 *   first_name: string,
 *   last_name: string,
 *   email: string,
 *   phone: string,
 *   address: { street: string, apt: string, city: string, state: string, zip: string },
 *   care_level: string,    // maps to our care_package
 *   status: string         // 'active' | 'inactive'
 * }
 */

/**
 * Maps a raw AxisCare client object to our internal format.
 * TODO: Update field mappings when AxisCare API docs are available.
 * @param {object} acClient - Raw AxisCare client object
 * @returns {object} Client data in our format
 */
const mapClient = (acClient) => {
  // TODO: The field names below are educated guesses. Adjust to match actual payload.
  const CARE_PACKAGE_MAP = {
    // TODO: Map AxisCare care level values to our enum values
    'essentials': 'essentials',
    'care_essentials': 'essentials',
    'premium': 'premium',
    'care_premium': 'premium',
    'white_glove': 'white_glove',
    'white glove': 'white_glove'
  };

  return {
    axiscare_client_id: String(acClient.id),
    name: [acClient.first_name, acClient.last_name].filter(Boolean).join(' '),
    email: (acClient.email || '').toLowerCase(),
    phone: acClient.phone || null,
    care_package: CARE_PACKAGE_MAP[(acClient.care_level || '').toLowerCase()] || 'essentials',
    address_street: acClient.address?.street || null,
    address_apt: acClient.address?.apt || null,
    address_city: acClient.address?.city || null,
    address_state: acClient.address?.state || null,
    address_zip: acClient.address?.zip || null,
    is_active: acClient.status !== 'inactive'
  };
};

/**
 * Fetches all clients from AxisCare.
 * TODO: Replace endpoint path when docs arrive. Add pagination loop if API paginates.
 * @returns {Promise<object[]>} Array of mapped client objects
 */
const getClients = async () => {
  if (MOCK_MODE) {
    logger.info('AxisCare mock: returning all mock clients');
    return Object.values(MOCK_CLIENTS).map(mapClient);
  }

  // TODO: Replace with actual AxisCare endpoint for listing clients.
  // Likely paginated — implement pagination loop if needed.
  // Possible endpoint: GET /api/v1/clients?limit=100&offset=0
  const data = await request('GET', '/api/v1/clients', {
    query: { limit: 500, status: 'active' }
  });

  // TODO: Adjust based on actual response structure.
  // AxisCare may wrap results: data.clients, data.data, data.results, etc.
  const rawClients = data.clients || data.data || data;

  if (!Array.isArray(rawClients)) {
    throw new AxisCareApiError('Unexpected response format: expected array of clients');
  }

  return rawClients.map(mapClient);
};

/**
 * Fetches a single client from AxisCare by their AxisCare ID.
 * TODO: Replace endpoint path when docs arrive.
 * @param {string} axisCareClientId
 * @returns {Promise<object>} Mapped client object
 */
const getClient = async (axisCareClientId) => {
  if (MOCK_MODE) {
    const mock = MOCK_CLIENTS[axisCareClientId];
    if (!mock) {
      throw new AxisCareApiError(`Mock: client ${axisCareClientId} not found. Valid IDs: ${Object.keys(MOCK_CLIENTS).join(', ')}`);
    }
    logger.info('AxisCare mock: returning client', { axisCareClientId });
    return mapClient(mock);
  }

  // TODO: Replace with actual AxisCare endpoint for single client.
  const data = await request('GET', `/api/v1/clients/${axisCareClientId}`);

  // TODO: Adjust based on actual response structure.
  const rawClient = data.client || data.data || data;
  return mapClient(rawClient);
};

// ============================================================
// PAYMENT / BILLING ENDPOINTS
// ============================================================

/**
 * Expected shape from AxisCare payment (placeholder):
 * {
 *   id: string,
 *   client_id: string,
 *   invoice_number: string,
 *   amount: number,
 *   payment_date: string (ISO 8601),
 *   status: string  // 'completed', 'pending', 'refunded'
 * }
 */

/**
 * Maps a raw AxisCare payment to our internal format.
 * TODO: Update field mappings when AxisCare API docs are available.
 * @param {object} acPayment
 * @returns {object}
 */
const mapPayment = (acPayment) => {
  return {
    axiscare_client_id: String(acPayment.client_id),
    invoice_id: String(acPayment.invoice_number || acPayment.id),
    payment_amount: parseFloat(acPayment.amount),
    payment_date: acPayment.payment_date,
    status: acPayment.status || 'completed'
  };
};

/**
 * Fetches payments from AxisCare within a date range.
 * TODO: Replace endpoint path when docs arrive. Add pagination loop if needed.
 * @param {object} dateRange
 * @param {string} dateRange.from - ISO date string (YYYY-MM-DD)
 * @param {string} dateRange.to   - ISO date string (YYYY-MM-DD)
 * @returns {Promise<object[]>} Array of mapped payment objects
 */
const getPayments = async ({ from, to }) => {
  if (MOCK_MODE) {
    logger.info('AxisCare mock: returning payments', { from, to });
    const allPayments = Object.keys(MOCK_CLIENTS).flatMap(id =>
      generateMockPayments(id, { from, to })
    );
    return allPayments.map(mapPayment);
  }

  // TODO: Replace with actual AxisCare endpoint for listing payments.
  // Possible endpoint: GET /api/v1/payments?from=...&to=...&status=completed
  const data = await request('GET', '/api/v1/payments', {
    query: { from, to, status: 'completed', limit: 500 }
  });

  const rawPayments = data.payments || data.data || data;

  if (!Array.isArray(rawPayments)) {
    throw new AxisCareApiError('Unexpected response format: expected array of payments');
  }

  return rawPayments.map(mapPayment);
};

/**
 * Fetches payments for a specific client within a date range.
 * TODO: Replace endpoint path when docs arrive.
 * @param {string} axisCareClientId
 * @param {object} dateRange
 * @param {string} dateRange.from
 * @param {string} dateRange.to
 * @returns {Promise<object[]>}
 */
const getClientPayments = async (axisCareClientId, { from, to }) => {
  if (MOCK_MODE) {
    if (!MOCK_CLIENTS[axisCareClientId]) {
      throw new AxisCareApiError(`Mock: client ${axisCareClientId} not found`);
    }
    logger.info('AxisCare mock: returning client payments', { axisCareClientId, from, to });
    return generateMockPayments(axisCareClientId, { from, to }).map(mapPayment);
  }

  // TODO: Replace with actual AxisCare endpoint.
  // Possible: GET /api/v1/clients/:id/payments?from=...&to=...
  const data = await request('GET', `/api/v1/clients/${axisCareClientId}/payments`, {
    query: { from, to, status: 'completed', limit: 500 }
  });

  const rawPayments = data.payments || data.data || data;

  if (!Array.isArray(rawPayments)) {
    throw new AxisCareApiError('Unexpected response format: expected array of payments');
  }

  return rawPayments.map(mapPayment);
};

module.exports = {
  isConfigured,
  ping,
  request,
  getClients,
  getClient,
  getPayments,
  getClientPayments,
  mapClient,
  mapPayment
};
