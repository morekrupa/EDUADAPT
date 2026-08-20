const prisma = require('../prismaClient');

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400];

const calculateLevel = (totalXp) => {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i += 1) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
};

const awardXP = async ({ studentId, sessionId = null, xpAmount, reason, metadata = null }) => {
  if (!Number.isInteger(xpAmount) || xpAmount <= 0) throw new Error('xpAmount must be a positive integer.');
  return prisma.xPTransaction.create({ data: { studentId, sessionId, xpAmount, reason, metadata } });
};

const getXP = async (studentId) => {
  const aggregate = await prisma.xPTransaction.aggregate({ where: { studentId }, _sum: { xpAmount: true } });
  const totalXp = aggregate._sum.xpAmount || 0;
  const level = calculateLevel(totalXp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? currentThreshold + 500;
  return { totalXp, level, currentThreshold, nextThreshold, xpIntoLevel: totalXp - currentThreshold, xpToNextLevel: Math.max(0, nextThreshold - totalXp) };
};

const getBadges = (studentId) => prisma.userBadge.findMany({ where: { userId: studentId }, include: { badge: true }, orderBy: { awardedAt: 'desc' } });

const evaluateBadges = async (studentId) => {
  const [xp, sessions, mastery] = await Promise.all([
    getXP(studentId),
    prisma.gameSession.count({ where: { studentId, status: 'COMPLETED' } }),
    prisma.studentTopicMastery.count({ where: { studentId, masteryScore: { gte: 0.8 } } }),
  ]);
  const badges = await prisma.badge.findMany();
  const awarded = [];
  for (const badge of badges) {
    let criteria = {};
    try { criteria = JSON.parse(badge.criteria || '{}'); } catch (_) { continue; }
    const qualifies = (!criteria.xp || xp.totalXp >= criteria.xp)
      && (!criteria.completedGames || sessions >= criteria.completedGames)
      && (!criteria.masteredTopics || mastery >= criteria.masteredTopics);
    if (!qualifies) continue;
    const existing = await prisma.userBadge.findUnique({ where: { userId_badgeId: { userId: studentId, badgeId: badge.id } } });
    if (!existing) {
      awarded.push(await prisma.userBadge.create({ data: { userId: studentId, badgeId: badge.id } }));
    }
  }
  return awarded;
};

const getLeaderboard = (courseId) => prisma.leaderboard.findMany({
  where: { courseId },
  orderBy: [{ totalPoints: 'desc' }, { updatedAt: 'asc' }],
  include: { student: { select: { id: true, name: true } } },
});

const syncLeaderboard = async (studentId, courseId) => {
  const sessions = await prisma.gameSession.findMany({ where: { studentId, lesson: { courseId } }, select: { xpEarned: true } });
  const transactions = await prisma.xPTransaction.findMany({ where: { studentId, session: { lesson: { courseId } } }, select: { xpAmount: true } });
  const totalPoints = transactions.reduce((sum, x) => sum + x.xpAmount, 0) || sessions.reduce((sum, x) => sum + x.xpEarned, 0);
  return prisma.leaderboard.upsert({ where: { studentId_courseId: { studentId, courseId } }, create: { studentId, courseId, totalPoints }, update: { totalPoints } });
};

module.exports = { LEVEL_THRESHOLDS, calculateLevel, awardXP, getXP, getBadges, evaluateBadges, getLeaderboard, syncLeaderboard };
