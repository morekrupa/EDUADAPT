const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/handleValidationErrors');
const { validateUpdateProfile } = require('../middleware/validators');
const userController = require('../controllers/userController');

router.get('/me', verifyToken, userController.getMe);
router.put('/me', verifyToken, validateUpdateProfile, handleValidationErrors, userController.updateMe);
router.get('/', verifyToken, checkRole('ADMIN'), userController.listUsers);
router.delete('/:id', verifyToken, checkRole('ADMIN'), userController.deleteUser);

router.get('/teacher-only', verifyToken, checkRole('TEACHER'), (req, res) => {
  res.json({ message: 'Teacher route accessed' });
});
router.get('/admin-only', verifyToken, checkRole('ADMIN'), (req, res) => {
  res.json({ message: 'Admin route accessed' });
});

module.exports = router;
