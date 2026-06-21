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
