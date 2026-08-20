const prisma = require('../prismaClient');
const studentDataService = require('../services/studentDataService');
const studentMasteryService = require('../services/studentMasteryService');

// Students can only access their own data. Staff can access students in their school.
const ensureAccess = async (req, targetStudentId) => {
  if (req.user.role === 'STUDENT') {
    if (req.user.userId !== targetStudentId) {
      const err = new Error('Students can only view their own data.');
      err.statusCode = 403;
      throw err;
    }
    return;
  }

  const target = await prisma.user.findUnique({ where: { id: targetStudentId } });
  if (!target || target.role !== 'STUDENT' || target.schoolId !== req.user.schoolId) {
    const err = new Error('Student not found in your school.');
    err.statusCode = 404;
    throw err;
  }
};

const getSessions = async (req, res) => {
  try {
    const { id } = req.params;
    await ensureAccess(req, id);
    return res.status(200).json({ sessions: await studentDataService.getSessionsForStudent(id) });
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to fetch sessions.' });
  }
};

const getProgress = async (req, res) => {
  try {
    const { id } = req.params;
    await ensureAccess(req, id);
    return res.status(200).json({ progress: await studentDataService.getProgressForStudent(id) });
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to fetch progress.' });
  }
};

const getMastery = async (req, res) => {
  try { return res.status(200).json({ mastery: await studentMasteryService.getMastery(req.user.userId) }); }
  catch (error) { return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to fetch mastery.' }); }
};

const getRecommendations = async (req, res) => {
  try { return res.status(200).json({ recommendations: await studentMasteryService.getRecommendations(req.user.userId) }); }
  catch (error) { return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to fetch recommendations.' }); }
};

module.exports = { getSessions, getProgress, getMastery, getRecommendations };