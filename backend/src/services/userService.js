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
