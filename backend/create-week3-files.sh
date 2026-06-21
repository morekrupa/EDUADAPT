#!/bin/bash
# Run this from inside your backend/ folder:
#   bash create-week3-files.sh

set -e

mkdir -p src/services src/controllers src/routes scripts

# ---------- src/services/progressService.js ----------
cat > src/services/progressService.js << 'EOF'
// Called inside a transaction (tx) from gameSessionService.
// Computes a true rolling average of accuracy, not a re-sum of all sessions —
// cheaper, and avoids re-reading full session history on every play.
const upsertStudentProgress = async (tx, { studentId, lessonId, accuracy }) => {
  const existing = await tx.studentProgress.findUnique({
    where: { studentId_lessonId: { studentId, lessonId } },
  });

  if (!existing) {
    return tx.studentProgress.create({
      data: { studentId, lessonId, masteryScore: accuracy, attempts: 1 },
    });
  }

  const newAttempts = existing.attempts + 1;
  const newMastery = (existing.masteryScore * existing.attempts + accuracy) / newAttempts;

  return tx.studentProgress.update({
    where: { studentId_lessonId: { studentId, lessonId } },
    data: { masteryScore: newMastery, attempts: newAttempts },
  });
};

module.exports = { upsertStudentProgress };
EOF

# ---------- src/services/leaderboardService.js ----------
cat > src/services/leaderboardService.js << 'EOF'
// Called inside a transaction (tx) from gameSessionService.
const recalculateLeaderboard = async (tx, { studentId, courseId }) => {
  // Aggregation query: sum this student's scores across all lessons in this course
  const agg = await tx.gameSession.aggregate({
    where: { studentId, lesson: { courseId } },
    _sum: { score: true },
  });
  const totalPoints = agg._sum.score || 0;

  await tx.leaderboard.upsert({
    where: { studentId_courseId: { studentId, courseId } },
    update: { totalPoints },
    create: { studentId, courseId, totalPoints, rank: 0 },
  });

  // Re-rank everyone in this course's leaderboard, highest points first
  const entries = await tx.leaderboard.findMany({
    where: { courseId },
    orderBy: { totalPoints: 'desc' },
  });

  for (let i = 0; i < entries.length; i++) {
    const correctRank = i + 1;
    if (entries[i].rank !== correctRank) {
      await tx.leaderboard.update({
        where: { id: entries[i].id },
        data: { rank: correctRank },
      });
    }
  }

  return tx.leaderboard.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
  });
};

module.exports = { recalculateLeaderboard };
EOF

# ---------- src/services/badgeService.js ----------
cat > src/services/badgeService.js << 'EOF'
const prisma = require('../prismaClient');

// ASSUMPTION: Badge.criteria is a free-text field, so this is a simple
// "TYPE:VALUE" convention invented for now. Update this parser if your
// team settles on a different format.
//   "SESSIONS:10"   -> total game sessions for the student >= 10
//   "MASTERY:90"    -> any single lesson's masteryScore >= 90
//   "POINTS:500"    -> sum of leaderboard totalPoints (all courses) >= 500
//   "PERFECT_SCORE" -> any single game session with accuracy === 100
const evaluateCriteria = async (studentId, criteria) => {
  const [type, valueStr] = criteria.split(':').map((s) => s.trim());
  const value = valueStr ? Number(valueStr) : null;

  switch (type) {
    case 'SESSIONS': {
      const count = await prisma.gameSession.count({ where: { studentId } });
      return count >= value;
    }
    case 'MASTERY': {
      const match = await prisma.studentProgress.findFirst({
        where: { studentId, masteryScore: { gte: value } },
      });
      return Boolean(match);
    }
    case 'POINTS': {
      const agg = await prisma.leaderboard.aggregate({
        where: { studentId },
        _sum: { totalPoints: true },
      });
      return (agg._sum.totalPoints || 0) >= value;
    }
    case 'PERFECT_SCORE': {
      const match = await prisma.gameSession.findFirst({
        where: { studentId, accuracy: 100 },
      });
      return Boolean(match);
    }
    default:
      return false;
  }
};

