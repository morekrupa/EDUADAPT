const prisma = require('../prismaClient');

const getMastery = async (studentId) => prisma.studentTopicMastery.findMany({
  where: { studentId },
  orderBy: { lastUpdated: 'desc' },
  include: {
    topic: { select: { id: true, title: true, chapterId: true } },
  },
});

const getRecommendations = async (studentId) => prisma.recommendation.findMany({
  where: { studentId, isActive: true },
  orderBy: { createdAt: 'desc' },
});

module.exports = { getMastery, getRecommendations };