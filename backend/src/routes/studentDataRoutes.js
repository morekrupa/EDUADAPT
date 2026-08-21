const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const studentController = require('../controllers/studentController');

router.get('/:id/sessions', verifyToken, studentController.getSessions);
router.get('/:id/progress', verifyToken, studentController.getProgress);
router.get('/me/progress', verifyToken, (req, res, next) => { req.params.id = req.user.userId; next(); }, studentController.getProgress);
router.get('/me/mastery', verifyToken, studentController.getMastery);
router.get('/me/recommendations', verifyToken, studentController.getRecommendations);

module.exports = router;
