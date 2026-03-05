const db = require('../db');
const Client = require('../models/Client');
const { TIER_ORDER } = require('../constants/loyalty');
const { ClientNotFoundError, AppError } = require('../utils/errors');
const logger = require('../utils/logger');

/** Cumulative concierge hours per tier (Gold: 1, +2 at Platinum, +5 at Diamond) */
const TIER_CONCIERGE_HOURS = {
  bronze: 0,
  silver: 0,
  gold: 1,
  platinum: 3,
  diamond: 8
};

/** Valid admin-driven status transitions */
const ADMIN_TRANSITIONS = {
  new: ['reviewing'],
  reviewing: ['quoted'],
  approved: ['connected'],
  connected: ['completed']
};

/**
 * POST /api/v1/clients/:id/concierge-requests
 */
const createConciergeRequest = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new ClientNotFoundError(req.params.id);

    const tierIndex = TIER_ORDER.indexOf(client.current_tier);
    if (tierIndex < 2) { // Gold = index 2
      throw new AppError('TIER_TOO_LOW', 'VIP Concierge is available at Gold tier and above', 403);
    }

    const { request_type, preferred_date, preferred_time, details } = req.body;
    if (!request_type) {
      throw new AppError('MISSING_FIELDS', 'request_type is required', 400);
    }

    const [record] = await db('concierge_requests')
      .insert({
        client_id: client.id,
        tier: client.current_tier,
        request_type,
        preferred_date: preferred_date || null,
        preferred_time: preferred_time || null,
        details: details || null,
        status: 'new'
      })
      .returning('*');

    const result = record || await db('concierge_requests')
      .where({ client_id: client.id })
      .orderBy('created_at', 'desc')
      .first();

    logger.info('Concierge request created', { clientId: client.id, request_type });
    res.status(201).json({ request: result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/clients/:id/concierge-requests
 */
const getClientConciergeRequests = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new ClientNotFoundError(req.params.id);

    const requests = await db('concierge_requests')
      .where({ client_id: client.id })
      .orderBy('created_at', 'desc');

    res.json({ requests });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/clients/:id/concierge-requests/:requestId/respond
 * Body: { response: 'approved' | 'declined', decline_reason?: string }
 */
const respondToConciergeQuote = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new ClientNotFoundError(req.params.id);

    const { requestId } = req.params;
    const { response, decline_reason } = req.body;

    if (!response || !['approved', 'declined'].includes(response)) {
      throw new AppError('INVALID_RESPONSE', 'Response must be "approved" or "declined"', 400);
    }

    if (response === 'declined' && (!decline_reason || !decline_reason.trim())) {
      throw new AppError('MISSING_REASON', 'A reason is required when declining a quote', 400);
    }

    const record = await db('concierge_requests')
      .where({ id: requestId, client_id: client.id })
      .first();

    if (!record) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Concierge request not found' }
      });
    }

    if (record.status !== 'quoted') {
      throw new AppError('INVALID_STATUS', 'Can only respond to requests with status "quoted"', 400);
    }

    const updates = {
      status: response,
      client_response: response,
      client_response_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (response === 'approved') {
      if (!record.quoted_hours || parseFloat(record.quoted_hours) <= 0) {
        throw new AppError('INVALID_QUOTE', 'Cannot approve a request without a valid quote', 400);
      }
      updates.hours_allocated = record.quoted_hours;
    }

    if (response === 'declined') {
      updates.decline_reason = decline_reason.trim();
    }

    await db('concierge_requests').where({ id: requestId }).update(updates);

    const updated = await db('concierge_requests').where({ id: requestId }).first();
    logger.info('Client responded to concierge quote', {
      clientId: client.id,
      requestId,
      response
    });
    res.json({ request: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/clients/:id/concierge-hours
 */
const getConciergeHours = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw new ClientNotFoundError(req.params.id);

    const totalHours = TIER_CONCIERGE_HOURS[client.current_tier] || 0;

    const usedResult = await db('concierge_requests')
      .where({ client_id: client.id })
      .whereIn('status', ['approved', 'connected', 'completed'])
      .sum('hours_allocated as total')
      .first();

    const hoursUsed = parseFloat(usedResult?.total) || 0;

    res.json({
      total_hours: totalHours,
      hours_used: hoursUsed,
      hours_remaining: Math.max(0, totalHours - hoursUsed)
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/concierge-requests
 */
const getAdminConciergeRequests = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = db('concierge_requests')
      .join('clients', 'concierge_requests.client_id', 'clients.id')
      .select(
        'concierge_requests.*',
        'clients.name as client_name',
        'clients.email as client_email',
        'clients.current_tier as client_tier'
      );

    if (status) query = query.where('concierge_requests.status', status);

    const requests = await query.orderBy('concierge_requests.created_at', 'desc');
    res.json({ requests });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/concierge-requests/:id
 */
const updateAdminConciergeRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, hours_allocated, quoted_hours, appointment_date, admin_notes } = req.body;

    const record = await db('concierge_requests').where({ id }).first();
    if (!record) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Concierge request not found' } });
    }

    const updates = { updated_at: new Date().toISOString() };

    if (status) {
      if (['approved', 'declined'].includes(status)) {
        throw new AppError('INVALID_STATUS', 'Only clients can approve or decline quotes', 400);
      }

      const allowed = ADMIN_TRANSITIONS[record.status] || [];
      if (!allowed.includes(status)) {
        throw new AppError('INVALID_TRANSITION',
          `Cannot transition from "${record.status}" to "${status}"`, 400);
      }

      if (status === 'quoted') {
        if (!quoted_hours || parseFloat(quoted_hours) <= 0) {
          throw new AppError('MISSING_QUOTED_HOURS', 'quoted_hours is required when sending a quote', 400);
        }

        // Validate quoted hours against tier limit
        const client = await Client.findById(record.client_id);
        const tierLimit = TIER_CONCIERGE_HOURS[client?.current_tier] || 0;
        if (parseFloat(quoted_hours) > tierLimit) {
          throw new AppError('EXCEEDS_TIER_LIMIT',
            `Quoted hours (${quoted_hours}) exceeds this client's tier limit of ${tierLimit} hours`, 400);
        }
      }

      updates.status = status;
    }

    // Only allow editing quoted_hours before client has responded
    if (quoted_hours !== undefined) {
      if (['approved', 'declined', 'connected', 'completed'].includes(record.status)) {
        throw new AppError('HOURS_LOCKED', 'Cannot change quoted hours after client has responded', 400);
      }
      updates.quoted_hours = quoted_hours;
    }
    if (appointment_date !== undefined) updates.appointment_date = appointment_date;
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;

    await db('concierge_requests').where({ id }).update(updates);

    const updated = await db('concierge_requests').where({ id }).first();
    res.json({ request: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createConciergeRequest,
  getClientConciergeRequests,
  respondToConciergeQuote,
  getConciergeHours,
  getAdminConciergeRequests,
  updateAdminConciergeRequest,
  TIER_CONCIERGE_HOURS
};
