const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const controller = require('../controllers/curriculumController');

router.use(verifyToken, checkRole('STUDENT'));
router.get('/courses', controller.getCourses);
router.get('/courses/:courseId', controller.getCourseCurriculum);
router.get('/subjects/:subjectId', controller.getSubject);
router.get('/topics/:topicId', controller.getTopic);

module.exports = router;