#!/bin/bash
# Run this from inside your backend/ folder:
#   bash create-week2-files.sh

set -e

mkdir -p src/services src/controllers src/routes

# ---------- src/services/schoolService.js ----------
cat > src/services/schoolService.js << 'EOF'
const prisma = require('../prismaClient');
const bcrypt = require('bcrypt');

const createSchool = async ({ name, code }) => {
  return prisma.school.create({
    data: { name, code },
  });
};

const findSchoolByCode = async (code) => {
  return prisma.school.findUnique({ where: { code } });
};

// Used by both addTeacher and addStudent — role is passed in by the caller
const addUserToSchool = async ({ name, email, password, role, schoolId }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('A user with this email already exists.');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      schoolId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      schoolId: true,
      createdAt: true,
      // passwordHash deliberately excluded from the response
    },
  });
};

// Fans an announcement out into one Notification row per matching user,
// since the Notification model is per-user, not a broadcast table.
const sendAnnouncement = async ({ message, schoolId, targetRole }) => {
  const where = { schoolId };
  if (targetRole) where.role = targetRole;

  const recipients = await prisma.user.findMany({
    where,
    select: { id: true },
  });

  if (recipients.length === 0) {
    const err = new Error('No matching users found in this school to notify.');
    err.statusCode = 404;
    throw err;
  }

  const notifications = recipients.map((u) => ({
    userId: u.id,
    message,
  }));

  await prisma.notification.createMany({ data: notifications });

  return { notifiedCount: notifications.length };
};

module.exports = { createSchool, findSchoolByCode, addUserToSchool, sendAnnouncement };
EOF

# ---------- src/services/notificationService.js ----------
cat > src/services/notificationService.js << 'EOF'
const prisma = require('../prismaClient');

const getNotificationsForUser = async (userId) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};

module.exports = { getNotificationsForUser };
EOF

# ---------- src/controllers/schoolController.js ----------
cat > src/controllers/schoolController.js << 'EOF'
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
EOF

# ---------- src/controllers/notificationController.js ----------
cat > src/controllers/notificationController.js << 'EOF'
const notificationService = require('../services/notificationService');

const getMyNotifications = async (req, res) => {
  try {
    const notifications = await notificationService.getNotificationsForUser(req.user.id);
    return res.status(200).json({ notifications });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
};

module.exports = { getMyNotifications };
EOF

# ---------- src/routes/schoolRoutes.js ----------
cat > src/routes/schoolRoutes.js << 'EOF'
const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const schoolController = require('../controllers/schoolController');

// Public — no school exists yet for the first admin to authenticate against
router.post('/register', schoolController.registerSchool);

// Admin-only — scoped to the admin's own school via req.user.schoolId
router.post('/teachers', verifyToken, checkRole('ADMIN'), schoolController.addTeacher);
router.post('/students', verifyToken, checkRole('ADMIN'), schoolController.addStudent);
router.post('/announcements', verifyToken, checkRole('ADMIN'), schoolController.sendAnnouncement);

module.exports = router;
EOF

# ---------- src/routes/notificationRoutes.js ----------
cat > src/routes/notificationRoutes.js << 'EOF'
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const notificationController = require('../controllers/notificationController');

router.get('/', verifyToken, notificationController.getMyNotifications);

module.exports = router;
EOF

echo "Done. Created:"
echo "  src/services/schoolService.js"
echo "  src/services/notificationService.js"
echo "  src/controllers/schoolController.js"
echo "  src/controllers/notificationController.js"
echo "  src/routes/schoolRoutes.js"
echo "  src/routes/notificationRoutes.js"
