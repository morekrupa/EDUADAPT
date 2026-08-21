const prisma = require('../prismaClient');

const includeHierarchy = {
  chapters: {
    orderBy: { orderIndex: 'asc' },
    include: {
      topics: {
        orderBy: { orderIndex: 'asc' },
        include: {
          subtopics: { orderBy: { orderIndex: 'asc' } },
          learningObjectives: { orderBy: { orderIndex: 'asc' } },
        },
      },
    },
  },
};

const getCoursesForStudent = async (studentId) => prisma.course.findMany({
  where: { enrollments: { some: { studentId } } },
  orderBy: { createdAt: 'desc' },
  include: { subjects: { orderBy: { orderIndex: 'asc' } } },
});

const getCourseCurriculum = async (courseId, studentId) => {
  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  });
  if (!enrollment) {
    const error = new Error('Student is not enrolled in this course.');
    error.statusCode = 403;
    throw error;
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: includeHierarchy,
  });
  if (!course) {
    const error = new Error('Course not found.');
    error.statusCode = 404;
    throw error;
  }
  return course;
};

const getSubject = async (subjectId, studentId) => {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: { course: true, chapters: { orderBy: { orderIndex: 'asc' }, include: { topics: { orderBy: { orderIndex: 'asc' } } } } },
  });
  if (!subject) {
    const error = new Error('Subject not found.');
    error.statusCode = 404;
    throw error;
  }
  await assertEnrollment(studentId, subject.courseId);
  return subject;
};

const getTopic = async (topicId, studentId) => {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      chapter: { include: { subject: true } },
      subtopics: { orderBy: { orderIndex: 'asc' } },
      learningObjectives: { orderBy: { orderIndex: 'asc' } },
      games: { where: { status: { in: ['READY', 'PUBLISHED'] } }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!topic) {
    const error = new Error('Topic not found.');
    error.statusCode = 404;
    throw error;
  }
  await assertEnrollment(studentId, topic.chapter.subject.courseId);
  return topic;
};

const assertEnrollment = async (studentId, courseId) => {
  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  });
  if (!enrollment) {
    const error = new Error('Student is not enrolled in this course.');
    error.statusCode = 403;
    throw error;
  }
};

module.exports = { getCoursesForStudent, getCourseCurriculum, getSubject, getTopic, assertEnrollment };