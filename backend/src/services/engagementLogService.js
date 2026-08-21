const prisma = require('../prismaClient');

const logEvent = async ({ userId, action, metadata }) => {
  return prisma.engagementLog.create({
    data: {
      userId,
      action,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
};

module.exports = { logEvent };
