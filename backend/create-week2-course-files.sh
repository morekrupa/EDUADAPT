#!/bin/bash
# Run this from inside your backend/ folder:
#   bash create-week2-course-files.sh

set -e

mkdir -p src/services src/controllers src/routes

# ---------- src/services/courseService.js ----------
cat > src/services/courseService.js << 'EOF'
const prisma = require('../prismaClient');

const TEACHER_SUMMARY = { select: { id: true, name: true, email: true } };

const createCourse = async ({ title, teacherId, schoolId }) => {
  return prisma.course.create({
    data: { title, teacherId, schoolId },
    include: { teacher: TEACHER_SUMMARY },
  });
};

const findCourseById = async (courseId) => {
  return prisma.course.findUnique({
    where: { id: courseId },
    include: { teacher: TEACHER_SUMMARY },
  });
};

const listCoursesInSchool = async (schoolId, { teacherId, page = 1, limit = 20 }) => {
  const where = { schoolId };
  if (teacherId) where.teacherId = teacherId;

  const skip = (page - 1) * limit;

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      include: { teacher: TEACHER_SUMMARY },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.course.count({ where }),
  ]);

  return {
    courses,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

const updateCourse = async (courseId, updates) => {
  const data = {};
  if (updates.title !== undefined) data.title = updates.title;
  if (updates.teacherId !== undefined) data.teacherId = updates.teacherId;

  if (Object.keys(data).length === 0) {
    const err = new Error('No valid fields provided to update.');
    err.statusCode = 400;
    throw err;
  }

  return prisma.course.update({
    where: { id: courseId },
    data,
    include: { teacher: TEACHER_SUMMARY },
  });
};

// Used when an ADMIN assigns/reassigns a course to a teacher —
// makes sure that teacher is real, has the right role, and is in the same school
const isTeacherInSchool = async (teacherId, schoolId) => {
  const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
  return Boolean(teacher && teacher.role === 'TEACHER' && teacher.schoolId === schoolId);
};

module.exports = {
  createCourse,
  findCourseById,
  listCoursesInSchool,
  updateCourse,
  isTeacherInSchool,
};
EOF

# ---------- src/services/enrollmentService.js ----------
cat > src/services/enrollmentService.js << 'EOF'
const prisma = require('../prismaClient');

const enrollStudent = async ({ studentId, courseId }) => {
  try {
    return await prisma.enrollment.create({
      data: { studentId, courseId },
      include: {
        course: { select: { id: true, title: true } },
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const err = new Error('You are already enrolled in this course.');
      err.statusCode = 409;
      throw err;
    }
    throw error;
  }
};

module.exports = { enrollStudent };
EOF

# ---------- src/services/lessonService.js ----------
cat > src/services/lessonService.js << 'EOF'
const prisma = require('../prismaClient');

const createLesson = async ({ title, content, courseId, orderIndex }) => {
  return prisma.lesson.create({
    data: { title, content, courseId, orderIndex },
  });
};

const listLessonsForCourse = async (courseId) => {
  return prisma.lesson.findMany({
    where: { courseId },
    orderBy: { orderIndex: 'asc' },
  });
};

const findLessonById = async (lessonId) => {
  return prisma.lesson.findUnique({ where: { id: lessonId } });
};

const updateLesson = async (lessonId, updates) => {
  const data = {};
  if (updates.title !== undefined) data.title = updates.title;
  if (updates.content !== undefined) data.content = updates.content;
  if (updates.orderIndex !== undefined) data.orderIndex = updates.orderIndex;

  if (Object.keys(data).length === 0) {
    const err = new Error('No valid fields provided to update.');
    err.statusCode = 400;
    throw err;
  }

  return prisma.lesson.update({ where: { id: lessonId }, data });
};

// If the caller doesn't supply an orderIndex when adding a lesson,
// place it at the end of the course's existing lesson list
const getNextOrderIndex = async (courseId) => {
  return prisma.lesson.count({ where: { courseId } });
};

module.exports = {
  createLesson,
  listLessonsForCourse,
  findLessonById,
  updateLesson,
  getNextOrderIndex,
};
EOF

# ---------- src/controllers/courseController.js ----------
cat > src/controllers/courseController.js << 'EOF'
const courseService = require('../services/courseService');
const enrollmentService = require('../services/enrollmentService');

const createCourse = async (req, res) => {
  try {
    const { title, teacherId } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required.' });
    }

    let finalTeacherId;

    if (req.user.role === 'TEACHER') {
      // Teachers can only create courses for themselves
      finalTeacherId = req.user.userId;
    } else {
      // ADMIN must specify which teacher this course belongs to
      if (!teacherId) {
        return res
          .status(400)
          .json({ error: 'teacherId is required when an admin creates a course.' });
      }

      const valid = await courseService.isTeacherInSchool(teacherId, req.user.schoolId);
      if (!valid) {
        return res.status(400).json({ error: 'teacherId must belong to a TEACHER in your school.' });
      }
      finalTeacherId = teacherId;
    }

    const course = await courseService.createCourse({
      title,
      teacherId: finalTeacherId,
      schoolId: req.user.schoolId,
    });

    return res.status(201).json({ message: 'Course created successfully.', course });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to create course.' });
  }
};

const listCourses = async (req, res) => {
  try {
    const { teacherId, page, limit } = req.query;

    const result = await courseService.listCoursesInSchool(req.user.schoolId, {
      teacherId,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to list courses.' });
  }
};

const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await courseService.findCourseById(id);
    if (!course || course.schoolId !== req.user.schoolId) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    if (req.user.role === 'TEACHER' && course.teacherId !== req.user.userId) {
      return res.status(403).json({ error: 'You can only edit your own courses.' });
    }

    const { title, teacherId } = req.body;

    if (teacherId) {
      if (req.user.role === 'TEACHER') {
        return res.status(403).json({ error: 'Teachers cannot reassign course ownership.' });
      }
      const valid = await courseService.isTeacherInSchool(teacherId, req.user.schoolId);
      if (!valid) {
        return res.status(400).json({ error: 'teacherId must belong to a TEACHER in your school.' });
      }
    }

    const updated = await courseService.updateCourse(id, { title, teacherId });
    return res.status(200).json({ message: 'Course updated successfully.', course: updated });
  } catch (error) {
    console.error(error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to update course.' });
  }
};

const enrollInCourse = async (req, res) => {
  try {
    const { id: courseId } = req.params;

    const course = await courseService.findCourseById(courseId);
    if (!course || course.schoolId !== req.user.schoolId) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const enrollment = await enrollmentService.enrollStudent({
      studentId: req.user.userId,
      courseId,
    });

    return res.status(201).json({ message: 'Enrolled successfully.', enrollment });
  } catch (error) {
    console.error(error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to enroll.' });
  }
};

module.exports = { createCourse, listCourses, updateCourse, enrollInCourse };
EOF

# ---------- src/controllers/lessonController.js ----------
cat > src/controllers/lessonController.js << 'EOF'
const lessonService = require('../services/lessonService');
const courseService = require('../services/courseService');

// Shared check: course must exist in the caller's school, and if they're a
// TEACHER they must own it. Throws an error with a statusCode if not.
const checkCourseAccess = async (req, courseId) => {
  const course = await courseService.findCourseById(courseId);

  if (!course || course.schoolId !== req.user.schoolId) {
    const err = new Error('Course not found.');
    err.statusCode = 404;
    throw err;
  }

  if (req.user.role === 'TEACHER' && course.teacherId !== req.user.userId) {
    const err = new Error('You can only manage lessons for your own courses.');
    err.statusCode = 403;
    throw err;
  }

  return course;
};

const addLesson = async (req, res) => {
  try {
    const { courseId } = req.params;
    await checkCourseAccess(req, courseId);

    const { title, content, orderIndex } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required.' });
    }

    const finalOrderIndex =
      orderIndex !== undefined ? orderIndex : await lessonService.getNextOrderIndex(courseId);

    const lesson = await lessonService.createLesson({
      title,
      content,
      courseId,
      orderIndex: finalOrderIndex,
    });

    return res.status(201).json({ message: 'Lesson added successfully.', lesson });
  } catch (error) {
    console.error(error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to add lesson.' });
  }
};

const listLessons = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await courseService.findCourseById(courseId);
    if (!course || course.schoolId !== req.user.schoolId) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const lessons = await lessonService.listLessonsForCourse(courseId);
    return res.status(200).json({ lessons });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to list lessons.' });
  }
};

const updateLessonHandler = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    await checkCourseAccess(req, courseId);

    const lesson = await lessonService.findLessonById(lessonId);
    if (!lesson || lesson.courseId !== courseId) {
      return res.status(404).json({ error: 'Lesson not found in this course.' });
    }

    const { title, content, orderIndex } = req.body;
    const updated = await lessonService.updateLesson(lessonId, { title, content, orderIndex });

    return res.status(200).json({ message: 'Lesson updated successfully.', lesson: updated });
  } catch (error) {
    console.error(error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to update lesson.' });
  }
};

module.exports = { addLesson, listLessons, updateLessonHandler };
EOF

# ---------- src/routes/lessonRoutes.js ----------
cat > src/routes/lessonRoutes.js << 'EOF'
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
EOF

# ---------- src/routes/courseRoutes.js ----------
cat > src/routes/courseRoutes.js << 'EOF'
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
EOF

echo "Done. Created:"
echo "  src/services/courseService.js"
echo "  src/services/enrollmentService.js"
echo "  src/services/lessonService.js"
echo "  src/controllers/courseController.js"
echo "  src/controllers/lessonController.js"
echo "  src/routes/lessonRoutes.js"
echo "  src/routes/courseRoutes.js"
