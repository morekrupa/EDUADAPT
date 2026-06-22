const courseService = require('../services/courseService');
const reportService = require('../services/reportService');

const getCourseReportHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await courseService.findCourseById(id);
    if (!course || course.schoolId !== req.user.schoolId) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    if (req.user.role === 'TEACHER' && course.teacherId !== req.user.userId) {
      return res.status(403).json({ error: 'You can only view reports for your own courses.' });
    }

    const report = await reportService.getCourseReport(id);
    return res.status(200).json(report);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to generate report.' });
  }
};

module.exports = { getCourseReportHandler };
