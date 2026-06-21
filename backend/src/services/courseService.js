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
