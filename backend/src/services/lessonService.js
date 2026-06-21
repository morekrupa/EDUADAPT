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
