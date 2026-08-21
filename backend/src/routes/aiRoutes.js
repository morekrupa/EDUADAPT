const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/handleValidationErrors');
const { validateRecommendation } = require('../middleware/validators');
const aiController = require('../controllers/aiController');

// Member 4's ML service POSTs here using an admin token
router.post('/recommendations', verifyToken, checkRole('ADMIN'), validateRecommendation, handleValidationErrors, aiController.receiveRecommendation);

// Member 1's student panel GETs from here
router.get('/recommendations/me', verifyToken, checkRole('STUDENT'), aiController.getMyRecommendations);

module.exports = router;
