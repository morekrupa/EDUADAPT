const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const schoolRoutes = require('./routes/schoolRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const courseRoutes = require('./routes/courseRoutes');
const gameRoutes = require('./routes/gameRoutes');
const studentDataRoutes = require('./routes/studentDataRoutes');
const curriculumRoutes = require('./routes/curriculumRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { verifyToken, checkRole } = require('./middleware/authMiddleware');
const { login, register } = require('./controllers/authController');
const schoolService = require('./services/schoolService');
const prisma = require('./prismaClient');

const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/login', login);
app.post('/api/signup/student', (req, res, next) => {
  req.body.role = 'STUDENT';
  req.body.schoolId = req.body.classId;
  next();
}, register);
app.post('/api/signup/teacher', (req, res, next) => {
  req.body.role = 'TEACHER';
  req.body.schoolId = req.body.collegeId;
  next();
}, register);
app.post('/api/signup/admin', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required.' });
    const code = name.replace(/\s+/g, '').toUpperCase().slice(0, 6) + Date.now().toString().slice(-4);
    const school = await schoolService.createSchool({ name: `${name}'s Institution`, code });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already registered.' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, email, passwordHash, role: 'ADMIN', schoolId: school.id } });
    return res.status(201).json({ message: 'Admin registered successfully.', userId: user.id, schoolId: school.id, schoolCode: code });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Admin registration failed.', details: error.message });
  }
});

app.post('/api/analytics/track-activity', verifyToken, checkRole('STUDENT'), async (req, res) => {
  try {
    const { score, timeSpentSeconds, lessonId, accuracy, difficultyLevel } = req.body;
    const gameSessionService = require('./services/gameSessionService');
    const badgeService = require('./services/badgeService');
    const result = await gameSessionService.saveGameSession({ studentId: req.user.userId, lessonId, score: score || 0, accuracy: accuracy || 0, timeSpentSec: timeSpentSeconds || 0, difficultyLevel: difficultyLevel || 1 });
    const newBadges = await badgeService.checkAndAwardBadges(req.user.userId);
    return res.status(201).json({ message: 'Session saved.', session: result.session, progress: result.progress, leaderboard: result.leaderboardEntry, newBadges });
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to save session.' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/students', studentDataRoutes);
app.use('/api/curriculum', curriculumRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use(errorHandler);

app.get('/', (req, res) => res.json({ message: 'EduAdapt API is running' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));