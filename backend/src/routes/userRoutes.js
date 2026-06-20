const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

// Any logged-in user
router.get('/me', verifyToken, userController.getMe);
router.put('/me', verifyToken, userController.updateMe);

// Admin only — scoped to their own school via req.user.schoolId
router.get('/', verifyToken, checkRole('ADMIN'), userController.listUsers);
router.delete('/:id', verifyToken, checkRole('ADMIN'), userController.deleteUser);

// Existing test/demo routes — unchanged
router.get('/teacher-only', verifyToken, checkRole('TEACHER'), (req, res) => {
  res.json({ message: 'Teacher route accessed' });
});

router.get('/admin-only', verifyToken, checkRole('ADMIN'), (req, res) => {
  res.json({ message: 'Admin route accessed' });
});

module.exports = router;
