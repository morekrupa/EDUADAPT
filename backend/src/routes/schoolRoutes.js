const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const schoolController = require('../controllers/schoolController');

// Public — no school exists yet for the first admin to authenticate against
router.post('/register', schoolController.registerSchool);

// Admin-only — scoped to the admin's own school via req.user.schoolId
router.post('/teachers', verifyToken, checkRole('ADMIN'), schoolController.addTeacher);
router.post('/students', verifyToken, checkRole('ADMIN'), schoolController.addStudent);
router.post('/announcements', verifyToken, checkRole('ADMIN'), schoolController.sendAnnouncement);

module.exports = router;
