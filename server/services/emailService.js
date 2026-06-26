/**
 * services/emailService.js
 * ----------------------------------------------------------------
 * Wraps Nodemailer so the rest of the app can just call
 * `sendEmail({ to, subject, html })` without worrying about SMTP
 * setup. Also contains ready-made HTML templates for the three
 * expiry-reminder stages.
 *
 * Configuration comes from environment variables (.env).
 * For Gmail you must use an "App Password", not your login password.
 * ----------------------------------------------------------------
 */

const nodemailer = require('nodemailer');

/**
 * Create a single reusable transporter. Reusing it (rather than
 * creating one per email) is more efficient.
 */
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,                       // true for port 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * sendEmail — low-level send. Returns the Nodemailer info object.
 */
const sendEmail = async ({ to, subject, html }) => {
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    html
  });
  console.log(`📧 Email sent to ${to}: ${info.messageId}`);
  return info;
};

/* ----------------------------------------------------------------
   EMAIL TEMPLATES
   A small helper builds a branded HTML wrapper; the three reminder
   functions fill in the stage-specific message.
---------------------------------------------------------------- */

const wrap = (heading, body, accent = '#c8ff00') => `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0a0b0d;color:#f4f5f7;border-radius:14px;overflow:hidden;border:1px solid #1a1e25">
    <div style="background:#101216;padding:24px 28px;border-bottom:1px solid #1a1e25">
      <span style="font-size:20px;font-weight:bold;letter-spacing:1px">⚡ BHULLAR <span style="color:${accent}">FITNESS</span></span>
    </div>
    <div style="padding:28px">
      <h2 style="margin:0 0 12px;color:${accent}">${heading}</h2>
      ${body}
      <a href="#" style="display:inline-block;margin-top:22px;background:${accent};color:#0a0b0d;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px">Renew Membership</a>
    </div>
    <div style="padding:18px 28px;border-top:1px solid #1a1e25;color:#6b7280;font-size:12px">
      Bhullar Fitness · 123 Fitness Street, Amritsar · +91 98765 43210
    </div>
  </div>`;

/** 2 days before expiry */
const reminder2Day = (member) => sendEmail({
  to: member.email,
  subject: '⏳ Your Bhullar Fitness membership expires in 2 days',
  html: wrap('Just a friendly heads-up!', `
    <p>Hi ${member.name},</p>
    <p>Your <strong>${member.membershipPlan}</strong> membership will expire in <strong>2 days</strong>
       on <strong>${new Date(member.expiryDate).toDateString()}</strong>.</p>
    <p>Renew now to keep your access uninterrupted and your streak alive. 💪</p>`)
});

/** 1 day before expiry */
const reminder1Day = (member) => sendEmail({
  to: member.email,
  subject: '⚠️ Your Bhullar Fitness membership expires tomorrow',
  html: wrap('Your membership expires tomorrow', `
    <p>Hi ${member.name},</p>
    <p>This is a reminder that your <strong>${member.membershipPlan}</strong> membership
       expires <strong>tomorrow</strong> (${new Date(member.expiryDate).toDateString()}).</p>
    <p>Don't lose momentum — renew today to keep training without a break.</p>`, '#ffb020')
});

/** Same-day / final reminder */
const reminderSameDay = (member) => sendEmail({
  to: member.email,
  subject: '🚨 Final reminder: Your Bhullar Fitness membership expires today',
  html: wrap('Final reminder — expires today', `
    <p>Hi ${member.name},</p>
    <p>Your <strong>${member.membershipPlan}</strong> membership expires <strong>today</strong>.</p>
    <p>Renew now to avoid losing access. We'd hate to see you go!</p>`, '#ff4d4d')
});

module.exports = {
  sendEmail,
  reminder2Day,
  reminder1Day,
  reminderSameDay
};
