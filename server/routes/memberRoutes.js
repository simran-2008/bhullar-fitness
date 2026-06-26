/**
 * routes/memberRoutes.js
 * ----------------------------------------------------------------
 * Member endpoints. Mounted in server.js at: /api/members
 *
 * Order matters: the specific '/me' route is declared BEFORE the
 * dynamic '/:id' route, otherwise Express would treat "me" as an id.
 * ----------------------------------------------------------------
 */

const express = require('express');
const router  = express.Router();

const {
  getAllMembers,
  getMyProfile,
  getMember,
  addMember,
  updateMember,
  deleteMember
} = require('../controllers/memberController');

const { protect, adminOnly } = require('../middleware/auth');
const { memberRules } = require('../middleware/validate');

// Member's own profile (any logged-in member)
router.get('/me', protect, getMyProfile);

// Everything below is admin-only
router.get('/', protect, adminOnly, getAllMembers);
router.post('/', protect, adminOnly, memberRules, addMember);
router.get('/:id', protect, adminOnly, getMember);
router.put('/:id', protect, adminOnly, updateMember);
router.delete('/:id', protect, adminOnly, deleteMember);

module.exports = router;
