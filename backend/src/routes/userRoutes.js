const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Any logged in user can access this
router.get('/me', verifyToken, (req, res) => {
  res.json({ message: 'Profile accessed', user: req.user });
});

// Only teachers can access this
router.get('/teacher-only', verifyToken, checkRole('TEACHER'), (req, res) => {
  res.json({ message: 'Teacher route accessed' });
});

// Only admins can access this
router.get('/admin-only', verifyToken, checkRole('ADMIN'), (req, res) => {
  res.json({ message: 'Admin route accessed' });
});

module.exports = router;