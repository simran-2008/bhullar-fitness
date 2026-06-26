/**
 * cron/reminderCron.js
 * ----------------------------------------------------------------
 * Schedules an automatic daily job that emails members whose
 * membership is about to expire (2 days, 1 day, and same day).
 *
 * It reuses `runReminderSweep` from the notification controller, so
 * the manual "Send reminders" button and this automatic job share
 * the exact same logic.
 *
 * node-cron syntax:  ┌ minute  ┌ hour  ┌ day-of-month  ┌ month  ┌ day-of-week
 *                    '0        9        *              *        *'   = 09:00 daily
 * ----------------------------------------------------------------
 */

const cron = require('node-cron');
const { runReminderSweep } = require('../controllers/notificationController');

const startReminderCron = () => {
  // Run every day at 09:00 server time.
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Running daily membership reminder sweep...');
    try {
      const result = await runReminderSweep();
      console.log(`   → checked ${result.checked} members, sent ${result.sent} email(s).`);
    } catch (err) {
      console.error('   ✗ Reminder cron failed:', err.message);
    }
  });

  console.log('🗓️  Reminder cron scheduled for 09:00 daily.');
};

module.exports = startReminderCron;
