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
