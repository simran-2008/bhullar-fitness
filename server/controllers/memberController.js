/**
 * controllers/memberController.js
 * ----------------------------------------------------------------
 * CRUD for members, used by the admin dashboard, plus a "my profile"
 * endpoint used by the member dashboard.
 *
 * Adding a member also creates a linked User login account so the
 * member can sign in. Default password is their phone number (they
 * should change it) — adjust this policy as you like.
 * ----------------------------------------------------------------
 */

const Member  = require('../models/Member');
const User    = require('../models/User');
const Payment = require('../models/Payment');
const { asyncHandler, addMonths } = require('../utils/helpers');

/**
 * @route   GET /api/members
 * @desc    List all members (newest first), with optional search
 * @access  Admin
 */
const getAllMembers = asyncHandler(async (req, res) => {
  const { search, status, plan } = req.query;

  // Build a Mongo filter object from query params.
  const filter = {};
  if (search) {
    filter.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }
  if (plan && plan !== 'all') filter.membershipPlan = plan;

  let members = await Member.find(filter).sort({ createdAt: -1 });

  // `status` is a virtual (computed), so we filter it in JS after the query.
  if (status && status !== 'all') {
    members = members.filter(m => m.status === status);
  }

  res.json({ count: members.length, members });
});

/**
 * @route   GET /api/members/me
 * @desc    Get the logged-in member's own profile + payments
 * @access  Member
 */
const getMyProfile = asyncHandler(async (req, res) => {
  // Find the member record linked to this user account.
  const member = await Member.findOne({ user: req.user._id });
  if (!member) {
    res.status(404);
    throw new Error('Membership record not found');
  }

  const payments = await Payment.find({ member: member._id }).sort({ date: -1 });

  res.json({ member: { ...member.toJSON(), payments } });
});

/**
 * @route   GET /api/members/:id
 * @desc    Get a single member by id
 * @access  Admin
 */
const getMember = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (!member) {
    res.status(404);
    throw new Error('Member not found');
  }
  res.json({ member });
});

/**
 * @route   POST /api/members
 * @desc    Create a member (and a linked login account)
 * @access  Admin
 */
const addMember = asyncHandler(async (req, res) => {
  const {
    name, email, phone,
    membershipPlan = 'Basic',
    joiningDate,
    durationMonths = 1,
    expiryDate,
    paymentStatus = 'Pending'
  } = req.body;

  // Prevent duplicate member by email.
  const existingMember = await Member.findOne({ email });
  if (existingMember) {
    res.status(400);
    throw new Error('A member with this email already exists');
  }

  // 1) Create (or reuse) a User login account for this member.
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name,
      email,
      // Default password = phone number. Member should change it later.
      password: phone || 'changeme123',
      phone,
      role: 'member'
    });
  }

  // 2) Work out the expiry date.
  const join = joiningDate ? new Date(joiningDate) : new Date();
  const expiry = expiryDate ? new Date(expiryDate) : addMonths(join, durationMonths);

  // 3) Create the member record.
  const member = await Member.create({
    user: user._id,
    name, email, phone,
    membershipPlan,
    joiningDate: join,
    expiryDate: expiry,
    paymentStatus
  });

  res.status(201).json({ member });
});

/**
 * @route   PUT /api/members/:id
 * @desc    Update a member (plan, expiry, contact, payment status…)
 * @access  Admin
 */
const updateMember = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (!member) {
    res.status(404);
    throw new Error('Member not found');
  }

  const fields = ['name', 'email', 'phone', 'membershipPlan', 'joiningDate', 'expiryDate', 'paymentStatus'];
  fields.forEach(f => {
    if (req.body[f] !== undefined) member[f] = req.body[f];
  });

  // If the expiry was pushed into the future, treat it as a renewal:
  // clear the reminder history so future reminders fire again.
  if (req.body.expiryDate && member.daysRemaining > 7) {
    member.remindersSent = [];
  }

  const updated = await member.save();
  res.json({ member: updated });
});

/**
 * @route   DELETE /api/members/:id
 * @desc    Delete a member (and their payments + login account)
 * @access  Admin
 */
const deleteMember = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (!member) {
    res.status(404);
    throw new Error('Member not found');
  }

  // Clean up related data so nothing is orphaned.
  await Payment.deleteMany({ member: member._id });
  await User.findByIdAndDelete(member.user);
  await member.deleteOne();

  res.json({ message: 'Member deleted successfully' });
});

module.exports = {
  getAllMembers,
  getMyProfile,
  getMember,
  addMember,
  updateMember,
  deleteMember
};
