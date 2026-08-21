const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/handleValidationErrors');
const { validateCreateCourse, validateUpdateCourse } = require('../middleware/validators');
const courseController = require('../controllers/courseController');
const lessonRoutes = require('./lessonRoutes');

router.get('/', verifyToken, courseController.listCourses);
router.post('/', verifyToken, checkRole('TEACHER', 'ADMIN'), validateCreateCourse, handleValidationErrors, courseController.createCourse);
router.put('/:id', verifyToken, checkRole('TEACHER', 'ADMIN'), validateUpdateCourse, handleValidationErrors, courseController.updateCourse);
router.post('/:id/enroll', verifyToken, checkRole('STUDENT'), courseController.enrollInCourse);
router.use('/:courseId/lessons', lessonRoutes);

module.exports = router;
