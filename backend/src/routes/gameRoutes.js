const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/handleValidationErrors');
const { validateGameSession } = require('../middleware/validators');
const gameSessionController = require('../controllers/gameSessionController');

router.post('/session', verifyToken, checkRole('STUDENT'), validateGameSession, handleValidationErrors, gameSessionController.saveSession);

module.exports = router;
