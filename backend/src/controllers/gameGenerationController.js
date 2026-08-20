const { generateGame } = require('../services/gameGenerationService');

const generate = async (req, res, next) => {
  try {
    const { topicId, subtopicId, syllabusVersion } = req.body;
    if (!topicId) return res.status(400).json({ message: 'topicId is required.' });
    const result = await generateGame({ studentId: req.user.id, topicId, subtopicId, syllabusVersion });
    return res.json(result);
  } catch (error) { return next(error); }
};

module.exports = { generate };
