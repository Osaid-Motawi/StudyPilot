'use strict';

const { getDb } = require('../clients/firestoreClient');
const agentClient = require('../clients/agentClient');
const {
  buildQuizDoc,
  buildTakingView,
  buildQuizListItem,
  normalizeQuestionType,
  MATCHING_MIN_PAIRS,
  MATCHING_MAX_PAIRS,
} = require('../lib/quizModel');
const { createError } = require('../middleware/errorHandler');

// Minimum amount of study material (trimmed chars) needed to attempt generation.
const MIN_MATERIAL_LENGTH = 10;

function quizzesCol(uid) {
  return getDb().collection('users').doc(uid).collection('quizzes');
}

/**
 * Resolve the requested question count. For matching, num_questions is the pair
 * count and is clamped to 3–10 (FR-011). For other types it is passed through
 * (the agent applies its own default when omitted).
 */
function resolveNumQuestions(questionType, numQuestions) {
  const n = Number(numQuestions);
  if (questionType === 'matching') {
    if (!Number.isFinite(n)) return MATCHING_MIN_PAIRS;
    return Math.max(MATCHING_MIN_PAIRS, Math.min(MATCHING_MAX_PAIRS, Math.trunc(n)));
  }
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : undefined;
}

/**
 * Validate sufficiency, call the agent, persist under
 * users/{uid}/quizzes/{quizId}, and return the answers-hidden taking view.
 *
 * @param {object} args
 * @param {string} [args.text] - study text (pasted or extracted PDF/.txt).
 * @param {string} args.sourceType - 'pasted' | 'upload'.
 * @param {string} [args.questionType] - mcq | fill_blank | essay | matching.
 * @param {number} [args.numQuestions]
 */
async function createQuiz({ uid, text, sourceType, title, questionType, numQuestions }) {
  const type = normalizeQuestionType(questionType);
  const num = resolveNumQuestions(type, numQuestions);

  const material = typeof text === 'string' ? text.trim() : '';
  if (material.length < MIN_MATERIAL_LENGTH) {
    throw createError(
      422,
      'insufficient_material',
      'Please provide more study material — there is not enough content to generate a quiz.'
    );
  }

  const agentResult = await agentClient.generateQuiz({
    text: material,
    questionType: type,
    numQuestions: num,
  });

  const ref = quizzesCol(uid).doc();
  const quiz = buildQuizDoc({
    id: ref.id,
    uid,
    agentResult,
    sourceType,
    sourceText: material,
    title,
    questionType: type,
  });

  await ref.set(quiz);
  return buildTakingView(quiz);
}

/** Return the answers-hidden taking view, or null if not owned by uid. */
async function getQuizForTaking({ uid, quizId }) {
  const snap = await quizzesCol(uid).doc(quizId).get();
  if (!snap.exists) return null;
  return buildTakingView({ id: snap.id, ...snap.data() });
}

/** Return the raw persisted quiz (WITH answers) for grading, or null. */
async function getQuizRaw({ uid, quizId }) {
  const snap = await quizzesCol(uid).doc(quizId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

/** List the user's quizzes (metadata), newest first. */
async function listQuizzes({ uid }) {
  const snap = await quizzesCol(uid).get();
  const items = snap.docs.map((d) => buildQuizListItem({ id: d.id, ...d.data() }));
  items.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return items;
}

module.exports = {
  createQuiz,
  getQuizForTaking,
  getQuizRaw,
  listQuizzes,
  MIN_MATERIAL_LENGTH,
};
