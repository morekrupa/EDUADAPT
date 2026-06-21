const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const studentController = require('../controllers/studentController');

router.get('/:id/sessions', verifyToken, studentController.getSessions);
router.get('/:id/progress', verifyToken, studentController.getProgress);

module.exports = router;
