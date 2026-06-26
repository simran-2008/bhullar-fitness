/**
 * middleware/errorHandler.js
 * ----------------------------------------------------------------
 * Centralised error handling so controllers stay clean. Instead of
 * writing try/catch JSON responses everywhere, controllers can call
 * `next(error)` (or throw inside an async wrapper) and this handler
 * formats a consistent JSON error response.
 *
 * Also exports a `notFound` handler for unmatched routes.
 * ----------------------------------------------------------------
 */

/**
 * notFound — runs when no route matched the request URL.
 */
const notFound = (req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

/**
 * errorHandler — the final middleware. Express recognises it as an
 * error handler because it has FOUR arguments (err, req, res, next).
 */
const errorHandler = (err, req, res, next) => {
  // If a status code was already set, keep it; otherwise 500.
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Server Error';

  // Mongoose: bad ObjectId (e.g. /members/abc123 where abc123 isn't valid)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // Mongoose: duplicate key (e.g. registering an email that exists)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
  }

  // Mongoose: validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }

  res.status(statusCode).json({
    message,
    // Only leak the stack trace in development for debugging
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
};

module.exports = { notFound, errorHandler };
