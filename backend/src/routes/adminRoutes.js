const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const analyticsController = require('../controllers/analyticsController');

router.get('/analytics', verifyToken, checkRole('ADMIN'), analyticsController.getAnalytics);

module.exports = router;
