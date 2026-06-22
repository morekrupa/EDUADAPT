const prisma = require('../prismaClient');

const getCourseReport = async (courseId) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      lessons: { orderBy: { orderIndex: 'asc' } },
      enrollments: {
        include: { student: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  if (!course) return null;

  const lessonIds = course.lessons.map((l) => l.id);
  const studentIds = course.enrollments.map((e) => e.studentId);

  if (lessonIds.length === 0 || studentIds.length === 0) {
    return {
      course: { id: course.id, title: course.title },
      students: course.enrollments.map((e) => ({ student: e.student, lessons: [] })),
    };
  }

  // Aggregation: average accuracy + session count per student per lesson, in one query
  const sessionStats = await prisma.gameSession.groupBy({
    by: ['studentId', 'lessonId'],
    where: { lessonId: { in: lessonIds }, studentId: { in: studentIds } },
    _avg: { accuracy: true },
    _count: { id: true },
  });

  const progressRows = await prisma.studentProgress.findMany({
    where: { lessonId: { in: lessonIds }, studentId: { in: studentIds } },
  });

  const sessionMap = new Map();
  sessionStats.forEach((s) => {
    sessionMap.set(`${s.studentId}|${s.lessonId}`, {
      avgAccuracy: s._avg.accuracy,
      sessionCount: s._count.id,
    });
  });

  const progressMap = new Map();
  progressRows.forEach((p) => {
    progressMap.set(`${p.studentId}|${p.lessonId}`, {
      masteryScore: p.masteryScore,
      attempts: p.attempts,
    });
  });

  const students = course.enrollments.map((enrollment) => {
    const lessons = course.lessons.map((lesson) => {
      const key = `${enrollment.studentId}|${lesson.id}`;
      const sessionInfo = sessionMap.get(key) || { avgAccuracy: null, sessionCount: 0 };
      const progressInfo = progressMap.get(key) || { masteryScore: 0, attempts: 0 };

      return {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        sessionCount: sessionInfo.sessionCount,
        avgAccuracy: sessionInfo.avgAccuracy,
        masteryScore: progressInfo.masteryScore,
        attempts: progressInfo.attempts,
      };
    });

    return { student: enrollment.student, lessons };
  });

  return { course: { id: course.id, title: course.title }, students };
};

module.exports = { getCourseReport };
