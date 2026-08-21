const prisma = require('../prismaClient');
const { updateTopicMastery, updateSubtopicMastery } = require('./masteryService');

const logInteraction = async ({ studentId, sessionId, topicId, subtopicId, questionId, eventType, correctness, responseTimeSec, hintUsage = false, attemptNumber = 1, metadata }) => {
  const interaction = await prisma.studentInteraction.create({
    data: { studentId, sessionId, topicId, subtopicId, questionId, eventType, correctness, responseTimeSec, hintUsage, attemptNumber, metadata },
  });

  if (topicId && typeof correctness === 'boolean') {
    await updateTopicMastery({ studentId, topicId, correctness, responseTimeSec, hintUsed: hintUsage });
  }
  if (subtopicId && typeof correctness === 'boolean') {
    await updateSubtopicMastery({ studentId, subtopicId, correctness, responseTimeSec, hintUsed: hintUsage });
  }
  return interaction;
};

const logMistake = async ({ studentId, sessionId, topicId, subtopicId, questionId, studentAnswer, expectedAnswer, misconception, metadata }) => prisma.studentMistake.create({
  data: { studentId, sessionId, topicId, subtopicId, questionId, studentAnswer, expectedAnswer, misconception, metadata },
});

module.exports = { logInteraction, logMistake };
