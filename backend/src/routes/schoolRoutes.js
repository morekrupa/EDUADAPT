const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/handleValidationErrors');
const {
  validateSchoolRegister,
  validateAddSchoolUser,
  validateAnnouncement,
} = require('../middleware/validators');
const schoolController = require('../controllers/schoolController');

router.post('/register', validateSchoolRegister, handleValidationErrors, schoolController.registerSchool);
router.post('/teachers', verifyToken, checkRole('ADMIN'), validateAddSchoolUser, handleValidationErrors, schoolController.addTeacher);
router.post('/students', verifyToken, checkRole('ADMIN'), validateAddSchoolUser, handleValidationErrors, schoolController.addStudent);
router.post('/announcements', verifyToken, checkRole('ADMIN'), validateAnnouncement, handleValidationErrors, schoolController.sendAnnouncement);

module.exports = router;
