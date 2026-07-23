'use strict';

/**
 * Centralized error model. All error responses use the shape:
 *   { "error": { "code": string, "message": string } }
 * with user-friendly messages and no internal detail leakage (T051).
 */

const ALLOWED_STATUSES = [400, 401, 404, 422, 502, 504];

class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.expose = true;
  }
}

/** Create a typed, client-safe error. */
function createError(status, code, message) {
  return new AppError(status, code, message);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Known, client-safe application errors.
  if (err instanceof AppError && ALLOWED_STATUSES.includes(err.status)) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }

  // Malformed JSON body (body-parser) -> 400.
  if (err && (err.type === 'entity.parse.failed' || err instanceof SyntaxError)) {
    return res
      .status(400)
      .json({ error: { code: 'bad_request', message: 'Request body is not valid JSON.' } });
  }

  // Payload too large (body-parser) -> 400.
  if (err && err.status === 413) {
    return res
      .status(400)
      .json({ error: { code: 'payload_too_large', message: 'Request payload is too large.' } });
  }

  // Anything else: do not leak internals.
  // eslint-disable-next-line no-console
  console.error('[errorHandler] unexpected error:', err && err.stack ? err.stack : err);
  return res
    .status(500)
    .json({ error: { code: 'internal', message: 'An unexpected error occurred.' } });
}

module.exports = { AppError, createError, errorHandler, ALLOWED_STATUSES };
