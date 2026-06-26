/**
 * server.js
 * ----------------------------------------------------------------
 * Application entry point. Responsibilities:
 *   1. Load environment variables
 *   2. Connect to MongoDB
 *   3. Configure Express (CORS, JSON body parsing)
 *   4. Mount all API routes under /api/*
 *   5. Attach 404 + error handlers
 *   6. Start the reminder cron job
 *   7. Listen on the configured port
 * ----------------------------------------------------------------
 */

// 1) Load .env FIRST so every module can read process.env.
require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const connectDB           = require('./config/db');
const startReminderCron   = require('./cron/reminderCron');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Route modules
const authRoutes         = require('./routes/authRoutes');
const memberRoutes       = require('./routes/memberRoutes');
const paymentRoutes      = require('./routes/paymentRoutes');
const dashboardRoutes    = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// 2) Connect to the database.
connectDB();

const app = express();

// 3) Middleware --------------------------------------------------

// CORS: allow only the front-end origins listed in .env (comma-separated).
const allowedOrigins = (process.env.CLIENT_URL || '').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow tools like curl/Postman (no origin) and any allowed origin.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Parse incoming JSON bodies into req.body.
app.use(express.json());

// Simple request logger (helpful in development).
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// 4) Routes ------------------------------------------------------

// Health check — handy to confirm the server is up.
app.get('/', (req, res) => res.json({ status: 'ok', service: 'Bhullar Fitness API' }));

app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

// 5) Error handling (must come AFTER routes) ---------------------
app.use(notFound);
app.use(errorHandler);

// 6) Start the daily reminder cron job.
startReminderCron();

// 7) Start the server.
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
