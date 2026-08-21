const notificationService = require('../services/notificationService');

const getMyNotifications = async (req, res) => {
  try {
    const notifications = await notificationService.getNotificationsForUser(req.user.userId);
    return res.status(200).json({ notifications });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
};

module.exports = { getMyNotifications };
