// Recalculate a student's course leaderboard from XP earned by game sessions.
// The score fallback keeps older sessions visible while the new XP system rolls out.
const recalculateLeaderboard = async (tx, { studentId, courseId }) => {
  const sessions = await tx.gameSession.findMany({
    where: { studentId, lesson: { courseId } },
    select: { id: true, score: true, xpEarned: true },
  });

  const sessionIds = sessions.map((session) => session.id);
  const transactions = sessionIds.length
    ? await tx.xPTransaction.findMany({ where: { sessionId: { in: sessionIds } }, select: { xpAmount: true } })
    : [];
  const transactionPoints = transactions.reduce((sum, item) => sum + item.xpAmount, 0);
  const earnedSessionXp = sessions.reduce((sum, session) => sum + (session.xpEarned || 0), 0);
  const legacyPoints = sessions.reduce((sum, session) => sum + (session.score || 0), 0);
  const totalPoints = transactionPoints || earnedSessionXp || legacyPoints;

  await tx.leaderboard.upsert({
    where: { studentId_courseId: { studentId, courseId } },
    update: { totalPoints },
    create: { studentId, courseId, totalPoints, rank: 0 },
  });

  const entries = await tx.leaderboard.findMany({
    where: { courseId },
    orderBy: [{ totalPoints: 'desc' }, { updatedAt: 'asc' }],
  });

  for (let i = 0; i < entries.length; i += 1) {
    const rank = i + 1;
    if (entries[i].rank !== rank) {
      await tx.leaderboard.update({ where: { id: entries[i].id }, data: { rank } });
    }
  }

  return tx.leaderboard.findUnique({ where: { studentId_courseId: { studentId, courseId } } });
};

module.exports = { recalculateLeaderboard };
