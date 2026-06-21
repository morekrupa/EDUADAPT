const prisma = require('../prismaClient');
const { upsertStudentProgress } = require('./progressService');
const { recalculateLeaderboard } = require('./leaderboardService');

const validateLessonAndEnrollment = async (studentId, lessonId) => {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) {
    const err = new Error('Lesson not found.');
    err.statusCode = 404;
    throw err;
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId: lesson.courseId } },
  });
  if (!enrollment) {
    const err = new Error('You must be enrolled in this course to submit a game session.');
    err.statusCode = 403;
    throw err;
  }

  return lesson;
};

const saveGameSession = async ({
  studentId,
  lessonId,
  score,
  accuracy,
  timeSpentSec,
  difficultyLevel,
}) => {
  const lesson = await validateLessonAndEnrollment(studentId, lessonId);

  // Atomic: if any write fails, nothing is saved — keeps session,
  // progress, and leaderboard always in sync with each other
  return prisma.$transaction(async (tx) => {
    const session = await tx.gameSession.create({
      data: { studentId, lessonId, score, accuracy, timeSpentSec, difficultyLevel },
    });

    const progress = await upsertStudentProgress(tx, { studentId, lessonId, accuracy });

    const leaderboardEntry = await recalculateLeaderboard(tx, {
      studentId,
      courseId: lesson.courseId,
    });

    return { session, progress, leaderboardEntry };
  });
};

module.exports = { saveGameSession };
