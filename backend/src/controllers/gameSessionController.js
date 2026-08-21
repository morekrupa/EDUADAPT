const gameSessionService = require('../services/gameSessionService');
const badgeService = require('../services/badgeService');

const saveSession = async (req, res) => {
  try {
    const { lessonId, score, accuracy, timeSpentSec, difficultyLevel } = req.body;
    if (!lessonId || score === undefined || accuracy === undefined || timeSpentSec === undefined || difficultyLevel === undefined) return res.status(400).json({ error: 'lessonId, score, accuracy, timeSpentSec, and difficultyLevel are all required.' });
    if (accuracy < 0 || accuracy > 100) return res.status(400).json({ error: 'accuracy must be between 0 and 100.' });
    const result = await gameSessionService.saveGameSession({ studentId: req.user.userId, lessonId, score, accuracy, timeSpentSec, difficultyLevel });
    const newBadges = await badgeService.checkAndAwardBadges(req.user.userId);
    return res.status(201).json({ message: 'Game session saved.', session: result.session, progress: result.progress, leaderboard: result.leaderboardEntry, newBadges });
  } catch (error) { return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to save game session.' }); }
};

const start = async (req, res, next) => { try { res.status(201).json(await gameSessionService.startSession({ studentId: req.user.userId, ...req.body })); } catch (e) { next(e); } };
const interaction = async (req, res, next) => { try { res.status(201).json(await gameSessionService.recordInteraction({ studentId: req.user.userId, sessionId: req.params.sessionId, ...req.body })); } catch (e) { next(e); } };
const mistake = async (req, res, next) => { try { res.status(201).json(await gameSessionService.recordMistake({ studentId: req.user.userId, sessionId: req.params.sessionId, ...req.body })); } catch (e) { next(e); } };
const complete = async (req, res, next) => { try { const session = await gameSessionService.completeSession({ studentId: req.user.userId, sessionId: req.params.sessionId, ...req.body }); const newBadges = await badgeService.checkAndAwardBadges(req.user.userId); res.json({ session, newBadges }); } catch (e) { next(e); } };
const skip = async (req, res, next) => { try { res.json(await gameSessionService.skipSession({ studentId: req.user.userId, sessionId: req.params.sessionId, ...req.body })); } catch (e) { next(e); } };
const abandon = async (req, res, next) => { try { res.json(await gameSessionService.abandonSession({ studentId: req.user.userId, sessionId: req.params.sessionId, ...req.body })); } catch (e) { next(e); } };

module.exports = { saveSession, start, interaction, mistake, complete, skip, abandon };
