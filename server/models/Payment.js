/**
 * models/Payment.js
 * ----------------------------------------------------------------
 * Records a single payment made by a member. The payment history
 * shown on both dashboards is just a list of these documents,
 * filtered by member.
 *
 * Keeping payments as their own collection (rather than an array
 * inside Member) means the data scales cleanly — you can run
 * revenue reports, add online-payment gateway references, refunds,
 * invoices, etc. later without restructuring.
 * ----------------------------------------------------------------
 */

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true
    },

    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative']
    },

    method: {
      type: String,
      enum: ['Cash', 'Card', 'UPI', 'Online'],
      default: 'Cash'
    },

    status: {
      type: String,
      enum: ['Paid', 'Pending', 'Refunded', 'Rejected'],
      default: 'Paid'
    },

    // The membership period this payment covers (optional but useful)
    periodMonths: {
      type: Number,
      default: 1
    },

    // --- Razorpay gateway references (set for method 'Online') ---
    // These let you reconcile against the Razorpay dashboard, issue
    // refunds, and prove a payment was verified server-side.
    razorpayOrderId:   { type: String, index: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    // --- UPI manual-verification fields (set for method 'UPI') ---
    // Member pays via a UPI QR (amount embedded) and submits the
    // transaction reference (UTR); an admin then verifies it.
    upiReference: { type: String, trim: true },
    plan:         { type: String, enum: ['Basic', 'Pro', 'Elite'] },
    verifiedAt:   { type: Date },
    verifiedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    date: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

paymentSchema.index({ member: 1, date: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
