/**
 * middleware/auth.js
 * ----------------------------------------------------------------
 * Two middlewares that protect routes:
 *
 *   protect    → verifies the JWT and attaches the user to req.user.
 *                Any route after this requires a valid login.
 *
 *   adminOnly  → must run AFTER `protect`. Rejects the request unless
 *                the logged-in user has role 'admin'.
 *
 * The token is sent by the frontend in the header:
 *      Authorization: Bearer <token>
 * ----------------------------------------------------------------
 */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * protect — verify JWT and load the current user.
 */
const protect = async (req, res, next) => {
  let token;

  // Expect: "Authorization: Bearer eyJhbG..."
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized — no token provided' });
  }

  try {
    // Verify signature & expiry. Throws if invalid.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the user (without the password) to the request object
    // so downstream handlers know who is making the request.
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized — user no longer exists' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized — token invalid or expired' });
  }
};

/**
 * adminOnly — block non-admins. Use after `protect`.
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied — admin privileges required' });
};

module.exports = { protect, adminOnly };
