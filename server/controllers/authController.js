/**
 * controllers/authController.js
 * ----------------------------------------------------------------
 * Handles registration, login, and "who am I" (getMe).
 *
 * Flow:
 *   register → create User → return JWT
 *   login    → find User by email → check password → return JWT
 *   getMe    → return the currently logged-in user (from req.user)
 *
 * The JWT is what the frontend stores and sends on every request.
 * ----------------------------------------------------------------
 */

const User = require('../models/User');
const { asyncHandler, generateToken } = require('../utils/helpers');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (member or admin)
 * @access  Public (in production you'd usually restrict admin creation)
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  // Does a user with this email already exist?
  const exists = await User.findOne({ email });
  if (exists) {
    res.status(400);
    throw new Error('A user with this email already exists');
  }

  // Create the user. The pre-save hook in the model hashes the password.
  const user = await User.create({ name, email, password, phone, role });

  // Respond with basic info + a fresh token.
  res.status(201).json({
    token: generateToken(user._id),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate a user and return a token
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  // We must explicitly select the password because the schema hides it.
  const user = await User.findOne({ email }).select('+password');

  // Use the same generic message whether email or password is wrong,
  // so attackers can't tell which emails are registered.
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Optional: enforce that the chosen tab (role) matches the account.
  if (role && user.role !== role) {
    res.status(403);
    throw new Error(`This account is not a ${role} account`);
  }

  res.json({
    token: generateToken(user._id),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

/**
 * @route   GET /api/auth/me
 * @desc    Get the currently logged-in user
 * @access  Private (requires `protect` middleware)
 */
const getMe = asyncHandler(async (req, res) => {
  // `protect` already attached the user to req.user.
  res.json({ user: req.user });
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout (stateless JWT — handled client-side by deleting token)
 * @access  Private
 *
 * With JWTs there's nothing to invalidate server-side unless you keep
 * a blacklist. We simply acknowledge; the frontend clears the token.
 */
const logout = asyncHandler(async (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = { register, login, getMe, logout };
