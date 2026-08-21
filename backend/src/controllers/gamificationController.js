const service = require('../services/gamificationService');

const getXP = async (req, res, next) => {
  try { res.json(await service.getXP(req.user.id)); } catch (error) { next(error); }
};
const getLevel = async (req, res, next) => {
  try { const data = await service.getXP(req.user.id); res.json({ level: data.level, ...data }); } catch (error) { next(error); }
};
const getBadges = async (req, res, next) => {
  try { res.json(await service.getBadges(req.user.id)); } catch (error) { next(error); }
};
const getLeaderboard = async (req, res, next) => {
  try { res.json(await service.getLeaderboard(req.params.courseId)); } catch (error) { next(error); }
};

module.exports = { getXP, getLevel, getBadges, getLeaderboard };
