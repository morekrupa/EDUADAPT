#!/bin/bash
# Run this from inside your backend/ folder:
#   bash create-week2-user-files.sh
# NOTE: this OVERWRITES your existing src/routes/userRoutes.js
# (it keeps the /teacher-only and /admin-only routes, just restructures /me)

set -e

mkdir -p src/services src/controllers src/routes

# ---------- src/services/userService.js ----------
cat > src/services/userService.js << 'EOF'
const prisma = require('../prismaClient');

const USER_SAFE_FIELDS = {
  id: true,
  name: true,
  email: true,
  role: true,
  schoolId: true,
  createdAt: true,
  // passwordHash deliberately excluded everywhere below
};

const getUserById = async (userId) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: USER_SAFE_FIELDS,
  });
};

// Only name/email are editable through this path — role changes are an admin action
const updateUser = async (userId, updates) => {
  const data = {};
  if (updates.name !== undefined) data.name = updates.name;
  if (updates.email !== undefined) data.email = updates.email;

  if (Object.keys(data).length === 0) {
    const err = new Error('No valid fields provided to update.');
    err.statusCode = 400;
    throw err;
  }

  try {
    return await prisma.user.update({
      where: { id: userId },
      data,
      select: USER_SAFE_FIELDS,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const err = new Error('That email is already in use.');
      err.statusCode = 409;
      throw err;
    }
    throw error;
  }
};

const listUsersInSchool = async (schoolId, { role, page = 1, limit = 20 }) => {
  const where = { schoolId };
  if (role) where.role = role;

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: USER_SAFE_FIELDS,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const deleteUserInSchool = async (schoolId, targetUserId) => {
  const target = await prisma.user.findUnique({ where: { id: targetUserId } });

  if (!target || target.schoolId !== schoolId) {
    const err = new Error('User not found in your school.');
    err.statusCode = 404;
    throw err;
  }

  try {
    await prisma.user.delete({ where: { id: targetUserId } });
  } catch (error) {
    // Foreign key constraint — user has related enrollments/notifications/etc.
    if (error.code === 'P2003') {
      const err = new Error(
        'Cannot delete this user — they have related records (enrollments, notifications, progress, etc.).'
      );
      err.statusCode = 409;
      throw err;
    }
    throw error;
  }

  return { deletedId: targetUserId };
};

module.exports = { getUserById, updateUser, listUsersInSchool, deleteUserInSchool };
EOF

# ---------- src/controllers/userController.js ----------
cat > src/controllers/userController.js << 'EOF'
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
EOF

# ---------- src/routes/userRoutes.js ----------
cat > src/routes/userRoutes.js << 'EOF'
const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

// Any logged-in user
router.get('/me', verifyToken, userController.getMe);
router.put('/me', verifyToken, userController.updateMe);

// Admin only — scoped to their own school via req.user.schoolId
router.get('/', verifyToken, checkRole('ADMIN'), userController.listUsers);
router.delete('/:id', verifyToken, checkRole('ADMIN'), userController.deleteUser);

// Existing test/demo routes — unchanged
router.get('/teacher-only', verifyToken, checkRole('TEACHER'), (req, res) => {
  res.json({ message: 'Teacher route accessed' });
});

router.get('/admin-only', verifyToken, checkRole('ADMIN'), (req, res) => {
  res.json({ message: 'Admin route accessed' });
});

module.exports = router;
EOF

echo "Done. Created/updated:"
echo "  src/services/userService.js"
echo "  src/controllers/userController.js"
echo "  src/routes/userRoutes.js (overwritten)"
