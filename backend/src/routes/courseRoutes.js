const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const courseController = require('../controllers/courseController');
const lessonRoutes = require('./lessonRoutes');

// Any authenticated user can list courses (always scoped to their own school)
router.get('/', verifyToken, courseController.listCourses);

// Only TEACHER or ADMIN can create/edit courses
router.post('/', verifyToken, checkRole('TEACHER', 'ADMIN'), courseController.createCourse);
router.put('/:id', verifyToken, checkRole('TEACHER', 'ADMIN'), courseController.updateCourse);

// Students enroll themselves in a course
router.post('/:id/enroll', verifyToken, checkRole('STUDENT'), courseController.enrollInCourse);

// Nested lesson routes — /api/courses/:courseId/lessons
router.use('/:courseId/lessons', lessonRoutes);

module.exports = router;
