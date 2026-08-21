const crypto = require('crypto');
const prisma = require('../prismaClient');
const { getStudentDifficulty } = require('./difficultyService');

const FALLBACK_TYPES = ['EXPLORATION', 'SIMULATION', 'PUZZLE', 'SORTING', 'QUIZ', 'RIDDLE'];
const GAME_TYPES = new Set(['EXPLORATION', 'PUZZLE', 'SORTING', 'MATCHING', 'SIMULATION', 'DRAG_DROP', 'SCENARIO', 'QUIZ', 'RIDDLE', 'WORD_GAME']);
const DIFFICULTIES = new Set(['EASY', 'MEDIUM', 'HARD']);
const hashContent = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

const buildPrompt = ({ topic, subtopic, difficulty, syllabusVersion = '1.0' }) => `You are EDUADAPT's educational game designer. Create one interactive learning experience for the supplied syllabus content.

TOPIC: ${topic.title}
TOPIC DESCRIPTION: ${topic.description || ''}
SUBTOPIC: ${subtopic?.title || 'None'}
SUBTOPIC DESCRIPTION: ${subtopic?.description || ''}
LEARNING OBJECTIVES: ${(topic.learningObjectives || []).map((x) => x.statement).join('; ')}
DIFFICULTY: ${difficulty}
SYLLABUS VERSION: ${syllabusVersion}

Requirements:
- Teach the syllabus, not unrelated trivia.
- Use pixel-art/game-style presentation for every interface element and asset.
- Include a short educational intro/review explaining what the student just learned.
- Make interaction meaningful: the player must apply the concept, not only click through text.
- Return JSON only.
- Prefer a full game when the concept supports one; otherwise use simulation, puzzle/sorting, interactive quiz, or riddle as the last resort.
- Never invent syllabus claims that conflict with the supplied content.

JSON shape:
{
  "title": "string",
  "gameType": "EXPLORATION|PUZZLE|SORTING|MATCHING|SIMULATION|DRAG_DROP|SCENARIO|QUIZ|RIDDLE|WORD_GAME",
  "difficulty": "EASY|MEDIUM|HARD",
  "educationalObjective": "string",
  "introContent": "short educational explanation",
  "instructions": ["string"],
  "mechanics": [{"id":"string","type":"string","prompt":"string","options":["string"],"correctAnswer":"string","explanation":"string","points":10}],
  "assets": [{"type":"SPRITE|BACKGROUND|CHARACTER|ICON|ANIMATION|SOUND|UI|OTHER","name":"string","url":"string","metadata":{}}],
  "pixelArt": true
}`;

const validateGame = (game) => {
  if (!game || typeof game !== 'object') throw new Error('Invalid game response.');
  if (!game.title || !GAME_TYPES.has(game.gameType) || !DIFFICULTIES.has(game.difficulty)) throw new Error('Game response has invalid required fields.');
  if (game.pixelArt !== true) throw new Error('Generated game must use pixelArt=true.');
  if (!Array.isArray(game.mechanics) || game.mechanics.length === 0) throw new Error('Generated game must contain mechanics.');
  return game;
};

const generateWithLLM = async (prompt) => {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured.');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.7 } }),
  });
  if (!response.ok) throw new Error(`Gemini request failed with status ${response.status}.`);
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no content.');
  return JSON.parse(text);
};

const fallbackGame = ({ topic, difficulty }) => ({
  title: `${topic.title} Interactive Quiz`, gameType: 'QUIZ', difficulty,
  educationalObjective: `Review the key ideas of ${topic.title}.`,
  introContent: `Quick review: ${topic.description || `You have just studied ${topic.title}. Use the questions below to check your understanding.`}`,
  instructions: ['Read the question carefully.', 'Choose the best answer.', 'Review the explanation after answering.'],
  mechanics: [{ id: 'fallback-1', type: 'question', prompt: `What is the main idea of ${topic.title}?`, options: ['Review the lesson content first', 'Ignore the lesson', 'Choose randomly'], correctAnswer: 'Review the lesson content first', explanation: 'The activity is designed to reinforce the lesson you just studied.', points: 10 }],
  assets: [], pixelArt: true,
});

const generateGame = async ({ studentId, topicId, subtopicId = null, syllabusVersion = '1.0' }) => {
  const topic = await prisma.topic.findUnique({ where: { id: topicId }, include: { learningObjectives: true, chapter: { include: { subject: { include: { course: true } } } } } });
  if (!topic) { const e = new Error('Topic not found.'); e.statusCode = 404; throw e; }

  const subtopic = subtopicId ? await prisma.subtopic.findUnique({ where: { id: subtopicId } }) : null;
  if (subtopicId && !subtopic) { const e = new Error('Subtopic not found.'); e.statusCode = 404; throw e; }
  if (subtopic && subtopic.topicId !== topicId) { const e = new Error('Subtopic does not belong to the selected topic.'); e.statusCode = 400; throw e; }

  const difficulty = await getStudentDifficulty(studentId, topicId);
  const contentHash = hashContent({ topicId, subtopicId, difficulty, syllabusVersion, objectives: topic.learningObjectives.map((x) => x.statement), content: topic.description || '' });
  const cached = await prisma.game.findUnique({ where: { contentHash }, include: { assets: true, questions: true } });
  if (cached) return { game: cached, cached: true, generated: false };

  let generated;
  try { generated = validateGame(await generateWithLLM(buildPrompt({ topic, subtopic, difficulty, syllabusVersion }))); }
  catch (_) { generated = fallbackGame({ topic, difficulty }); }

  const data = {
    topicId, subtopicId, title: generated.title, gameType: generated.gameType, description: generated.introContent,
    educationalObjective: generated.educationalObjective, difficulty, pixelArt: true, introContent: generated.introContent,
    specification: { instructions: generated.instructions || [], mechanics: generated.mechanics || [], generatedAt: new Date().toISOString() },
    syllabusVersion, contentHash, status: 'READY', version: 1,
    assets: { create: (generated.assets || []).map((a) => ({ type: a.type, name: a.name, url: a.url, metadata: a.metadata || {} })) },
    questions: { create: (generated.mechanics || []).filter((m) => m.correctAnswer !== undefined).map((m, index) => ({ prompt: m.prompt, type: m.type || 'multiple_choice', options: m.options || [], correctAnswer: String(m.correctAnswer), explanation: m.explanation || null, difficulty, points: Number(m.points || 10), orderIndex: index })) },
  };

  try {
    const game = await prisma.game.create({ data, include: { assets: true, questions: true } });
    return { game, cached: false, generated: true, fallback: generated.gameType === 'QUIZ' };
  } catch (error) {
    // contentHash is unique: another request may have generated the same game concurrently.
    if (error.code === 'P2002') {
      const existing = await prisma.game.findUnique({ where: { contentHash }, include: { assets: true, questions: true } });
      if (existing) return { game: existing, cached: true, generated: false, concurrent: true };
    }
    throw error;
  }
};

module.exports = { FALLBACK_TYPES, hashContent, buildPrompt, validateGame, generateGame };
