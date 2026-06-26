/**
 * routes/dashboardRoutes.js
 * ----------------------------------------------------------------
 * Admin statistics. Mounted in server.js at: /api/dashboard
 * ----------------------------------------------------------------
 */

const express = require('express');
const router  = express.Router();

const { getStats } = require('../controllers/dashboardController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/stats', protect, adminOnly, getStats);

module.exports = router;
