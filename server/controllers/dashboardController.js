/**
 * controllers/dashboardController.js
 * ----------------------------------------------------------------
 * Provides the aggregate numbers shown on the admin overview:
 * total / active / expiring / expired members, and monthly revenue.
 * ----------------------------------------------------------------
 */

const Member  = require('../models/Member');
const Payment = require('../models/Payment');
const { asyncHandler } = require('../utils/helpers');

/**
 * @route   GET /api/dashboard/stats
 * @desc    Admin overview statistics
 * @access  Admin
 */
const getStats = asyncHandler(async (req, res) => {
  const members = await Member.find();

  // status is a virtual, so compute counts in JS.
  const total    = members.length;
  const active   = members.filter(m => m.status === 'Active').length;
  const expiring = members.filter(m => m.status === 'Expiring Soon').length;
  const expired  = members.filter(m => m.status === 'Expired').length;

  // Revenue this calendar month, summed from Payment records.
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyPayments = await Payment.find({
    status: 'Paid',
    date: { $gte: startOfMonth }
  });
  const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);

  // Plan distribution (handy for charts later).
  const planBreakdown = {
    Basic: members.filter(m => m.membershipPlan === 'Basic').length,
    Pro:   members.filter(m => m.membershipPlan === 'Pro').length,
    Elite: members.filter(m => m.membershipPlan === 'Elite').length
  };

  res.json({
    total,
    active,
    expiring,
    expired,
    monthlyRevenue,
    planBreakdown
  });
});

module.exports = { getStats };
