const userService = require('../services/userService');

const getMe = async (req, res) => {
  try {
    const user = await userService.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch profile.' });
  }
};

const updateMe = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await userService.updateUser(req.user.userId, { name, email });
    return res.status(200).json({ message: 'Profile updated successfully.', user });
  } catch (error) {
    console.error(error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to update profile.' });
  }
};

const listUsers = async (req, res) => {
  try {
    const { role, page, limit } = req.query;

    if (role && !['STUDENT', 'TEACHER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'role must be STUDENT, TEACHER, or ADMIN.' });
    }

    const result = await userService.listUsersInSchool(req.user.schoolId, {
      role,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to list users.' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.userId) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const result = await userService.deleteUserInSchool(req.user.schoolId, id);
    return res.status(200).json({ message: 'User deleted successfully.', ...result });
  } catch (error) {
    console.error(error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to delete user.' });
  }
};

module.exports = { getMe, updateMe, listUsers, deleteUser };
