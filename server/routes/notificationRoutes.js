/**
 * routes/notificationRoutes.js
 * ----------------------------------------------------------------
 * Reminder endpoints. Mounted in server.js at: /api/notifications
 * ----------------------------------------------------------------
 */

const express = require('express');
const router  = express.Router();

const { sendReminders } = require('../controllers/notificationController');
const { protect, adminOnly } = require('../middleware/auth');

// Manually trigger the expiry-reminder email sweep
router.post('/send-reminders', protect, adminOnly, sendReminders);

module.exports = router;
