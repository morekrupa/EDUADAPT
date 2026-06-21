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
