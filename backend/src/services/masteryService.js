const prisma = require('../prismaClient');

const clamp01 = (value) => Math.max(0, Math.min(1, value));

const updateTopicMastery = async ({ studentId, topicId, correctness, responseTimeSec = 0, hintUsed = false, completed = false, skipped = false }) => {
  const existing = await prisma.studentTopicMastery.findUnique({ where: { studentId_topicId: { studentId, topicId } } });
  const attempts = (existing?.attempts || 0) + 1;
  const oldAccuracy = existing?.accuracy || 0;
  const accuracy = clamp01((oldAccuracy * (attempts - 1) + (correctness ? 1 : 0)) / attempts);
  const oldMastery = existing?.masteryScore || 0;
  const signal = correctness ? 0.12 : -0.10;
  const timePenalty = responseTimeSec > 120 ? 0.03 : 0;
  const hintPenalty = hintUsed ? 0.03 : 0;
  const masteryScore = clamp01(oldMastery + signal - timePenalty - hintPenalty + (completed ? 0.04 : 0) - (skipped ? 0.05 : 0));
  const avgResponseTime = existing?.avgResponseTime
    ? ((existing.avgResponseTime * (attempts - 1)) + responseTimeSec) / attempts
    : responseTimeSec;

  return prisma.studentTopicMastery.upsert({
    where: { studentId_topicId: { studentId, topicId } },
    create: {
      studentId, topicId, masteryScore, accuracy, attempts,
      gamesCompleted: completed ? 1 : 0,
      gamesSkipped: skipped ? 1 : 0,
      avgResponseTime, hintsUsed: hintUsed ? 1 : 0,
      lastUpdated: new Date(),
    },
    update: {
      masteryScore, accuracy, attempts,
      gamesCompleted: { increment: completed ? 1 : 0 },
      gamesSkipped: { increment: skipped ? 1 : 0 },
      avgResponseTime,
      hintsUsed: { increment: hintUsed ? 1 : 0 },
      lastUpdated: new Date(),
    },
  });
};

const updateSubtopicMastery = async ({ studentId, subtopicId, correctness, responseTimeSec = 0, hintUsed = false, completed = false, skipped = false }) => {
  const existing = await prisma.studentSubtopicMastery.findUnique({ where: { studentId_subtopicId: { studentId, subtopicId } } });
  const attempts = (existing?.attempts || 0) + 1;
  const accuracy = clamp01(((existing?.accuracy || 0) * (attempts - 1) + (correctness ? 1 : 0)) / attempts);
  const masteryScore = clamp01((existing?.masteryScore || 0) + (correctness ? 0.12 : -0.10) - (responseTimeSec > 120 ? 0.03 : 0) - (hintUsed ? 0.03 : 0) + (completed ? 0.04 : 0) - (skipped ? 0.05 : 0));
  const avgResponseTime = existing?.avgResponseTime
    ? ((existing.avgResponseTime * (attempts - 1)) + responseTimeSec) / attempts
    : responseTimeSec;

  return prisma.studentSubtopicMastery.upsert({
    where: { studentId_subtopicId: { studentId, subtopicId } },
    create: {
      studentId, subtopicId, masteryScore, accuracy, attempts,
      gamesCompleted: completed ? 1 : 0,
      gamesSkipped: skipped ? 1 : 0,
      avgResponseTime, hintsUsed: hintUsed ? 1 : 0,
      lastUpdated: new Date(),
    },
    update: {
      masteryScore, accuracy, attempts,
      gamesCompleted: { increment: completed ? 1 : 0 },
      gamesSkipped: { increment: skipped ? 1 : 0 },
      avgResponseTime,
      hintsUsed: { increment: hintUsed ? 1 : 0 },
      lastUpdated: new Date(),
    },
  });
};

module.exports = { updateTopicMastery, updateSubtopicMastery };
