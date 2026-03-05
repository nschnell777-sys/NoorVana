const axisCareApiClient = require('../services/axisCareApiClient');
const axisCareService = require('../services/axisCareService');
const SyncLog = require('../models/SyncLog');
const logger = require('../utils/logger');

/**
 * GET /api/v1/admin/axiscare/status
 * Check AxisCare API configuration and connectivity.
 */
const getStatus = async (req, res, next) => {
  try {
    const configured = axisCareApiClient.isConfigured();
    let connectivity = { ok: false, message: 'Not configured' };

    if (configured) {
      connectivity = await axisCareApiClient.ping();
    }

    const lastClientSync = await SyncLog.getLastSuccessful('clients');
    const lastBillingSync = await SyncLog.getLastSuccessful('billing');

    res.json({
      configured,
      connectivity,
      last_client_sync: lastClientSync ? {
        completed_at: lastClientSync.completed_at,
        records_processed: lastClientSync.records_processed,
        records_created: lastClientSync.records_created,
        records_updated: lastClientSync.records_updated,
        records_failed: lastClientSync.records_failed
      } : null,
      last_billing_sync: lastBillingSync ? {
        completed_at: lastBillingSync.completed_at,
        date_from: lastBillingSync.date_from,
        date_to: lastBillingSync.date_to,
        records_processed: lastBillingSync.records_processed,
        records_created: lastBillingSync.records_created
      } : null
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/axiscare/sync-clients
 */
const syncClients = async (req, res, next) => {
  try {
    logger.info('Admin triggered AxisCare client sync', { adminId: req.user.user_id });
    const result = await axisCareService.syncAllClients({
      triggeredBy: req.user.user_id
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/axiscare/sync-billing
 * Body: { date_from: 'YYYY-MM-DD', date_to: 'YYYY-MM-DD' }
 */
const syncBilling = async (req, res, next) => {
  try {
    const { date_from, date_to } = req.body;
    logger.info('Admin triggered AxisCare billing sync', {
      adminId: req.user.user_id, date_from, date_to
    });
    const result = await axisCareService.syncBilling({
      from: date_from,
      to: date_to,
      triggeredBy: req.user.user_id
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/axiscare/sync-client/:axisCareClientId
 */
const syncSingleClient = async (req, res, next) => {
  try {
    const { axisCareClientId } = req.params;
    logger.info('Admin triggered single client sync', {
      adminId: req.user.user_id, axisCareClientId
    });
    const result = await axisCareService.syncSingleClient(axisCareClientId, {
      triggeredBy: req.user.user_id
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/axiscare/sync-logs
 * Query: page, limit, sync_type
 */
const getSyncLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const sync_type = req.query.sync_type || undefined;

    const { logs, total } = await SyncLog.list({ page, limit, sync_type });

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStatus,
  syncClients,
  syncBilling,
  syncSingleClient,
  getSyncLogs
};
