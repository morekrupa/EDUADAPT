const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const gameSessionController = require('../controllers/gameSessionController');

router.post('/session', verifyToken, checkRole('STUDENT'), gameSessionController.saveSession);

module.exports = router;