const checkAndAwardBadges = async (studentId) => {
  const allBadges = await prisma.badge.findMany();

  const alreadyAwarded = await prisma.userBadge.findMany({
    where: { userId: studentId },
    select: { badgeId: true },
  });
  const awardedIds = new Set(alreadyAwarded.map((ub) => ub.badgeId));

  const newlyAwarded = [];

  for (const badge of allBadges) {
    if (awardedIds.has(badge.id)) continue;

    const earned = await evaluateCriteria(studentId, badge.criteria);
    if (!earned) continue;

    try {
      await prisma.userBadge.create({
        data: { userId: studentId, badgeId: badge.id },
      });
      newlyAwarded.push(badge);
    } catch (error) {
      // P2002 = unique constraint hit, meaning a concurrent request already
      // awarded this badge — safe to ignore, not a real failure
      if (error.code !== 'P2002') throw error;
    }
  }

  return newlyAwarded;
};

module.exports = { checkAndAwardBadges };
EOF

# ---------- src/services/gameSessionService.js ----------
cat > src/services/gameSessionService.js << 'EOF'
const prisma = require('../prismaClient');
const { upsertStudentProgress } = require('./progressService');
const { recalculateLeaderboard } = require('./leaderboardService');

const validateLessonAndEnrollment = async (studentId, lessonId) => {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) {
    const err = new Error('Lesson not found.');
    err.statusCode = 404;
    throw err;
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId: lesson.courseId } },
  });
  if (!enrollment) {
    const err = new Error('You must be enrolled in this course to submit a game session.');
    err.statusCode = 403;
    throw err;
  }

  return lesson;
};

const saveGameSession = async ({
  studentId,
  lessonId,
  score,
  accuracy,
  timeSpentSec,
  difficultyLevel,
}) => {
  const lesson = await validateLessonAndEnrollment(studentId, lessonId);

  // Atomic: if any write fails, nothing is saved — keeps session,
  // progress, and leaderboard always in sync with each other
  return prisma.$transaction(async (tx) => {
    const session = await tx.gameSession.create({
      data: { studentId, lessonId, score, accuracy, timeSpentSec, difficultyLevel },
    });

    const progress = await upsertStudentProgress(tx, { studentId, lessonId, accuracy });

    const leaderboardEntry = await recalculateLeaderboard(tx, {
      studentId,
      courseId: lesson.courseId,
    });

    return { session, progress, leaderboardEntry };
  });
};

module.exports = { saveGameSession };
EOF

# ---------- src/services/studentDataService.js ----------
cat > src/services/studentDataService.js << 'EOF'
const prisma = require('../prismaClient');

const getSessionsForStudent = async (studentId) => {
  return prisma.gameSession.findMany({
    where: { studentId },
    include: {
      lesson: { select: { id: true, title: true, courseId: true } },
    },
    orderBy: { playedAt: 'desc' },
  });
};

const getProgressForStudent = async (studentId) => {
  return prisma.studentProgress.findMany({
    where: { studentId },
    include: {
      lesson: { select: { id: true, title: true, courseId: true } },
    },
    orderBy: { lastUpdated: 'desc' },
  });
};

module.exports = { getSessionsForStudent, getProgressForStudent };
EOF

# ---------- src/controllers/gameSessionController.js ----------
cat > src/controllers/gameSessionController.js << 'EOF'
const gameSessionService = require('../services/gameSessionService');
const badgeService = require('../services/badgeService');

