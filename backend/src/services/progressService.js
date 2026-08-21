// Called inside a transaction (tx) from gameSessionService.
// Computes a true rolling average of accuracy, not a re-sum of all sessions —
// cheaper, and avoids re-reading full session history on every play.
const upsertStudentProgress = async (tx, { studentId, lessonId, accuracy }) => {
  const existing = await tx.studentProgress.findUnique({
    where: { studentId_lessonId: { studentId, lessonId } },
  });

  if (!existing) {
    return tx.studentProgress.create({
      data: { studentId, lessonId, masteryScore: accuracy, attempts: 1 },
    });
  }

  const newAttempts = existing.attempts + 1;
  const newMastery = (existing.masteryScore * existing.attempts + accuracy) / newAttempts;

  return tx.studentProgress.update({
    where: { studentId_lessonId: { studentId, lessonId } },
    data: { masteryScore: newMastery, attempts: newAttempts },
  });
};

module.exports = { upsertStudentProgress };
