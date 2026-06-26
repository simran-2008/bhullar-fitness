/**
 * controllers/notificationController.js
 * ----------------------------------------------------------------
 * Lets an admin manually trigger expiry-reminder emails (the same
 * logic the cron job runs automatically each day).
 *
 * The shared `runReminderSweep` function is exported so the cron
 * job can reuse it — one source of truth for reminder logic.
 * ----------------------------------------------------------------
 */

const Member = require('../models/Member');
const { asyncHandler } = require('../utils/helpers');
const {
  reminder2Day,
  reminder1Day,
  reminderSameDay
} = require('../services/emailService');

/**
 * runReminderSweep
 * Iterates members and sends the appropriate reminder based on how
 * many days remain. Uses member.remindersSent to avoid sending the
 * same stage twice. Returns a small summary.
 */
const runReminderSweep = async () => {
  const members = await Member.find();
  let sent = 0;

  for (const member of members) {
    const days = member.daysRemaining;
    let stage = null;

    if (days === 2)      stage = '2-day';
    else if (days === 1) stage = '1-day';
    else if (days === 0) stage = 'same-day';

    // Skip if not at a reminder point, or already sent this stage.
    if (!stage || member.remindersSent.includes(stage)) continue;

    try {
      if (stage === '2-day')        await reminder2Day(member);
      else if (stage === '1-day')   await reminder1Day(member);
      else if (stage === 'same-day') await reminderSameDay(member);

      // Record that we sent this stage so we don't repeat it.
      member.remindersSent.push(stage);
      await member.save();
      sent++;
    } catch (err) {
      console.error(`Failed to email ${member.email}:`, err.message);
    }
  }

  return { sent, checked: members.length };
};

/**
 * @route   POST /api/notifications/send-reminders
 * @desc    Manually run the reminder sweep now
 * @access  Admin
 */
const sendReminders = asyncHandler(async (req, res) => {
  const result = await runReminderSweep();
  res.json({
    message: `Reminder sweep complete. ${result.sent} email(s) sent.`,
    ...result
  });
});

module.exports = { sendReminders, runReminderSweep };
