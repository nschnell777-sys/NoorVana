const axisCareApiClient = require('./axisCareApiClient');
const { awardPoints } = require('./pointsService');
const Client = require('../models/Client');
const SyncLog = require('../models/SyncLog');
const { DuplicateInvoiceError, ClientNotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Sync all clients from AxisCare into the loyalty system.
 * Creates new clients, updates existing ones (matched by axiscare_client_id).
 * @param {object} [options]
 * @param {string} [options.triggeredBy] - Admin user ID
 * @returns {Promise<object>} Sync result with stats
 */
const syncAllClients = async ({ triggeredBy } = {}) => {
  const syncLog = await SyncLog.create({
    sync_type: 'clients',
    status: 'running',
    triggered_by: triggeredBy || null
  });

  const stats = { processed: 0, created: 0, updated: 0, failed: 0, errors: [] };

  try {
    const acClients = await axisCareApiClient.getClients();
    stats.processed = acClients.length;

    for (const acClient of acClients) {
      try {
        const existing = await Client.findByAxisCareId(acClient.axiscare_client_id);

        if (existing) {
          await Client.updateProfile(existing.id, {
            phone: acClient.phone,
            address_street: acClient.address_street,
            address_apt: acClient.address_apt,
            address_city: acClient.address_city,
            address_state: acClient.address_state,
            address_zip: acClient.address_zip
          });
          if (existing.care_package !== acClient.care_package) {
            logger.info('Care package mismatch detected', {
              axisCareClientId: acClient.axiscare_client_id,
              current: existing.care_package,
              axiscare: acClient.care_package
            });
          }
          stats.updated++;
        } else {
          if (!acClient.email) {
            logger.warn('Skipping AxisCare client without email', {
              axisCareClientId: acClient.axiscare_client_id
            });
            stats.failed++;
            stats.errors.push({
              axiscare_client_id: acClient.axiscare_client_id,
              error: 'Missing email address'
            });
            continue;
          }

          const emailMatch = await Client.findByEmail(acClient.email);
          if (emailMatch) {
            const db = require('../db');
            await db('clients').where({ id: emailMatch.id }).update({
              axiscare_client_id: acClient.axiscare_client_id,
              updated_at: db.fn.now()
            });
            await Client.updateProfile(emailMatch.id, {
              phone: acClient.phone,
              address_street: acClient.address_street,
              address_apt: acClient.address_apt,
              address_city: acClient.address_city,
              address_state: acClient.address_state,
              address_zip: acClient.address_zip
            });
            stats.updated++;
          } else {
            await Client.create({
              ...acClient,
              current_tier: 'bronze',
              lifetime_points: 0,
              redeemable_points: 0
            });
            stats.created++;
          }
        }
      } catch (err) {
        stats.failed++;
        stats.errors.push({
          axiscare_client_id: acClient.axiscare_client_id,
          error: err.message
        });
        logger.error('Failed to sync client', {
          axisCareClientId: acClient.axiscare_client_id,
          error: err.message
        });
      }
    }

    await SyncLog.update(syncLog.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      records_processed: stats.processed,
      records_created: stats.created,
      records_updated: stats.updated,
      records_failed: stats.failed,
      details: stats.errors.length > 0 ? { errors: stats.errors } : null
    });
  } catch (err) {
    await SyncLog.update(syncLog.id, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: err.message,
      records_processed: stats.processed,
      records_created: stats.created,
      records_updated: stats.updated,
      records_failed: stats.failed
    });
    throw err;
  }

  return { sync_log_id: syncLog.id, ...stats };
};

/**
 * Sync a single client from AxisCare by their AxisCare client ID.
 * @param {string} axisCareClientId
 * @param {object} [options]
 * @param {string} [options.triggeredBy]
 * @returns {Promise<object>}
 */
const syncSingleClient = async (axisCareClientId, { triggeredBy } = {}) => {
  const syncLog = await SyncLog.create({
    sync_type: 'single_client',
    status: 'running',
    triggered_by: triggeredBy || null,
    axiscare_client_id: axisCareClientId
  });

  try {
    const acClient = await axisCareApiClient.getClient(axisCareClientId);

    let action;
    const existing = await Client.findByAxisCareId(axisCareClientId);

    if (existing) {
      await Client.updateProfile(existing.id, {
        phone: acClient.phone,
        address_street: acClient.address_street,
        address_apt: acClient.address_apt,
        address_city: acClient.address_city,
        address_state: acClient.address_state,
        address_zip: acClient.address_zip
      });
      action = 'updated';
    } else {
      if (!acClient.email) {
        throw new Error('AxisCare client has no email address');
      }
      const emailMatch = await Client.findByEmail(acClient.email);
      if (emailMatch) {
        const db = require('../db');
        await db('clients').where({ id: emailMatch.id }).update({
          axiscare_client_id: axisCareClientId,
          updated_at: db.fn.now()
        });
        action = 'linked';
      } else {
        await Client.create({
          ...acClient,
          current_tier: 'bronze',
          lifetime_points: 0,
          redeemable_points: 0
        });
        action = 'created';
      }
    }

    // Also sync this client's full billing history so they come in up to date
    // Use the client's created_at (or AxisCare enrollment) as the start date
    const client = await Client.findByAxisCareId(axisCareClientId);
    let billingStats = { created: 0, skipped: 0, failed: 0 };
    if (client) {
      try {
        const enrollDate = new Date(client.created_at);
        const fromDate = enrollDate.toISOString().split('T')[0];
        const toDate = new Date().toISOString().split('T')[0];
        const billingResult = await syncClientBilling(axisCareClientId, {
          from: fromDate,
          to: toDate,
          triggeredBy
        });
        billingStats = { created: billingResult.created, skipped: billingResult.skipped, failed: billingResult.failed };
      } catch (billingErr) {
        logger.warn('Billing sync failed during single client sync', {
          axisCareClientId,
          error: billingErr.message
        });
      }
    }

    await SyncLog.update(syncLog.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      records_processed: 1,
      records_created: action === 'created' ? 1 : 0,
      records_updated: action !== 'created' ? 1 : 0,
      records_failed: 0,
      details: { billing: billingStats }
    });

    return { sync_log_id: syncLog.id, action, billing: billingStats };
  } catch (err) {
    await SyncLog.update(syncLog.id, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: err.message,
      records_processed: 1,
      records_failed: 1
    });
    throw err;
  }
};

