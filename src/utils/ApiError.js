// A small typed error so any route/middleware can `throw new ApiError(404, 'Team not found')`
// and the central error handler (middleware/errorHandler.js) knows what HTTP
// status + message to send back. Existing controllers already handle their
// own errors with try/catch + res.status(...).json(...) — this exists for
// anything new that would rather throw and let the central handler deal
// with the response.
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

module.exports = ApiError;
