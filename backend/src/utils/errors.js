class AppError extends Error {
  constructor(code, message, statusCode = 400, details = null) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON() {
    const error = { code: this.code, message: this.message };
    if (this.details) error.details = this.details;
    return { error };
  }
}

class ClientNotFoundError extends AppError {
  constructor(clientId) {
    super('CLIENT_NOT_FOUND', 'Client not found', 404);
  }
}

class ClientNotMatchedError extends AppError {
  constructor(identifier) {
    super('CLIENT_NOT_MATCHED', 'Webhook client not found in loyalty system', 200);
  }
}

class InsufficientPointsError extends AppError {
  constructor(available, requested) {
    super(
      'INSUFFICIENT_POINTS',
      'Insufficient redeemable points for this redemption',
      400,
      { redeemable_points: available, requested_points: requested }
    );
  }
}

class InvalidRedemptionAmountError extends AppError {
  constructor(amount) {
    super(
      'INVALID_REDEMPTION_AMOUNT',
      'Points must be a positive multiple of 10,000 (minimum redemption unit)',
      400,
      { requested_points: amount }
    );
  }
}

class DuplicateInvoiceError extends AppError {
  constructor(invoiceId) {
    super('DUPLICATE_INVOICE', 'Invoice already processed', 200);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super('FORBIDDEN', message, 403);
  }
}

class InvalidCredentialsError extends AppError {
  constructor() {
    super('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }
}

class WebhookSignatureError extends AppError {
  constructor() {
    super('WEBHOOK_SIGNATURE_INVALID', 'Webhook signature verification failed', 401);
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super('INVALID_INPUT', message, 400, details);
  }
}

class AxisCareApiError extends AppError {
  constructor(message, details = null) {
    super('AXISCARE_API_ERROR', message, 502, details);
  }
}

class InvalidTwoFactorCodeError extends AppError {
  constructor() {
    super('INVALID_2FA_CODE', 'Invalid two-factor authentication code', 401);
  }
}

class InvalidResetTokenError extends AppError {
  constructor() {
    super('INVALID_RESET_TOKEN', 'Invalid or expired password reset token', 400);
  }
}

module.exports = {
  AppError,
  ClientNotFoundError,
  ClientNotMatchedError,
  InsufficientPointsError,
  InvalidRedemptionAmountError,
  DuplicateInvoiceError,
  UnauthorizedError,
  ForbiddenError,
  InvalidCredentialsError,
  WebhookSignatureError,
  ValidationError,
  AxisCareApiError,
  InvalidTwoFactorCodeError,
  InvalidResetTokenError
};
