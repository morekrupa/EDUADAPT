const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { generate } = require('../controllers/gameGenerationController');

const router = express.Router();
router.use(requireAuth);
router.post('/generate', generate);

module.exports = router;