const saveSession = async (req, res) => {
  try {
    const { lessonId, score, accuracy, timeSpentSec, difficultyLevel } = req.body;

    if (
      !lessonId ||
      score === undefined ||
      accuracy === undefined ||
      timeSpentSec === undefined ||
      difficultyLevel === undefined
    ) {
      return res.status(400).json({
        error: 'lessonId, score, accuracy, timeSpentSec, and difficultyLevel are all required.',
      });
    }

    if (accuracy < 0 || accuracy > 100) {
      return res.status(400).json({ error: 'accuracy must be between 0 and 100.' });
    }

    const result = await gameSessionService.saveGameSession({
      studentId: req.user.userId,
      lessonId,
      score,
      accuracy,
      timeSpentSec,
      difficultyLevel,
    });

    // Runs after the transaction commits — badge awarding doesn't need to be
    // atomic with the session save itself
    const newBadges = await badgeService.checkAndAwardBadges(req.user.userId);

    return res.status(201).json({
      message: 'Game session saved.',
      session: result.session,
      progress: result.progress,
      leaderboard: result.leaderboardEntry,
      newBadges,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to save game session.' });
  }
};

module.exports = { saveSession };
EOF

# ---------- src/controllers/studentController.js ----------
cat > src/controllers/studentController.js << 'EOF'
const prisma = require('../prismaClient');
const studentDataService = require('../services/studentDataService');

// A STUDENT can only view their own data.
// A TEACHER/ADMIN can view any student who belongs to their own school.
const ensureAccess = async (req, targetStudentId) => {
  if (req.user.role === 'STUDENT') {
    if (req.user.userId !== targetStudentId) {
      const err = new Error('Students can only view their own data.');
      err.statusCode = 403;
      throw err;
    }
    return;
  }

  const target = await prisma.user.findUnique({ where: { id: targetStudentId } });
  if (!target || target.role !== 'STUDENT' || target.schoolId !== req.user.schoolId) {
    const err = new Error('Student not found in your school.');
    err.statusCode = 404;
    throw err;
  }
};

const getSessions = async (req, res) => {
  try {
    const { id } = req.params;
    await ensureAccess(req, id);

    const sessions = await studentDataService.getSessionsForStudent(id);
    return res.status(200).json({ sessions });
  } catch (error) {
    console.error(error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to fetch sessions.' });
  }
};

const getProgress = async (req, res) => {
  try {
    const { id } = req.params;
    await ensureAccess(req, id);

    const progress = await studentDataService.getProgressForStudent(id);
    return res.status(200).json({ progress });
  } catch (error) {
    console.error(error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to fetch progress.' });
  }
};

module.exports = { getSessions, getProgress };
EOF

# ---------- src/routes/gameRoutes.js ----------
cat > src/routes/gameRoutes.js << 'EOF'
const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const gameSessionController = require('../controllers/gameSessionController');

router.post('/session', verifyToken, checkRole('STUDENT'), gameSessionController.saveSession);

module.exports = router;
EOF

# ---------- src/routes/studentDataRoutes.js ----------
cat > src/routes/studentDataRoutes.js << 'EOF'
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const studentController = require('../controllers/studentController');

router.get('/:id/sessions', verifyToken, studentController.getSessions);
router.get('/:id/progress', verifyToken, studentController.getProgress);

module.exports = router;
EOF

# ---------- scripts/seedBadges.js ----------
cat > scripts/seedBadges.js << 'EOF'
// Run once from your backend/ folder:
//   node scripts/seedBadges.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const badges = [
  {
    name: 'First Steps',
    description: 'Complete your first game session',
    iconUrl: 'https://placehold.co/64x64?text=1',
    criteria: 'SESSIONS:1',
  },
  {
    name: 'Dedicated Learner',
    description: 'Complete 10 game sessions',
    iconUrl: 'https://placehold.co/64x64?text=10',
    criteria: 'SESSIONS:10',
  },
  {
    name: 'Lesson Master',
    description: 'Reach 90% mastery on any lesson',
    iconUrl: 'https://placehold.co/64x64?text=M',
    criteria: 'MASTERY:90',
  },
  {
    name: 'High Scorer',
    description: 'Earn 500 total leaderboard points',
    iconUrl: 'https://placehold.co/64x64?text=500',
    criteria: 'POINTS:500',
  },
  {
    name: 'Perfectionist',
    description: 'Score 100% accuracy in a single session',
    iconUrl: 'https://placehold.co/64x64?text=P',
    criteria: 'PERFECT_SCORE',
  },
];

async function main() {
  for (const badge of badges) {
    const existing = await prisma.badge.findFirst({ where: { name: badge.name } });
    if (existing) {
      console.log(`Skipping "${badge.name}" — already exists.`);
      continue;
    }
    await prisma.badge.create({ data: badge });
    console.log(`Created badge: ${badge.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
EOF

echo "Done. Created:"
echo "  src/services/progressService.js"
echo "  src/services/leaderboardService.js"
echo "  src/services/badgeService.js"
echo "  src/services/gameSessionService.js"
echo "  src/services/studentDataService.js"
echo "  src/controllers/gameSessionController.js"
echo "  src/controllers/studentController.js"
echo "  src/routes/gameRoutes.js"
echo "  src/routes/studentDataRoutes.js"
echo "  scripts/seedBadges.js"
