/**
 * models/User.js
 * ----------------------------------------------------------------
 * The User model represents anyone who can log in: members and admins.
 * The "role" field distinguishes them.
 *
 * Security: passwords are NEVER stored in plain text. A pre-save hook
 * hashes the password with bcrypt before it touches the database.
 * ----------------------------------------------------------------
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,              // no two users can share an email
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please use a valid email']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false              // never returned in queries by default
    },
    role: {
      type: String,
      enum: ['member', 'admin'], // only these two values allowed
      default: 'member'
    },
    phone: {
      type: String,
      trim: true
    }
  },
  {
    // Adds createdAt and updatedAt automatically
    timestamps: true
  }
);

/**
 * PRE-SAVE HOOK
 * Runs automatically before a user document is saved.
 * We hash the password ONLY if it was changed (so editing a name
 * doesn't re-hash an already-hashed password).
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);          // cost factor 10
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/**
 * INSTANCE METHOD
 * Compares a plain-text password (from login) with the stored hash.
 * Returns true/false. Used in the auth controller.
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
