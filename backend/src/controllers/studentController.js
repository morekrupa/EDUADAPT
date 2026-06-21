const prisma = require('../prismaClient');
const studentDataService = require('../services/studentDataService');

// A STUDENT can only view their own data.
// A TEACHER/ADMIN can view any student who belongs to their own school.
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

    const sessions = await studentDataService.getSessionsForStudent(id);
    return res.status(200).json({ sessions });
  } catch (error) {
    console.error(error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to fetch sessions.' });
  }
};

const getProgress = async (req, res) => {
  try {
    const { id } = req.params;
    await ensureAccess(req, id);

    const progress = await studentDataService.getProgressForStudent(id);
    return res.status(200).json({ progress });
  } catch (error) {
    console.error(error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to fetch progress.' });
  }
};

module.exports = { getSessions, getProgress };
