const Client = require('../models/Client');
const { awardPoints } = require('./pointsService');
const { ClientNotMatchedError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Processes an AxisCare payment webhook event.
 * @param {object} payload - AxisCare webhook payload
 * @returns {Promise<object>} Award result
 */
const processAxisCarePayment = async (payload) => {
  const { client_id: axisCareClientId, client_email, invoice_id, payment_amount, payment_date, care_package } = payload;

  // Match client by AxisCare ID (primary) or email (fallback)
  let client = await Client.findByAxisCareId(axisCareClientId);
  if (!client && client_email) {
    client = await Client.findByEmail(client_email);
  }

  if (!client) {
    logger.warn('Client not found for AxisCare webhook', {
      axisCareClientId,
      clientEmail: client_email
    });
    throw new ClientNotMatchedError(axisCareClientId);
  }

  return awardPoints({
    clientId: client.id,
    paymentAmount: payment_amount,
    source: 'axiscare',
    invoiceId: invoice_id,
    paymentDate: payment_date || null,
    description: `AxisCare payment - Invoice ${invoice_id}`
  });
};

/**
 * Processes a generic payment webhook event.
 * @param {object} payload - Generic webhook payload
 * @returns {Promise<object>} Award result
 */
const processGenericPayment = async (payload) => {
  const { source, client_email, invoice_id, payment_amount, payment_date } = payload;

  const client = await Client.findByEmail(client_email);
  if (!client) {
    logger.warn('Client not found for generic webhook', { clientEmail: client_email });
    throw new ClientNotMatchedError(client_email);
  }

  return awardPoints({
    clientId: client.id,
    paymentAmount: payment_amount,
    source: source || 'other',
    invoiceId: invoice_id,
    paymentDate: payment_date || null,
    description: `${source || 'Generic'} payment - Invoice ${invoice_id}`
  });
};

module.exports = {
  processAxisCarePayment,
  processGenericPayment
};
