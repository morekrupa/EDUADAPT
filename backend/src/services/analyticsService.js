const prisma = require('../prismaClient');

const DROPOUT_THRESHOLD_DAYS = 14;
const ACTIVE_WINDOW_DAYS = 7;

const getSchoolAnalytics = async (schoolId) => {
  const now = new Date();
  const activeSince = new Date(now.getTime() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const dropoutCutoff = new Date(now.getTime() - DROPOUT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

  const usersByRole = await prisma.user.groupBy({
    by: ['role'],
    where: { schoolId },
    _count: { id: true },
  });
  const totalUsers = usersByRole.reduce((sum, r) => sum + r._count.id, 0);

  const recentSessions = await prisma.gameSession.findMany({
    where: { playedAt: { gte: activeSince }, student: { schoolId } },
    select: { studentId: true },
  });
  const activeStudentIds = new Set(recentSessions.map((s) => s.studentId));

  // NOTE: only populated where logging calls exist — currently just game session completions
  const engagementByAction = await prisma.engagementLog.groupBy({
    by: ['action'],
    where: { user: { schoolId } },
    _count: { id: true },
  });

  // PLACEHOLDER HEURISTIC: students with zero sessions in the last 14 days.
  // Replace with real model output once the AI Bridge is feeding DROPOUT_RISK
  // recommendations from Member 4's ML pipeline.
  const allStudents = await prisma.user.findMany({
    where: { schoolId, role: 'STUDENT' },
    select: { id: true, name: true, email: true },
  });

  const recentlyActive = await prisma.gameSession.findMany({
    where: { playedAt: { gte: dropoutCutoff }, student: { schoolId } },
    select: { studentId: true },
    distinct: ['studentId'],
  });
  const recentlyActiveIds = new Set(recentlyActive.map((s) => s.studentId));

  const dropoutRiskStudents = allStudents.filter((s) => !recentlyActiveIds.has(s.id));

  return {
    totalUsers,
    usersByRole: usersByRole.map((r) => ({ role: r.role, count: r._count.id })),
    activeSessions: {
      windowDays: ACTIVE_WINDOW_DAYS,
      count: recentSessions.length,
      uniqueActiveStudents: activeStudentIds.size,
    },
    engagementLogs: engagementByAction.map((e) => ({ action: e.action, count: e._count.id })),
    dropoutRisk: {
      thresholdDays: DROPOUT_THRESHOLD_DAYS,
      isPlaceholderHeuristic: true,
      flaggedCount: dropoutRiskStudents.length,
      students: dropoutRiskStudents,
    },
  };
};

module.exports = { getSchoolAnalytics };
