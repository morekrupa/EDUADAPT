const prisma = require('../prismaClient');

const getNotificationsForUser = async (userId) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};

module.exports = { getNotificationsForUser };
