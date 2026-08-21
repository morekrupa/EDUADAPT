const assert = require('assert');
const { calculateDifficulty } = require('../src/services/difficultyService');
const { calculateLevel } = require('../src/services/gamificationService');
const { validateGame } = require('../src/services/gameGenerationService');

const run = (name, fn) => {
  try { fn(); console.log(`PASS: ${name}`); }
  catch (error) { console.error(`FAIL: ${name}\n${error.stack}`); process.exitCode = 1; }
};

run('new student/topic starts EASY', () => {
  assert.strictEqual(calculateDifficulty({ mastery: null }), 'EASY');
});

run('strong repeated performance can reach HARD', () => {
  const history = Array.from({ length: 10 }, () => ({ correctness: true, responseTimeSec: 20, hintUsage: false }));
  assert.strictEqual(calculateDifficulty({ mastery: { masteryScore: 0.9 }, topicHistory: history }), 'HARD');
});

run('weak performance remains EASY', () => {
  const history = Array.from({ length: 8 }, () => ({ correctness: false, responseTimeSec: 180, hintUsage: true }));
  assert.strictEqual(calculateDifficulty({ mastery: { masteryScore: 0.1 }, topicHistory: history }), 'EASY');
});

run('level thresholds are deterministic', () => {
  assert.strictEqual(calculateLevel(0), 1);
  assert.strictEqual(calculateLevel(100), 2);
  assert.strictEqual(calculateLevel(500), 4);
});

run('game validation rejects non-pixel games', () => {
  assert.throws(() => validateGame({ title: 'Bad', gameType: 'QUIZ', difficulty: 'EASY', pixelArt: false, mechanics: [{}] }));
});

run('game validation accepts a valid structured game', () => {
  const game = validateGame({ title: 'Matter Quest', gameType: 'PUZZLE', difficulty: 'EASY', pixelArt: true, mechanics: [{ prompt: 'What is matter?', correctAnswer: 'Anything with mass and volume' }] });
  assert.strictEqual(game.title, 'Matter Quest');
});
