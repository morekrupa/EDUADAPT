const { body, param } = require('express-validator');

const validateRegister = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('email').isEmail().withMessage('a valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('password must be at least 6 characters'),
  body('role').isIn(['STUDENT', 'TEACHER', 'ADMIN']).withMessage('role must be STUDENT, TEACHER, or ADMIN'),
  body('schoolId').notEmpty().withMessage('schoolId is required'),
];

const validateLogin = [
  body('email').isEmail().withMessage('a valid email is required'),
  body('password').notEmpty().withMessage('password is required'),
];

const validateSchoolRegister = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('code').trim().notEmpty().withMessage('code is required'),
];

const validateAddSchoolUser = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('email').isEmail().withMessage('a valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('password must be at least 6 characters'),
];

const validateAnnouncement = [
  body('message').trim().notEmpty().withMessage('message is required'),
  body('targetRole')
    .optional()
    .isIn(['STUDENT', 'TEACHER', 'ADMIN'])
    .withMessage('targetRole must be STUDENT, TEACHER, or ADMIN'),
];

const validateUpdateProfile = [
  body('name').optional().trim().notEmpty().withMessage('name cannot be empty'),
  body('email').optional().isEmail().withMessage('a valid email is required'),
];

const validateCreateCourse = [
  body('title').trim().notEmpty().withMessage('title is required'),
  body('teacherId').optional().notEmpty().withMessage('teacherId cannot be empty'),
];

const validateUpdateCourse = [
  param('id').notEmpty().withMessage('course id is required'),
  body('title').optional().trim().notEmpty().withMessage('title cannot be empty'),
];

const validateCreateLesson = [
  param('courseId').notEmpty().withMessage('courseId is required'),
  body('title').trim().notEmpty().withMessage('title is required'),
  body('content').trim().notEmpty().withMessage('content is required'),
  body('orderIndex').optional().isInt({ min: 0 }).withMessage('orderIndex must be a non-negative integer'),
];

const validateUpdateLesson = [
  param('lessonId').notEmpty().withMessage('lessonId is required'),
  body('title').optional().trim().notEmpty().withMessage('title cannot be empty'),
  body('content').optional().trim().notEmpty().withMessage('content cannot be empty'),
  body('orderIndex').optional().isInt({ min: 0 }).withMessage('orderIndex must be a non-negative integer'),
];

const validateGameSession = [
  body('lessonId').notEmpty().withMessage('lessonId is required'),
  body('score').isInt({ min: 0 }).withMessage('score must be a non-negative integer'),
  body('accuracy').isFloat({ min: 0, max: 100 }).withMessage('accuracy must be between 0 and 100'),
  body('timeSpentSec').isInt({ min: 0 }).withMessage('timeSpentSec must be a non-negative integer'),
  body('difficultyLevel').isInt({ min: 1 }).withMessage('difficultyLevel must be a positive integer'),
];

const validateRecommendation = [
  body('studentId').notEmpty().withMessage('studentId is required'),
  body('type')
    .isIn(['NEXT_LESSON', 'DIFFICULTY_ADJUSTMENT', 'DROPOUT_RISK', 'CONTENT_SUGGESTION'])
    .withMessage('invalid recommendation type'),
  body('payload').notEmpty().withMessage('payload is required'),
];

module.exports = {
  validateRegister,
  validateLogin,
  validateSchoolRegister,
  validateAddSchoolUser,
  validateAnnouncement,
  validateUpdateProfile,
  validateCreateCourse,
  validateUpdateCourse,
  validateCreateLesson,
  validateUpdateLesson,
  validateGameSession,
  validateRecommendation,
};
