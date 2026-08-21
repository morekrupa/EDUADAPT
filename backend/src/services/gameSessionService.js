const prisma = require('../prismaClient');
const { upsertStudentProgress } = require('./progressService');
const { recalculateLeaderboard } = require('./leaderboardService');
const { logInteraction, logMistake } = require('./interactionService');
const { updateTopicMastery, updateSubtopicMastery } = require('./masteryService');

const validateLessonAndEnrollment = async (studentId, lessonId) => {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) { const err = new Error('Lesson not found.'); err.statusCode = 404; throw err; }
  const enrollment = await prisma.enrollment.findUnique({ where: { studentId_courseId: { studentId, courseId: lesson.courseId } } });
  if (!enrollment) { const err = new Error('You must be enrolled in this course.'); err.statusCode = 403; throw err; }
  return lesson;
};

const startSession = async ({ studentId, gameId, lessonId }) => {
  const lesson = await validateLessonAndEnrollment(studentId, lessonId);
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) { const err = new Error('Game not found.'); err.statusCode = 404; throw err; }
  if (game.lessonId && game.lessonId !== lessonId) { const err = new Error('Game does not belong to the selected lesson.'); err.statusCode = 400; throw err; }
  if (!['READY', 'PUBLISHED'].includes(game.status)) { const err = new Error('Game is not available.'); err.statusCode = 409; throw err; }
  return prisma.gameSession.create({ data: { studentId, gameId, lessonId, score: 0, accuracy: 0, timeSpentSec: 0, difficultyLevel: game.difficulty === 'HARD' ? 3 : game.difficulty === 'MEDIUM' ? 2 : 1, status: 'STARTED' } });
};

const recordInteraction = async ({ studentId, sessionId, ...payload }) => {
  const session = await prisma.gameSession.findFirst({ where: { id: sessionId, studentId } });
  if (!session) { const err = new Error('Session not found.'); err.statusCode = 404; throw err; }
  if (session.status !== 'STARTED') { const err = new Error('Session is no longer active.'); err.statusCode = 409; throw err; }
  return logInteraction({ studentId, sessionId, ...payload });
};

const recordMistake = async ({ studentId, sessionId, ...payload }) => {
  const session = await prisma.gameSession.findFirst({ where: { id: sessionId, studentId } });
  if (!session) { const err = new Error('Session not found.'); err.statusCode = 404; throw err; }
  if (session.status !== 'STARTED') { const err = new Error('Session is no longer active.'); err.statusCode = 409; throw err; }
  return logMistake({ studentId, sessionId, ...payload });
};

const saveGameSession = async ({ studentId, lessonId, score, accuracy, timeSpentSec, difficultyLevel }) => {
  const lesson = await validateLessonAndEnrollment(studentId, lessonId);
  // Legacy endpoint accepts percentage accuracy (0-100); new analytics use 0-1.
  const normalizedAccuracy = Math.max(0, Math.min(1, Number(accuracy) > 1 ? Number(accuracy) / 100 : Number(accuracy)));
  return prisma.$transaction(async (tx) => {
    const session = await tx.gameSession.create({ data: { studentId, lessonId, score: Number(score), accuracy: normalizedAccuracy, timeSpentSec: Number(timeSpentSec), difficultyLevel: Number(difficultyLevel) } });
    const progress = await upsertStudentProgress(tx, { studentId, lessonId, accuracy: normalizedAccuracy });
    const leaderboardEntry = await recalculateLeaderboard(tx, { studentId, courseId: lesson.courseId });
    return { session, progress, leaderboardEntry };
  });
};

const completeSession = async ({ studentId, sessionId, score, accuracy, timeSpentSec, completion = 1, hintsUsed = 0, mistakesCount = 0 }) => {
  const session = await prisma.gameSession.findFirst({ where: { id: sessionId, studentId }, include: { game: true, lesson: true } });
  if (!session) { const err = new Error('Session not found.'); err.statusCode = 404; throw err; }
  if (session.status !== 'STARTED') return session;
  const safeAccuracy = Math.max(0, Math.min(1, Number(accuracy) > 1 ? Number(accuracy) / 100 : Number(accuracy || 0)));
  const safeCompletion = Math.max(0, Math.min(1, Number(completion)));
  const safeHints = Math.max(0, Number(hintsUsed || 0));
  const safeMistakes = Math.max(0, Number(mistakesCount || 0));
  const xpEarned = 10 + Math.round(safeAccuracy * 40) + (safeCompletion >= 1 ? 20 : Math.round(safeCompletion * 20)) + (safeMistakes === 0 && safeAccuracy >= 0.9 ? 10 : 0);
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.gameSession.update({ where: { id: sessionId }, data: { score: Number(score || 0), accuracy: safeAccuracy, timeSpentSec: Math.max(0, Number(timeSpentSec || 0)), completion: safeCompletion, hintsUsed: safeHints, mistakesCount: safeMistakes, status: 'COMPLETED', xpEarned, completedAt: new Date() } });
    await tx.xPTransaction.create({ data: { studentId, sessionId, xpAmount: xpEarned, reason: 'GAME_COMPLETION', metadata: { score: Number(score || 0), accuracy: safeAccuracy, completion: safeCompletion } } });
    return updated;
  });
  if (session.game) {
    await updateTopicMastery({ studentId, topicId: session.game.topicId, correctness: safeAccuracy >= 0.6, responseTimeSec: timeSpentSec, completed: true, hintUsed: safeHints > 0 });
    if (session.game.subtopicId) await updateSubtopicMastery({ studentId, subtopicId: session.game.subtopicId, correctness: safeAccuracy >= 0.6, responseTimeSec: timeSpentSec, completed: true, hintUsed: safeHints > 0 });
  }
  await recalculateLeaderboard(prisma, { studentId, courseId: session.lesson.courseId });
  return result;
};

const skipSession = async ({ studentId, sessionId, timeSpentSec = 0 }) => {
  const session = await prisma.gameSession.findFirst({ where: { id: sessionId, studentId }, include: { game: true, lesson: true } });
  if (!session) { const err = new Error('Session not found.'); err.statusCode = 404; throw err; }
  if (session.status !== 'STARTED') return session;
  const result = await prisma.gameSession.update({ where: { id: sessionId }, data: { status: 'SKIPPED', timeSpentSec: Math.max(0, Number(timeSpentSec)), completion: 0, completedAt: new Date() } });
  if (session.game) {
    await updateTopicMastery({ studentId, topicId: session.game.topicId, correctness: false, responseTimeSec: timeSpentSec, skipped: true });
    if (session.game.subtopicId) await updateSubtopicMastery({ studentId, subtopicId: session.game.subtopicId, correctness: false, responseTimeSec: timeSpentSec, skipped: true });
  }
  return result;
};

const abandonSession = async ({ studentId, sessionId, timeSpentSec = 0, completion = 0 }) => {
  const result = await prisma.gameSession.updateMany({ where: { id: sessionId, studentId, status: 'STARTED' }, data: { status: 'ABANDONED', timeSpentSec: Math.max(0, Number(timeSpentSec)), completion: Math.max(0, Math.min(1, Number(completion))), completedAt: new Date() } });
  if (!result.count) { const err = new Error('Active session not found.'); err.statusCode = 404; throw err; }
  return prisma.gameSession.findUnique({ where: { id: sessionId } });
};

module.exports = { startSession, recordInteraction, recordMistake, saveGameSession, completeSession, skipSession, abandonSession };
