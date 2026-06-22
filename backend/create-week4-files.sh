#!/bin/bash
# Run this from inside your backend/ folder:
#   bash create-week4-files.sh
# NOTE: overwrites existing route files to add validation

set -e

mkdir -p src/services src/controllers src/middleware src/routes

# ---------- src/services/reportService.js ----------
cat > src/services/reportService.js << 'EOF'
const prisma = require('../prismaClient');

const getCourseReport = async (courseId) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      lessons: { orderBy: { orderIndex: 'asc' } },
      enrollments: {
        include: { student: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  if (!course) return null;

  const lessonIds = course.lessons.map((l) => l.id);
  const studentIds = course.enrollments.map((e) => e.studentId);

  if (lessonIds.length === 0 || studentIds.length === 0) {
    return {
      course: { id: course.id, title: course.title },
      students: course.enrollments.map((e) => ({ student: e.student, lessons: [] })),
    };
  }

  // Aggregation: average accuracy + session count per student per lesson, in one query
  const sessionStats = await prisma.gameSession.groupBy({
    by: ['studentId', 'lessonId'],
    where: { lessonId: { in: lessonIds }, studentId: { in: studentIds } },
    _avg: { accuracy: true },
    _count: { id: true },
  });

  const progressRows = await prisma.studentProgress.findMany({
    where: { lessonId: { in: lessonIds }, studentId: { in: studentIds } },
  });

  const sessionMap = new Map();
  sessionStats.forEach((s) => {
    sessionMap.set(`${s.studentId}|${s.lessonId}`, {
      avgAccuracy: s._avg.accuracy,
      sessionCount: s._count.id,
    });
  });

  const progressMap = new Map();
  progressRows.forEach((p) => {
    progressMap.set(`${p.studentId}|${p.lessonId}`, {
      masteryScore: p.masteryScore,
      attempts: p.attempts,
    });
  });

  const students = course.enrollments.map((enrollment) => {
    const lessons = course.lessons.map((lesson) => {
      const key = `${enrollment.studentId}|${lesson.id}`;
      const sessionInfo = sessionMap.get(key) || { avgAccuracy: null, sessionCount: 0 };
      const progressInfo = progressMap.get(key) || { masteryScore: 0, attempts: 0 };

      return {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        sessionCount: sessionInfo.sessionCount,
        avgAccuracy: sessionInfo.avgAccuracy,
        masteryScore: progressInfo.masteryScore,
        attempts: progressInfo.attempts,
      };
    });

    return { student: enrollment.student, lessons };
  });

  return { course: { id: course.id, title: course.title }, students };
};

module.exports = { getCourseReport };
EOF

# ---------- src/services/analyticsService.js ----------
cat > src/services/analyticsService.js << 'EOF'
const prisma = require('../prismaClient');

const DROPOUT_THRESHOLD_DAYS = 14;
const ACTIVE_WINDOW_DAYS = 7;

const getSchoolAnalytics = async (schoolId) => {
  const now = new Date();
  const activeSince = new Date(now.getTime() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const dropoutCutoff = new Date(now.getTime() - DROPOUT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

  const usersByRole = await prisma.user.groupBy({
    by: ['role'],
    where: { schoolId },
    _count: { id: true },
  });
  const totalUsers = usersByRole.reduce((sum, r) => sum + r._count.id, 0);

  const recentSessions = await prisma.gameSession.findMany({
    where: { playedAt: { gte: activeSince }, student: { schoolId } },
    select: { studentId: true },
  });
  const activeStudentIds = new Set(recentSessions.map((s) => s.studentId));

  // NOTE: only populated where logging calls exist — currently just game session completions
  const engagementByAction = await prisma.engagementLog.groupBy({
    by: ['action'],
    where: { user: { schoolId } },
    _count: { id: true },
  });

  // PLACEHOLDER HEURISTIC: students with zero sessions in the last 14 days.
  // Replace with real model output once the AI Bridge is feeding DROPOUT_RISK
  // recommendations from Member 4's ML pipeline.
  const allStudents = await prisma.user.findMany({
    where: { schoolId, role: 'STUDENT' },
    select: { id: true, name: true, email: true },
  });

  const recentlyActive = await prisma.gameSession.findMany({
    where: { playedAt: { gte: dropoutCutoff }, student: { schoolId } },
    select: { studentId: true },
    distinct: ['studentId'],
  });
  const recentlyActiveIds = new Set(recentlyActive.map((s) => s.studentId));

  const dropoutRiskStudents = allStudents.filter((s) => !recentlyActiveIds.has(s.id));

  return {
    totalUsers,
    usersByRole: usersByRole.map((r) => ({ role: r.role, count: r._count.id })),
    activeSessions: {
      windowDays: ACTIVE_WINDOW_DAYS,
      count: recentSessions.length,
      uniqueActiveStudents: activeStudentIds.size,
    },
    engagementLogs: engagementByAction.map((e) => ({ action: e.action, count: e._count.id })),
    dropoutRisk: {
      thresholdDays: DROPOUT_THRESHOLD_DAYS,
      isPlaceholderHeuristic: true,
      flaggedCount: dropoutRiskStudents.length,
      students: dropoutRiskStudents,
    },
  };
};

module.exports = { getSchoolAnalytics };
EOF

# ---------- src/services/engagementLogService.js ----------
cat > src/services/engagementLogService.js << 'EOF'
const prisma = require('../prismaClient');

const logEvent = async ({ userId, action, metadata }) => {
  return prisma.engagementLog.create({
    data: {
      userId,
      action,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
};

module.exports = { logEvent };
EOF

# ---------- src/services/recommendationService.js ----------
cat > src/services/recommendationService.js << 'EOF'
const prisma = require('../prismaClient');

const createRecommendation = async ({ studentId, type, payload }) => {
  return prisma.recommendation.create({
    data: { studentId, type, payload },
  });
};

const getActiveRecommendationsForStudent = async (studentId) => {
  return prisma.recommendation.findMany({
    where: { studentId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
};

module.exports = { createRecommendation, getActiveRecommendationsForStudent };
EOF

# ---------- src/controllers/teacherController.js ----------
cat > src/controllers/teacherController.js << 'EOF'
const courseService = require('../services/courseService');
const reportService = require('../services/reportService');

const getCourseReportHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await courseService.findCourseById(id);
    if (!course || course.schoolId !== req.user.schoolId) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    if (req.user.role === 'TEACHER' && course.teacherId !== req.user.userId) {
      return res.status(403).json({ error: 'You can only view reports for your own courses.' });
    }

    const report = await reportService.getCourseReport(id);
    return res.status(200).json(report);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to generate report.' });
  }
};

module.exports = { getCourseReportHandler };
EOF

# ---------- src/controllers/analyticsController.js ----------
cat > src/controllers/analyticsController.js << 'EOF'
const analyticsService = require('../services/analyticsService');

const getAnalytics = async (req, res) => {
  try {
    const analytics = await analyticsService.getSchoolAnalytics(req.user.schoolId);
    return res.status(200).json(analytics);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch analytics.' });
  }
};

module.exports = { getAnalytics };
EOF

# ---------- src/controllers/aiController.js ----------
cat > src/controllers/aiController.js << 'EOF'
const recommendationService = require('../services/recommendationService');

const receiveRecommendation = async (req, res) => {
  try {
    const { studentId, type, payload } = req.body;

    const recommendation = await recommendationService.createRecommendation({
      studentId,
      type,
      payload,
    });

    return res.status(201).json({ message: 'Recommendation stored.', recommendation });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to store recommendation.' });
  }
};

const getMyRecommendations = async (req, res) => {
  try {
    const recommendations = await recommendationService.getActiveRecommendationsForStudent(
      req.user.userId
    );
    return res.status(200).json({ recommendations });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch recommendations.' });
  }
};

module.exports = { receiveRecommendation, getMyRecommendations };
EOF

# ---------- src/middleware/validators.js ----------
cat > src/middleware/validators.js << 'EOF'
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
EOF

# ---------- src/middleware/handleValidationErrors.js ----------
cat > src/middleware/handleValidationErrors.js << 'EOF'
const { validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed.',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

module.exports = { handleValidationErrors };
EOF

# ---------- src/middleware/errorHandler.js ----------
cat > src/middleware/errorHandler.js << 'EOF'
// Mount this LAST in server.js, after all app.use() route registrations:
//   app.use(errorHandler);

const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Prisma known request errors
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with this value already exists.' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found.' });
  }
  if (err.code === 'P2003') {
    return res.status(409).json({ error: 'Cannot complete — related records exist.' });
  }

  const status = err.statusCode || 500;
  const message = err.message || 'Internal server error.';
  return res.status(status).json({ error: message });
};

module.exports = { errorHandler };
EOF

# ---------- src/routes/schoolRoutes.js ----------
cat > src/routes/schoolRoutes.js << 'EOF'
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
EOF

# ---------- src/routes/userRoutes.js ----------
cat > src/routes/userRoutes.js << 'EOF'
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
EOF

# ---------- src/routes/courseRoutes.js ----------
cat > src/routes/courseRoutes.js << 'EOF'
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
EOF

# ---------- src/routes/lessonRoutes.js ----------
cat > src/routes/lessonRoutes.js << 'EOF'
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
EOF

# ---------- src/routes/gameRoutes.js ----------
cat > src/routes/gameRoutes.js << 'EOF'
const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/handleValidationErrors');
const { validateGameSession } = require('../middleware/validators');
const gameSessionController = require('../controllers/gameSessionController');

router.post('/session', verifyToken, checkRole('STUDENT'), validateGameSession, handleValidationErrors, gameSessionController.saveSession);

module.exports = router;
EOF

# ---------- src/routes/teacherRoutes.js ----------
cat > src/routes/teacherRoutes.js << 'EOF'
const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const teacherController = require('../controllers/teacherController');

router.get('/courses/:id/report', verifyToken, checkRole('TEACHER', 'ADMIN'), teacherController.getCourseReportHandler);

module.exports = router;
EOF

# ---------- src/routes/adminRoutes.js ----------
cat > src/routes/adminRoutes.js << 'EOF'
const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const analyticsController = require('../controllers/analyticsController');

router.get('/analytics', verifyToken, checkRole('ADMIN'), analyticsController.getAnalytics);

module.exports = router;
EOF

# ---------- src/routes/aiRoutes.js ----------
cat > src/routes/aiRoutes.js << 'EOF'
const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/handleValidationErrors');
const { validateRecommendation } = require('../middleware/validators');
const aiController = require('../controllers/aiController');

// Member 4's ML service POSTs here using an admin token
router.post('/recommendations', verifyToken, checkRole('ADMIN'), validateRecommendation, handleValidationErrors, aiController.receiveRecommendation);

// Member 1's student panel GETs from here
router.get('/recommendations/me', verifyToken, checkRole('STUDENT'), aiController.getMyRecommendations);

module.exports = router;
EOF

echo ""
echo "Done. Files created/updated:"
echo "  Services: reportService, analyticsService, engagementLogService, recommendationService"
echo "  Controllers: teacherController, analyticsController, aiController"
echo "  Middleware: validators, handleValidationErrors, errorHandler"
echo "  Routes: school, user, course, lesson, game (updated with validation)"
echo "  Routes: teacher, admin, ai (new)"
echo ""
echo "NEXT STEPS:"
echo "  1. Add Recommendation model to prisma/schema.prisma (see instructions)"
echo "  2. Run: npx prisma db push"
echo "  3. Run: npm install express-validator"
echo "  4. Update server.js (see instructions)"
echo "  5. Restart server"
