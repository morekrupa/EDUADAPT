const schoolService = require('../services/schoolService');

const registerSchool = async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: 'name and code are required.' });
    }

    const existing = await schoolService.findSchoolByCode(code);
    if (existing) {
      return res.status(409).json({ error: 'A school with this code already exists.' });
    }

    const school = await schoolService.createSchool({ name, code });
    return res.status(201).json({ message: 'School registered successfully.', school });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to register school.' });
  }
};

const addTeacher = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required.' });
    }

    const teacher = await schoolService.addUserToSchool({
      name,
      email,
      password,
      role: 'TEACHER',
      schoolId: req.user.schoolId,
    });

    return res.status(201).json({ message: 'Teacher added successfully.', teacher });
  } catch (error) {
    console.error(error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to add teacher.' });
  }
};

const addStudent = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required.' });
    }

    const student = await schoolService.addUserToSchool({
      name,
      email,
      password,
      role: 'STUDENT',
      schoolId: req.user.schoolId,
    });

    return res.status(201).json({ message: 'Student added successfully.', student });
  } catch (error) {
    console.error(error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to add student.' });
  }
};

const sendAnnouncement = async (req, res) => {
  try {
    const { message, targetRole } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message is required.' });
    }

    if (targetRole && !['STUDENT', 'TEACHER', 'ADMIN'].includes(targetRole)) {
      return res.status(400).json({ error: 'targetRole must be STUDENT, TEACHER, or ADMIN.' });
    }

    const result = await schoolService.sendAnnouncement({
      message,
      schoolId: req.user.schoolId,
      targetRole,
    });

    return res.status(201).json({ message: 'Announcement sent.', ...result });
  } catch (error) {
    console.error(error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to send announcement.' });
  }
};

module.exports = { registerSchool, addTeacher, addStudent, sendAnnouncement };
