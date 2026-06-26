/**
 * config/db.js
 * ----------------------------------------------------------------
 * Connects the application to MongoDB using Mongoose.
 *
 * Mongoose is an ODM (Object Data Modeling) library: it lets us
 * define schemas and work with MongoDB documents as JS objects.
 *
 * We read the connection string from process.env.MONGO_URI so the
 * same code works locally and in production (just change the .env).
 * ----------------------------------------------------------------
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // mongoose.connect returns a promise; we await it on startup.
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    // If the DB can't connect, the app is useless — exit the process
    // so the hosting platform (or you) notices immediately.
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
