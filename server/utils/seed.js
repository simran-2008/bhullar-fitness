/**
 * utils/seed.js
 * ----------------------------------------------------------------
 * Populates the database with an admin account and sample members
 * so you can log in and see real data immediately.
 *
 * Run with:  npm run seed
 *
 * WARNING: this clears existing Users / Members / Payments first.
 * ----------------------------------------------------------------
 */

require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const User      = require('../models/User');
const Member    = require('../models/Member');
const Payment   = require('../models/Payment');
const { addMonths } = require('./helpers');

// Helper: a date N days from today.
const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

const sampleMembers = [
  { name: 'Rahul Kumar',  email: 'rahul@email.com',  phone: '9876543210', membershipPlan: 'Pro',   joiningDate: daysFromNow(-320), expiryDate: daysFromNow(8),   paymentStatus: 'Paid' },
  { name: 'Sneha Gupta',  email: 'sneha@email.com',  phone: '9988776655', membershipPlan: 'Elite', joiningDate: daysFromNow(-200), expiryDate: daysFromNow(25),  paymentStatus: 'Paid' },
  { name: 'Vikram Mehta', email: 'vikram@email.com', phone: '9812345678', membershipPlan: 'Basic', joiningDate: daysFromNow(-150), expiryDate: daysFromNow(1),   paymentStatus: 'Pending' },
  { name: 'Priya Sharma', email: 'priya@email.com',  phone: '9777788888', membershipPlan: 'Pro',   joiningDate: daysFromNow(-400), expiryDate: daysFromNow(-5),  paymentStatus: 'Pending' },
  { name: 'Amit Patel',   email: 'amit@email.com',   phone: '9666655555', membershipPlan: 'Elite', joiningDate: daysFromNow(-90),  expiryDate: daysFromNow(45),  paymentStatus: 'Paid' },
  { name: 'Kavya Reddy',  email: 'kavya@email.com',  phone: '9444433333', membershipPlan: 'Basic', joiningDate: daysFromNow(-60),  expiryDate: daysFromNow(-12), paymentStatus: 'Pending' }
];

const planPrice = { Basic: 999, Pro: 1999, Elite: 3499 };

const seed = async () => {
  try {
    await connectDB();

    // Clear existing data.
    await Promise.all([
      User.deleteMany({}),
      Member.deleteMany({}),
      Payment.deleteMany({})
    ]);
    console.log('🧹 Cleared old data.');

    // 1) Admin account.
    await User.create({
      name: 'Gym Admin',
      email: 'admin@bhullar.in',
      password: 'admin123',          // hashed automatically by the model
      role: 'admin',
      phone: '9000000000'
    });
    console.log('👤 Admin created: admin@bhullar.in / admin123');

    // 2) Demo member login (matches the frontend demo hint).
    const demoUser = await User.create({
      name: 'Rahul Kumar',
      email: 'member@bhullar.in',
      password: 'member123',
      role: 'member',
      phone: '9876543210'
    });

    // 3) Sample members + their login accounts + a payment each.
    for (const data of sampleMembers) {
      // Reuse demoUser for the first member so member@bhullar.in has data.
      let user;
      if (data.email === 'rahul@email.com') {
        user = demoUser;
      } else {
        user = await User.create({
          name: data.name,
          email: data.email,
          password: data.phone,       // default password = phone
          role: 'member',
          phone: data.phone
        });
      }

      const member = await Member.create({ ...data, user: user._id });

      // Add one payment for members marked Paid.
      if (data.paymentStatus === 'Paid') {
        await Payment.create({
          member: member._id,
          amount: planPrice[data.membershipPlan],
          method: 'UPI',
          status: 'Paid',
          date: daysFromNow(-15)
        });
      }
    }

    console.log(`🏋️  Seeded ${sampleMembers.length} members.`);
    console.log('✅ Seed complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
};

seed();
