/**
 * controllers/paymentController.js
 * ----------------------------------------------------------------
 * Handles payments in three ways:
 *
 *   1) Manual (admin)    — addPayment: admin records a Cash/Card/UPI
 *                          payment at reception.
 *   2) UPI QR (member)   — the primary online method:
 *        getUpiInfo     → returns the gym's UPI id + a upi:// link with
 *                         the plan amount baked in (the frontend renders
 *                         this as a QR the member scans).
 *        submitUpiPayment → member submits the UPI reference (UTR) after
 *                         paying; a Pending payment is recorded.
 *        getPendingPayments / verifyUpiPayment → an admin reviews and
 *                         approves (extends membership) or rejects it.
 *   3) Razorpay (member) — kept for optional automated payments:
 *        createOrder + verifyPayment (signature-verified).
 *
 * Recording/approving a payment also:
 *   - marks the member's paymentStatus as 'Paid'
 *   - extends the expiry date by the paid period
 *   - resets the reminder history (so reminders restart next cycle)
 * ----------------------------------------------------------------
 */

const crypto  = require('crypto');
const Payment = require('../models/Payment');
const Member  = require('../models/Member');
const { asyncHandler, addMonths } = require('../utils/helpers');

// Authoritative plan pricing (₹ per month). The client never sends the
// amount — we always compute it here so it can't be manipulated.
const PLAN_PRICES = { Basic: 999, Pro: 1999, Elite: 3499 };

/* -----------------------------------------------------------------
   Helpers
----------------------------------------------------------------- */

// Clamp the requested billing period to a sane 1–36 months.
const normalizePeriod = (months) => {
  const n = parseInt(months, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 36);
};

// Apply a paid period to a member: extend expiry, mark paid, reset reminders.
const applyMembershipExtension = (member, plan, periodMonths) => {
  member.membershipPlan = plan;
  member.paymentStatus  = 'Paid';
  // If still active, add onto the remaining time; if expired, start today.
  const base = member.expiryDate > new Date() ? member.expiryDate : new Date();
  member.expiryDate   = addMonths(base, periodMonths);
  member.remindersSent = []; // renewal → reminders fire again next cycle
};

// Resolve the Member document for the logged-in user (members pay for themselves).
const getOwnMember = async (req, res) => {
  const member = await Member.findOne({ user: req.user._id });
  if (!member) {
    res.status(404);
    throw new Error('No membership found for this account.');
  }
  return member;
};

// Build a standard UPI deep link. Scanning/opening it in a UPI app opens
// the payment screen pre-filled with the payee and the exact amount.
const buildUpiLink = (amount, note) => {
  const enc = encodeURIComponent;
  const pa  = process.env.UPI_ID;
  const pn  = process.env.UPI_PAYEE_NAME || 'Bhullar Fitness';
  return `upi://pay?pa=${enc(pa)}&pn=${enc(pn)}&am=${enc(String(amount))}` +
         `&cu=INR&tn=${enc(note || 'Membership renewal')}`;
};

// Resolve {plan, periodMonths, amount} from a request (query or body),
// defaulting the plan to the member's current plan.
const resolveCharge = (src, member) => {
  const plan = PLAN_PRICES[src.plan] ? src.plan : member.membershipPlan;
  const periodMonths = normalizePeriod(src.periodMonths);
  const amount = PLAN_PRICES[plan] * periodMonths;
  return { plan, periodMonths, amount };
};

/* -----------------------------------------------------------------
   1) Manual payment (admin)
----------------------------------------------------------------- */

/**
 * @route   POST /api/payments
 * @desc    Record a manual payment for a member
 * @access  Admin
 * body: { memberId, amount, method, periodMonths }
 */
const addPayment = asyncHandler(async (req, res) => {
  const { memberId, amount, method = 'Cash', periodMonths = 1 } = req.body;

  const member = await Member.findById(memberId);
  if (!member) {
    res.status(404);
    throw new Error('Member not found');
  }

  const months = normalizePeriod(periodMonths);

  const payment = await Payment.create({
    member: member._id,
    amount,
    method,
    periodMonths: months,
    plan: member.membershipPlan,
    status: 'Paid'
  });

  applyMembershipExtension(member, member.membershipPlan, months);
  await member.save();

  res.status(201).json({ payment, member });
});

/* -----------------------------------------------------------------
   2) UPI QR + manual verification (member submits, admin approves)
----------------------------------------------------------------- */

/**
 * @route   GET /api/payments/upi-info
 * @desc    UPI id + a upi:// link (amount baked in) for the member's plan.
 *          The frontend turns the link into a QR code.
 * @access  Member
 * query: { plan?, periodMonths? }
 */
const getUpiInfo = asyncHandler(async (req, res) => {
  if (!process.env.UPI_ID) {
    res.status(503);
    throw new Error('UPI payments are not configured. Set UPI_ID in .env.');
  }
  const member = await getOwnMember(req, res);
  const { plan, periodMonths, amount } = resolveCharge(req.query, member);

  res.json({
    upiId: process.env.UPI_ID,
    payeeName: process.env.UPI_PAYEE_NAME || 'Bhullar Fitness',
    amount,
    plan,
    periodMonths,
    upiLink: buildUpiLink(amount, `${plan} plan - ${member.name}`)
  });
});

