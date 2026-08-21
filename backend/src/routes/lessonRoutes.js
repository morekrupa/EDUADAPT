const express = require('express');
const router = express.Router({ mergeParams: true });
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/handleValidationErrors');
const { validateCreateLesson, validateUpdateLesson } = require('../middleware/validators');
const lessonController = require('../controllers/lessonController');

router.get('/', verifyToken, lessonController.listLessons);
router.post('/', verifyToken, checkRole('TEACHER', 'ADMIN'), validateCreateLesson, handleValidationErrors, lessonController.addLesson);
router.put('/:lessonId', verifyToken, checkRole('TEACHER', 'ADMIN'), validateUpdateLesson, handleValidationErrors, lessonController.updateLessonHandler);

module.exports = router;
