const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const teacherController = require('../controllers/teacherController');

router.get('/courses/:id/report', verifyToken, checkRole('TEACHER', 'ADMIN'), teacherController.getCourseReportHandler);

module.exports = router;