/**
 * @route   POST /api/payments/upi-submit
 * @desc    Member submits their UPI transaction reference (UTR) after
 *          paying. Creates a Pending payment for an admin to verify.
 * @access  Member
 * body: { plan?, periodMonths?, reference }
 */
const submitUpiPayment = asyncHandler(async (req, res) => {
  const member = await getOwnMember(req, res);

  const reference = (req.body.reference || '').trim();
  if (!reference) {
    res.status(400);
    throw new Error('Please enter the UPI transaction reference (UTR).');
  }

  const { plan, periodMonths, amount } = resolveCharge(req.body, member);

  const payment = await Payment.create({
    member: member._id,
    amount,
    method: 'UPI',
    status: 'Pending',          // awaits admin verification
    periodMonths,
    plan,
    upiReference: reference
  });

  res.status(201).json({ success: true, payment });
});

/**
 * @route   GET /api/payments/pending
 * @desc    List UPI payments awaiting verification (newest first).
 * @access  Admin
 */
const getPendingPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ status: 'Pending', method: 'UPI' })
    .populate('member', 'name email membershipPlan phone')
    .sort({ date: -1 });
  res.json({ count: payments.length, payments });
});

/**
 * @route   POST /api/payments/:id/verify-upi
 * @desc    Approve (→ Paid + extend membership) or reject a pending UPI payment.
 * @access  Admin
 * body: { action: 'approve' | 'reject' }
 */
const verifyUpiPayment = asyncHandler(async (req, res) => {
  const action = req.body.action === 'reject' ? 'reject' : 'approve';

  const payment = await Payment.findById(req.params.id);
  if (!payment) {
    res.status(404);
    throw new Error('Payment not found');
  }
  if (payment.status !== 'Pending') {
    res.status(400);
    throw new Error('This payment has already been processed.');
  }

  payment.verifiedAt = new Date();
  payment.verifiedBy = req.user._id;

  if (action === 'reject') {
    payment.status = 'Rejected';
    await payment.save();
    return res.json({ success: true, action, payment });
  }

  // Approve → mark Paid and extend the member's membership.
  const member = await Member.findById(payment.member);
  if (!member) {
    res.status(404);
    throw new Error('Member not found');
  }

  payment.status = 'Paid';
  await payment.save();

  applyMembershipExtension(member, payment.plan || member.membershipPlan, payment.periodMonths || 1);
  await member.save();

  res.json({ success: true, action, payment, member });
});

/* -----------------------------------------------------------------
   3) Razorpay (optional automated method — kept available)
----------------------------------------------------------------- */

const getRazorpayClient = (res) => {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    res.status(503);
    throw new Error('Online payments are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.');
  }
  let Razorpay;
  try {
    Razorpay = require('razorpay');
  } catch (e) {
    res.status(503);
    throw new Error('Razorpay package not installed on the server. Run: npm install razorpay');
  }
  return new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
};

/**
 * @route   POST /api/payments/create-order
 * @access  Member
 */
const createOrder = asyncHandler(async (req, res) => {
  const razorpay = getRazorpayClient(res);
  const member   = await getOwnMember(req, res);
  const { plan, periodMonths, amount } = resolveCharge(req.body, member);

  const order = await razorpay.orders.create({
    amount: amount * 100,                // Razorpay uses paise
    currency: 'INR',
    receipt: `rcpt_${member._id}_${Date.now()}`,
    notes: { memberId: String(member._id), plan, periodMonths: String(periodMonths) }
  });

  res.json({ order, keyId: process.env.RAZORPAY_KEY_ID, plan, periodMonths, amount });
});

/**
 * @route   POST /api/payments/verify
 * @access  Member
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_SECRET) {
    res.status(503);
    throw new Error('Online payments are not configured.');
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400);
    throw new Error('Missing Razorpay payment fields.');
  }

  const expected = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const a = Buffer.from(expected);
  const b = Buffer.from(razorpay_signature);
  if (!(a.length === b.length && crypto.timingSafeEqual(a, b))) {
    res.status(400);
    throw new Error('Payment verification failed — signature mismatch.');
  }

  const member = await getOwnMember(req, res);
  const { plan, periodMonths, amount } = resolveCharge(req.body, member);

  const payment = await Payment.create({
    member: member._id,
    amount,
    method: 'Online',
    status: 'Paid',
    periodMonths,
    plan,
    razorpayOrderId:   razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature
  });

  applyMembershipExtension(member, plan, periodMonths);
  await member.save();

  res.status(201).json({ success: true, payment, member });
});

/* -----------------------------------------------------------------
   History
----------------------------------------------------------------- */

/**
 * @route   GET /api/payments/:memberId
 * @desc    Get a member's payment history (newest first)
 * @access  Admin or the member themselves
 */
const getPaymentHistory = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ member: req.params.memberId }).sort({ date: -1 });
  res.json({ count: payments.length, payments });
});

module.exports = {
  addPayment,
  getUpiInfo,
  submitUpiPayment,
  getPendingPayments,
  verifyUpiPayment,
  createOrder,
  verifyPayment,
  getPaymentHistory
};
