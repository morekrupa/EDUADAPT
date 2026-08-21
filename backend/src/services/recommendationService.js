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
