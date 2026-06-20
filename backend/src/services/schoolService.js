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
