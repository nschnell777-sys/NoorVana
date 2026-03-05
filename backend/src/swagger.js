const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NoorVana Advantage Loyalty System API',
      version: '1.0.0',
      description: 'REST API for the NoorVana five-tier loyalty program. Manages client points, tier upgrades, redemptions, and admin operations.',
      contact: {
        name: 'NoorVana Development Team'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'object' }
              }
            }
          }
        },
        LoyaltyStatus: {
          type: 'object',
          properties: {
            client_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            current_tier: { type: 'string', enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'] },
            lifetime_points: { type: 'integer' },
            redeemable_points: { type: 'integer' },
            next_tier: { type: 'string', nullable: true },
            points_to_next_tier: { type: 'integer' },
            progress_percentage: { type: 'number' },
            tier_multiplier: { type: 'number' },
            credit_available: { type: 'number' }
          }
        },
        RedemptionResult: {
          type: 'object',
          properties: {
            redemption_id: { type: 'string', format: 'uuid' },
            points_redeemed: { type: 'integer' },
            credit_amount: { type: 'number' },
            voucher_code: { type: 'string' },
            remaining_redeemable_points: { type: 'integer' },
            redeemed_at: { type: 'string', format: 'date-time' }
          }
        },
        PointsAwardResult: {
          type: 'object',
          properties: {
            transaction_id: { type: 'string', format: 'uuid' },
            points_earned: { type: 'integer' },
            lifetime_points: { type: 'integer' },
            redeemable_points: { type: 'integer' },
            current_tier: { type: 'string' },
            tier_upgraded: { type: 'boolean' },
            new_tier: { type: 'string', nullable: true },
            multiplier_applied: { type: 'number' },
            source: { type: 'string' }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            total_pages: { type: 'integer' }
          }
        }
      }
    },
    paths: {
      '/api/v1/clients/{id}/loyalty': {
        get: {
          tags: ['Client'],
          summary: 'Get loyalty status',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 200: { description: 'Loyalty status', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoyaltyStatus' } } } } }
        }
      },
      '/api/v1/clients/{id}/redeem': {
        post: {
          tags: ['Client'],
          summary: 'Redeem points for credit',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { points: { type: 'integer', minimum: 10000 } }, required: ['points'] } } } },
          responses: { 201: { description: 'Redemption result', content: { 'application/json': { schema: { $ref: '#/components/schemas/RedemptionResult' } } } } }
        }
      },
      '/api/v1/clients/{id}/transactions': {
        get: {
          tags: ['Client'],
          summary: 'Get points transaction history',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['earn', 'redeem', 'adjustment'] } }
          ],
          responses: { 200: { description: 'Transactions list' } }
        }
      },
      '/api/v1/clients/{id}/redemptions': {
        get: {
          tags: ['Client'],
          summary: 'Get redemption history',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
          ],
          responses: { 200: { description: 'Redemptions list' } }
        }
      },
      '/api/v1/admin/auth/login': {
        post: {
          tags: ['Admin Auth'],
          summary: 'Admin login',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } }, required: ['email', 'password'] } } } },
          responses: { 200: { description: 'Login successful with JWT token' } }
        }
      },
      '/api/v1/admin/clients': {
        get: {
          tags: ['Admin'],
          summary: 'List all clients with loyalty data',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'tier', in: 'query', schema: { type: 'string' } },
            { name: 'care_package', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', schema: { type: 'string' } }
          ],
          responses: { 200: { description: 'Paginated client list' } }
        }
      },
      '/api/v1/admin/clients/{id}': {
        get: {
          tags: ['Admin'],
          summary: 'Get detailed client information',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { 200: { description: 'Client detail with transactions and redemptions' } }
        }
      },
      '/api/v1/admin/transactions': {
        post: {
          tags: ['Admin'],
          summary: 'Manually record spending',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { client_id: { type: 'string', format: 'uuid' }, invoice_id: { type: 'string' }, invoice_amount: { type: 'number' }, payment_date: { type: 'string', format: 'date-time' }, source: { type: 'string', default: 'manual' } }, required: ['client_id', 'invoice_id', 'invoice_amount'] } } } },
          responses: { 201: { description: 'Points awarded', content: { 'application/json': { schema: { $ref: '#/components/schemas/PointsAwardResult' } } } } }
        }
      },
      '/api/v1/admin/clients/{id}/adjust': {
        post: {
          tags: ['Admin'],
          summary: 'Manual point adjustment',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { adjustment_type: { type: 'string', enum: ['add', 'subtract'] }, points: { type: 'integer' }, reason: { type: 'string', minLength: 10 }, adjust_lifetime: { type: 'boolean' }, adjust_redeemable: { type: 'boolean' } }, required: ['points', 'reason', 'adjust_lifetime', 'adjust_redeemable'] } } } },
          responses: { 201: { description: 'Adjustment result' } }
        }
      },
      '/api/v1/admin/reports/tiers': {
        get: { tags: ['Reports'], summary: 'Tier distribution report', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Tier distribution statistics' } } }
      },
      '/api/v1/admin/reports/monthly-stats': {
        get: {
          tags: ['Reports'],
          summary: 'Monthly points and redemption statistics',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'months', in: 'query', schema: { type: 'integer', default: 6 } }],
          responses: { 200: { description: 'Monthly statistics' } }
        }
      },
      '/api/v1/admin/reports/top-clients': {
        get: {
          tags: ['Reports'],
          summary: 'Top clients by lifetime points',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }],
          responses: { 200: { description: 'Top clients list' } }
        }
      },
      '/webhook/axiscare/payment': {
        post: {
          tags: ['Webhooks'],
          summary: 'AxisCare payment webhook',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { event_type: { type: 'string' }, client_id: { type: 'string' }, client_name: { type: 'string' }, client_email: { type: 'string', format: 'email' }, invoice_id: { type: 'string' }, payment_amount: { type: 'number' }, payment_date: { type: 'string', format: 'date-time' }, care_package: { type: 'string' } } } } } },
          responses: { 200: { description: 'Payment processed' } }
        }
      },
      '/webhook/generic/payment': {
        post: {
          tags: ['Webhooks'],
          summary: 'Generic payment webhook (backup)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { source: { type: 'string' }, client_email: { type: 'string', format: 'email' }, invoice_id: { type: 'string' }, payment_amount: { type: 'number' }, payment_date: { type: 'string', format: 'date-time' } } } } } },
          responses: { 200: { description: 'Payment processed' } }
        }
      }
    }
  },
  apis: []
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
