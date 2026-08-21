const curriculumService = require('../services/curriculumService');

const getCourses = async (req, res) => {
  try { return res.json({ courses: await curriculumService.getCoursesForStudent(req.user.userId) }); }
  catch (error) { return res.status(error.statusCode || 500).json({ error: error.message }); }
};

const getCourseCurriculum = async (req, res) => {
  try { return res.json({ curriculum: await curriculumService.getCourseCurriculum(req.params.courseId, req.user.userId) }); }
  catch (error) { return res.status(error.statusCode || 500).json({ error: error.message }); }
};

const getSubject = async (req, res) => {
  try { return res.json({ subject: await curriculumService.getSubject(req.params.subjectId, req.user.userId) }); }
  catch (error) { return res.status(error.statusCode || 500).json({ error: error.message }); }
};

const getTopic = async (req, res) => {
  try { return res.json({ topic: await curriculumService.getTopic(req.params.topicId, req.user.userId) }); }
  catch (error) { return res.status(error.statusCode || 500).json({ error: error.message }); }
};

module.exports = { getCourses, getCourseCurriculum, getSubject, getTopic };