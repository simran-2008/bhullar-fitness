/**
 * routes/authRoutes.js
 * ----------------------------------------------------------------
 * Maps auth-related URLs to controller functions.
 * Mounted in server.js at: /api/auth
 * ----------------------------------------------------------------
 */

const express = require('express');
const router  = express.Router();

const { register, login, getMe, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { registerRules, loginRules } = require('../middleware/validate');

// Public
router.post('/register', registerRules, register);
router.post('/login', loginRules, login);

// Private (must be logged in)
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
