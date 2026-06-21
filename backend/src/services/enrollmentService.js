const prisma = require('../prismaClient');

const enrollStudent = async ({ studentId, courseId }) => {
  try {
    return await prisma.enrollment.create({
      data: { studentId, courseId },
      include: {
        course: { select: { id: true, title: true } },
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const err = new Error('You are already enrolled in this course.');
      err.statusCode = 409;
      throw err;
    }
    throw error;
  }
};

module.exports = { enrollStudent };
