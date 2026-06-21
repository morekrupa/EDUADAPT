const gameSessionService = require('../services/gameSessionService');
const badgeService = require('../services/badgeService');

const saveSession = async (req, res) => {
  try {
    const { lessonId, score, accuracy, timeSpentSec, difficultyLevel } = req.body;

    if (
      !lessonId ||
      score === undefined ||
      accuracy === undefined ||
      timeSpentSec === undefined ||
      difficultyLevel === undefined
    ) {
      return res.status(400).json({
        error: 'lessonId, score, accuracy, timeSpentSec, and difficultyLevel are all required.',
      });
    }

    if (accuracy < 0 || accuracy > 100) {
      return res.status(400).json({ error: 'accuracy must be between 0 and 100.' });
    }

    const result = await gameSessionService.saveGameSession({
      studentId: req.user.userId,
      lessonId,
      score,
      accuracy,
      timeSpentSec,
      difficultyLevel,
    });

    // Runs after the transaction commits — badge awarding doesn't need to be
    // atomic with the session save itself
    const newBadges = await badgeService.checkAndAwardBadges(req.user.userId);

    return res.status(201).json({
      message: 'Game session saved.',
      session: result.session,
      progress: result.progress,
      leaderboard: result.leaderboardEntry,
      newBadges,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to save game session.' });
  }
};

module.exports = { saveSession };