/**
 * Sync billing/payments from AxisCare for a date range.
 * Uses awardPoints() which has built-in idempotency via invoice_id dedup.
 * @param {object} options
 * @param {string} options.from - YYYY-MM-DD
 * @param {string} options.to   - YYYY-MM-DD
 * @param {string} [options.triggeredBy]
 * @returns {Promise<object>}
 */
const syncBilling = async ({ from, to, triggeredBy } = {}) => {
  const syncLog = await SyncLog.create({
    sync_type: 'billing',
    status: 'running',
    triggered_by: triggeredBy || null,
    date_from: from,
    date_to: to
  });

  const stats = { processed: 0, created: 0, skipped: 0, failed: 0, errors: [] };

  try {
    const payments = await axisCareApiClient.getPayments({ from, to });
    stats.processed = payments.length;

    for (const payment of payments) {
      try {
        if (payment.status !== 'completed') {
          stats.skipped++;
          continue;
        }

        const client = await Client.findByAxisCareId(payment.axiscare_client_id);
        if (!client) {
          stats.failed++;
          stats.errors.push({
            invoice_id: payment.invoice_id,
            axiscare_client_id: payment.axiscare_client_id,
            error: 'Client not found in loyalty system'
          });
          continue;
        }

        await awardPoints({
          clientId: client.id,
          paymentAmount: payment.payment_amount,
          source: 'axiscare',
          invoiceId: payment.invoice_id,
          description: `AxisCare sync - Invoice ${payment.invoice_id}`
        });
        stats.created++;
      } catch (err) {
        if (err instanceof DuplicateInvoiceError) {
          stats.skipped++;
        } else {
          stats.failed++;
          stats.errors.push({
            invoice_id: payment.invoice_id,
            error: err.message
          });
          logger.error('Failed to process payment in billing sync', {
            invoiceId: payment.invoice_id,
            error: err.message
          });
        }
      }
    }

    await SyncLog.update(syncLog.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      records_processed: stats.processed,
      records_created: stats.created,
      records_updated: stats.skipped,
      records_failed: stats.failed,
      details: stats.errors.length > 0 ? { errors: stats.errors } : null
    });
  } catch (err) {
    await SyncLog.update(syncLog.id, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: err.message,
      records_processed: stats.processed,
      records_created: stats.created,
      records_updated: stats.skipped,
      records_failed: stats.failed
    });
    throw err;
  }

  return { sync_log_id: syncLog.id, ...stats };
};

/**
 * Sync billing for a single client from AxisCare.
 * @param {string} axisCareClientId
 * @param {object} options
 * @param {string} options.from
 * @param {string} options.to
 * @param {string} [options.triggeredBy]
 * @returns {Promise<object>}
 */
const syncClientBilling = async (axisCareClientId, { from, to, triggeredBy } = {}) => {
  const client = await Client.findByAxisCareId(axisCareClientId);
  if (!client) {
    throw new ClientNotFoundError(axisCareClientId);
  }

  const syncLog = await SyncLog.create({
    sync_type: 'single_client_billing',
    status: 'running',
    triggered_by: triggeredBy || null,
    axiscare_client_id: axisCareClientId,
    date_from: from,
    date_to: to
  });

  const stats = { processed: 0, created: 0, skipped: 0, failed: 0, errors: [] };

  try {
    const payments = await axisCareApiClient.getClientPayments(axisCareClientId, { from, to });
    stats.processed = payments.length;

    for (const payment of payments) {
      try {
        if (payment.status !== 'completed') {
          stats.skipped++;
          continue;
        }

        await awardPoints({
          clientId: client.id,
          paymentAmount: payment.payment_amount,
          source: 'axiscare',
          invoiceId: payment.invoice_id,
          description: `AxisCare sync - Invoice ${payment.invoice_id}`
        });
        stats.created++;
      } catch (err) {
        if (err instanceof DuplicateInvoiceError) {
          stats.skipped++;
        } else {
          stats.failed++;
          stats.errors.push({ invoice_id: payment.invoice_id, error: err.message });
        }
      }
    }

    await SyncLog.update(syncLog.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      records_processed: stats.processed,
      records_created: stats.created,
      records_updated: stats.skipped,
      records_failed: stats.failed,
      details: stats.errors.length > 0 ? { errors: stats.errors } : null
    });
  } catch (err) {
    await SyncLog.update(syncLog.id, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: err.message
    });
    throw err;
  }

  return { sync_log_id: syncLog.id, ...stats };
};

module.exports = {
  syncAllClients,
  syncSingleClient,
  syncBilling,
  syncClientBilling
};
