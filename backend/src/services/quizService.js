'use strict';

const { getDb } = require('../clients/firestoreClient');
const agentClient = require('../clients/agentClient');
const { buildQuizDoc, buildTakingView, buildQuizListItem } = require('../lib/quizModel');
const { createError } = require('../middleware/errorHandler');

// Minimum amount of study material (trimmed chars) needed to attempt generation.
const MIN_MATERIAL_LENGTH = 10;

function quizzesCol(uid) {
  return getDb().collection('users').doc(uid).collection('quizzes');
}

/**
 * Validate sufficiency, call the agent, persist under
 * users/{uid}/quizzes/{quizId}, and return the answers-hidden taking view.
 */
async function createQuiz({ uid, text, sourceType, title, numMcq, numShort }) {
  const material = typeof text === 'string' ? text.trim() : '';
  if (material.length < MIN_MATERIAL_LENGTH) {
    throw createError(
      422,
      'insufficient_material',
      'Please provide more study material — there is not enough content to generate a quiz.'
    );
  }

  const agentResult = await agentClient.generateQuiz(material, { numMcq, numShort });

  const ref = quizzesCol(uid).doc();
  const quiz = buildQuizDoc({
    id: ref.id,
    uid,
    agentResult,
    sourceType,
    sourceText: material,
    title,
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
