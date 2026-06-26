/**
 * routes/paymentRoutes.js
 * ----------------------------------------------------------------
 * Payment endpoints. Mounted in server.js at: /api/payments
 *
 * NOTE: static paths (/upi-info, /pending, ...) are declared BEFORE
 * the /:memberId param route so they aren't captured as a memberId.
 * ----------------------------------------------------------------
 */

const express = require('express');
const router  = express.Router();

const {
  addPayment,
  getUpiInfo,
  submitUpiPayment,
  getPendingPayments,
  verifyUpiPayment,
  createOrder,
  verifyPayment,
  getPaymentHistory
} = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/auth');
const { paymentRules } = require('../middleware/validate');

// --- UPI QR (member self-service) ---
router.get('/upi-info', protect, getUpiInfo);        // UPI id + amount + upi:// link
router.post('/upi-submit', protect, submitUpiPayment); // submit UTR -> Pending

// --- UPI verification (admin) ---
router.get('/pending', protect, adminOnly, getPendingPayments);
router.post('/:id/verify-upi', protect, adminOnly, verifyUpiPayment);

// --- Razorpay (optional automated method) ---
router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);

// --- Manual payment (admin: Cash/Card/UPI at reception) ---
router.post('/', protect, adminOnly, paymentRules, addPayment);

// --- Payment history (any logged-in user; front-end scopes to own id) ---
router.get('/:memberId', protect, getPaymentHistory);

module.exports = router;
