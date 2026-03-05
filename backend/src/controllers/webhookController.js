const { processAxisCarePayment, processGenericPayment } = require('../services/webhookService');
const { ClientNotMatchedError, DuplicateInvoiceError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * POST /webhook/axiscare/payment
 */
const handleAxisCarePayment = async (req, res, next) => {
  try {
    logger.info('AxisCare webhook received', { invoiceId: req.body.invoice_id });
    const result = await processAxisCarePayment(req.body);
    res.json(result);
  } catch (err) {
    // For client-not-matched or duplicate invoice, return 200 to avoid AxisCare retries
    if (err instanceof ClientNotMatchedError || err instanceof DuplicateInvoiceError) {
      return res.status(200).json({ message: err.message, skipped: true });
    }
    next(err);
  }
};

/**
 * POST /webhook/generic/payment
 */
const handleGenericPayment = async (req, res, next) => {
  try {
    logger.info('Generic webhook received', { invoiceId: req.body.invoice_id });
    const result = await processGenericPayment(req.body);
    res.json(result);
  } catch (err) {
    if (err instanceof ClientNotMatchedError || err instanceof DuplicateInvoiceError) {
      return res.status(200).json({ message: err.message, skipped: true });
    }
    next(err);
  }
};

module.exports = { handleAxisCarePayment, handleGenericPayment };
