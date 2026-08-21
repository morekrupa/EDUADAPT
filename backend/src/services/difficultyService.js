const prisma = require('../prismaClient');

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Adaptive difficulty deliberately starts at EASY when no history exists.
 * Signals: accuracy, response time, hints, skips and recent attempts.
 */
const calculateDifficulty = ({ mastery, recentSessions = [], topicHistory = [] }) => {
  if (!mastery && topicHistory.length === 0 && recentSessions.length === 0) return 'EASY';

  const attempts = topicHistory.length;
  const accuracy = attempts
    ? topicHistory.filter((x) => x.correctness === true).length / attempts
    : Number(mastery?.accuracy || 0);
  const avgTime = attempts
    ? topicHistory.reduce((sum, x) => sum + Number(x.responseTimeSec || 0), 0) / attempts
    : Number(mastery?.avgResponseTime || 0);
  const hints = attempts ? topicHistory.filter((x) => x.hintUsage).length / attempts : 0;
  const skips = recentSessions.length ? recentSessions.filter((x) => x.status === 'SKIPPED').length / recentSessions.length : 0;

  let score = Number(mastery?.masteryScore || 0)* 100 * 0.55 + accuracy * 100 * 0.45;
  if (avgTime > 120) score -= 10;
  else if (avgTime > 0 && avgTime < 35) score += 5;
  score -= hints * 12;
  score -= skips * 20;

  if (score >= 78 && accuracy >= 0.75 && hints < 0.25 && skips < 0.15) return 'HARD';
  if (score >= 55 && accuracy >= 0.55) return 'MEDIUM';
  return 'EASY';
};

const getStudentDifficulty = async (studentId, topicId) => {
  const mastery = await prisma.studentTopicMastery.findUnique({
    where: { studentId_topicId: { studentId, topicId } },
  });
  if (!mastery) return 'EASY';

  const [interactions, sessions] = await Promise.all([
    prisma.studentInteraction.findMany({
      where: { studentId, topicId },
      orderBy: { timestamp: 'desc' },
      take: 20,
      select: { correctness: true, responseTimeSec: true, hintUsage: true },
    }),
    prisma.gameSession.findMany({
      where: { studentId, game: { topicId } },
      orderBy: { playedAt: 'desc' },
      take: 10,
      select: { status: true },
    }),
  ]);
  return calculateDifficulty({ mastery, topicHistory: interactions, recentSessions: sessions });
};

const persistDifficulty = async (studentId, topicId, difficulty) => prisma.studentTopicMastery.upsert({
  where: { studentId_topicId: { studentId, topicId } },
  create: { studentId, topicId, currentDifficulty: difficulty, lastUpdated: new Date() },
  update: { currentDifficulty: difficulty, lastUpdated: new Date() },
});

module.exports = { DIFFICULTIES, calculateDifficulty, getStudentDifficulty, persistDifficulty, clamp };
