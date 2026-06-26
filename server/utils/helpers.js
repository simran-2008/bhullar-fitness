/**
 * utils/helpers.js
 * ----------------------------------------------------------------
 * Small reusable helpers used across controllers.
 * ----------------------------------------------------------------
 */

const jwt = require('jsonwebtoken');

/**
 * asyncHandler
 * Wraps an async controller so we don't repeat try/catch everywhere.
 * Any thrown error / rejected promise is forwarded to Express's
 * error-handling middleware via next().
 *
 *   router.get('/', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * generateToken
 * Signs a JWT containing the user id. The frontend stores this and
 * sends it back on every request to prove who they are.
 */
const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

/**
 * addMonths
 * Returns a new Date that is `months` after the given start date.
 * Used to calculate a membership's expiry from the joining date.
 */
const addMonths = (startDate, months) => {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + Number(months));
  return d;
};

/**
 * daysUntil
 * Whole days from now until the given date (negative if past).
 */
const daysUntil = (date) =>
  Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));

module.exports = { asyncHandler, generateToken, addMonths, daysUntil };
