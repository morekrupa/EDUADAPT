const express = require('express');
const controller = require('../controllers/gamificationController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);
router.get('/xp', controller.getXP);
router.get('/level', controller.getLevel);
router.get('/badges', controller.getBadges);
router.get('/leaderboard/:courseId', controller.getLeaderboard);

module.exports = router;
