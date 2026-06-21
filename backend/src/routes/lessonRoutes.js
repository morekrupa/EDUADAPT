const express = require('express');
const router = express.Router({ mergeParams: true });
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const lessonController = require('../controllers/lessonController');

// Any authenticated user in the school can view lessons
router.get('/', verifyToken, lessonController.listLessons);

// Only the owning TEACHER or an ADMIN can add/edit lessons
router.post('/', verifyToken, checkRole('TEACHER', 'ADMIN'), lessonController.addLesson);
router.put('/:lessonId', verifyToken, checkRole('TEACHER', 'ADMIN'), lessonController.updateLessonHandler);

module.exports = router;
