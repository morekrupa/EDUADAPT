const prisma = require('../prismaClient');

// ASSUMPTION: Badge.criteria is a free-text field, so this is a simple
// "TYPE:VALUE" convention invented for now. Update this parser if your
// team settles on a different format.
//   "SESSIONS:10"   -> total game sessions for the student >= 10
//   "MASTERY:90"    -> any single lesson's masteryScore >= 90
//   "POINTS:500"    -> sum of leaderboard totalPoints (all courses) >= 500
//   "PERFECT_SCORE" -> any single game session with accuracy === 100
const evaluateCriteria = async (studentId, criteria) => {
  const [type, valueStr] = criteria.split(':').map((s) => s.trim());
  const value = valueStr ? Number(valueStr) : null;

  switch (type) {
    case 'SESSIONS': {
      const count = await prisma.gameSession.count({ where: { studentId } });
      return count >= value;
    }
    case 'MASTERY': {
      const match = await prisma.studentProgress.findFirst({
        where: { studentId, masteryScore: { gte: value } },
      });
      return Boolean(match);
    }
    case 'POINTS': {
      const agg = await prisma.leaderboard.aggregate({
        where: { studentId },
        _sum: { totalPoints: true },
      });
      return (agg._sum.totalPoints || 0) >= value;
    }
    case 'PERFECT_SCORE': {
      const match = await prisma.gameSession.findFirst({
        where: { studentId, accuracy: 100 },
      });
      return Boolean(match);
    }
    default:
      return false;
  }
};

const checkAndAwardBadges = async (studentId) => {
  const allBadges = await prisma.badge.findMany();

  const alreadyAwarded = await prisma.userBadge.findMany({
    where: { userId: studentId },
    select: { badgeId: true },
  });
  const awardedIds = new Set(alreadyAwarded.map((ub) => ub.badgeId));

  const newlyAwarded = [];

  for (const badge of allBadges) {
    if (awardedIds.has(badge.id)) continue;

    const earned = await evaluateCriteria(studentId, badge.criteria);
    if (!earned) continue;

    try {
      await prisma.userBadge.create({
        data: { userId: studentId, badgeId: badge.id },
      });
      newlyAwarded.push(badge);
    } catch (error) {
      // P2002 = unique constraint hit, meaning a concurrent request already
      // awarded this badge — safe to ignore, not a real failure
      if (error.code !== 'P2002') throw error;
    }
  }

  return newlyAwarded;
};

module.exports = { checkAndAwardBadges };
