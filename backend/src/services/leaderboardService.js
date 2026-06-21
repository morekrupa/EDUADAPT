// Called inside a transaction (tx) from gameSessionService.
const recalculateLeaderboard = async (tx, { studentId, courseId }) => {
  // Aggregation query: sum this student's scores across all lessons in this course
  const agg = await tx.gameSession.aggregate({
    where: { studentId, lesson: { courseId } },
    _sum: { score: true },
  });
  const totalPoints = agg._sum.score || 0;

  await tx.leaderboard.upsert({
    where: { studentId_courseId: { studentId, courseId } },
    update: { totalPoints },
    create: { studentId, courseId, totalPoints, rank: 0 },
  });

  // Re-rank everyone in this course's leaderboard, highest points first
  const entries = await tx.leaderboard.findMany({
    where: { courseId },
    orderBy: { totalPoints: 'desc' },
  });

  for (let i = 0; i < entries.length; i++) {
    const correctRank = i + 1;
    if (entries[i].rank !== correctRank) {
      await tx.leaderboard.update({
        where: { id: entries[i].id },
        data: { rank: correctRank },
      });
    }
  }

  return tx.leaderboard.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  });
};

module.exports = { recalculateLeaderboard };
