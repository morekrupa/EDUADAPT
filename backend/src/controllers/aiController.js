const recommendationService = require('../services/recommendationService');

const receiveRecommendation = async (req, res) => {
  try {
    const { studentId, type, payload } = req.body;

    const recommendation = await recommendationService.createRecommendation({
      studentId,
      type,
      payload,
    });

    return res.status(201).json({ message: 'Recommendation stored.', recommendation });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to store recommendation.' });
  }
};

const getMyRecommendations = async (req, res) => {
  try {
    const recommendations = await recommendationService.getActiveRecommendationsForStudent(
      req.user.userId
    );
    return res.status(200).json({ recommendations });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch recommendations.' });
  }
};

module.exports = { receiveRecommendation, getMyRecommendations };
