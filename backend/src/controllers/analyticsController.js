const analyticsService = require('../services/analyticsService');

const getAnalytics = async (req, res) => {
  try {
    const analytics = await analyticsService.getSchoolAnalytics(req.user.schoolId);
    return res.status(200).json(analytics);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch analytics.' });
  }
};

module.exports = { getAnalytics };
