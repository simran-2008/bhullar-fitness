/**
 * models/Member.js
 * ----------------------------------------------------------------
 * A Member document holds membership details for a gym member.
 * It links back to a User document (the login account) via `user`.
 *
 * We keep login data (User) separate from membership data (Member)
 * so the system stays scalable — e.g. later you could add staff
 * accounts, or members with multiple memberships, without changing
 * the auth layer.
 *
 * `status` and `daysRemaining` are VIRTUALS — they are computed from
 * the expiry date on the fly, so they're always correct and never
 * go stale in the database.
 * ----------------------------------------------------------------
 */

const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    // Link to the login account. Each member has exactly one user.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Denormalised contact fields (handy for admin lists & search)
    name:  { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },

    membershipPlan: {
      type: String,
      enum: ['Basic', 'Pro', 'Elite'],
      default: 'Basic'
    },

    joiningDate: {
      type: Date,
      default: Date.now
    },

    expiryDate: {
      type: Date,
      required: true
    },

    paymentStatus: {
      type: String,
      enum: ['Paid', 'Pending'],
      default: 'Pending'
    },

    // Tracks which expiry reminders have already been sent so the
    // cron job doesn't email the same person twice for the same day.
    // Reset to [] when the membership is renewed.
    remindersSent: {
      type: [String],            // e.g. ['2-day', '1-day', 'same-day']
      default: []
    }
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true }, // include virtuals when sent as JSON
    toObject: { virtuals: true }
  }
);

/**
 * VIRTUAL: daysRemaining
 * Number of full days until expiry (negative if already expired).
 */
memberSchema.virtual('daysRemaining').get(function () {
  const now  = new Date();
  const diff = this.expiryDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

/**
 * VIRTUAL: status
 * Derived from daysRemaining so it's always accurate.
 */
memberSchema.virtual('status').get(function () {
  const days = this.daysRemaining;
  if (days < 0)  return 'Expired';
  if (days <= 7) return 'Expiring Soon';
  return 'Active';
});

// Index on email to speed up admin search
memberSchema.index({ email: 1 });
memberSchema.index({ name: 'text', email: 'text', phone: 'text' });

module.exports = mongoose.model('Member', memberSchema);
