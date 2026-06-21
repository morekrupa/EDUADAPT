const prisma = require('../prismaClient');

const getSessionsForStudent = async (studentId) => {
  return prisma.gameSession.findMany({
    where: { studentId },
    include: {
      lesson: { select: { id: true, title: true, courseId: true } },
    },
    orderBy: { playedAt: 'desc' },
  });
};

const getProgressForStudent = async (studentId) => {
  return prisma.studentProgress.findMany({
    where: { studentId },
    include: {
      lesson: { select: { id: true, title: true, courseId: true } },
    },
    orderBy: { lastUpdated: 'desc' },
  });
};

module.exports = { getSessionsForStudent, getProgressForStudent };
