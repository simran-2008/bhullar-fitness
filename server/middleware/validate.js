/**
 * middleware/validate.js
 * ----------------------------------------------------------------
 * Reusable input-validation rules built on express-validator.
 *
 * Each export is an array of validation rules plus a final
 * `handleValidation` middleware that turns any collected errors
 * into a clean 400 response. Attach these arrays to routes.
 * ----------------------------------------------------------------
 */

const { body, validationResult } = require('express-validator');

/**
 * handleValidation — runs after the rule checks. If express-validator
 * collected any errors, respond 400 with the list; otherwise continue.
 */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, msg: e.msg }))
    });
  }
  next();
};

/** Rules for user registration */
const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().trim(),
  handleValidation
];

/** Rules for login */
const loginRules = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation
];

/** Rules for creating/updating a member */
const memberRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('phone').optional().trim(),
  body('membershipPlan').optional().isIn(['Basic', 'Pro', 'Elite']).withMessage('Invalid plan'),
  body('expiryDate').optional().isISO8601().withMessage('Invalid expiry date'),
  handleValidation
];

/** Rules for recording a payment */
const paymentRules = [
  body('memberId').notEmpty().withMessage('memberId is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('method').optional().isIn(['Cash', 'Card', 'UPI', 'Online']).withMessage('Invalid method'),
  handleValidation
];

module.exports = { registerRules, loginRules, memberRules, paymentRules, handleValidation };
