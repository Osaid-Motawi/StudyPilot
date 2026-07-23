'use strict';

const { createError } = require('../middleware/errorHandler');

/**
 * Convert a Firestore Timestamp / Date / ISO string to an ISO string.
 */
function toIso(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  return null;
}

/**
 * Normalize the agent's snake_case questions into stored camelCase Question
 * objects with stable ids (q1, q2, ...). Shape per data-model.md.
 */
function normalizeQuestions(rawQuestions) {
  if (!Array.isArray(rawQuestions)) return [];
  const questions = [];
  rawQuestions.forEach((q, i) => {
    if (!q || typeof q.prompt !== 'string') return;
    const id = `q${i + 1}`;
    if (q.type === 'mcq') {
      const options = Array.isArray(q.options) ? q.options.map(String) : [];
      const correctOptionIndex =
        q.correctOptionIndex != null ? q.correctOptionIndex : q.correct_option_index;
      questions.push({
        id,
        type: 'mcq',
        prompt: q.prompt,
        options,
        correctOptionIndex: Number(correctOptionIndex),
      });
    } else if (q.type === 'short_answer') {
      const expectedAnswer =
        q.expectedAnswer != null ? q.expectedAnswer : q.expected_answer;
      questions.push({
        id,
        type: 'short_answer',
        prompt: q.prompt,
        expectedAnswer: expectedAnswer == null ? '' : String(expectedAnswer),
      });
    }
  });
  return questions;
}

/**
 * Build a persisted Quiz doc from the agent response (does NOT persist).
 * Validates FR-010/FR-011: >=1 MCQ and >=1 short-answer, MCQ has options +
 * a valid correct index, short-answer has an expected answer.
 */
function buildQuizDoc({ id, uid, agentResult, sourceType, sourceText, title }) {
  const questions = normalizeQuestions(agentResult && agentResult.questions);
  const hasMcq = questions.some((q) => q.type === 'mcq');
  const hasShort = questions.some((q) => q.type === 'short_answer');

  const mcqValid = questions
    .filter((q) => q.type === 'mcq')
    .every(
      (q) =>
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        Number.isInteger(q.correctOptionIndex) &&
        q.correctOptionIndex >= 0 &&
        q.correctOptionIndex < q.options.length
    );
  const shortValid = questions
    .filter((q) => q.type === 'short_answer')
    .every((q) => typeof q.expectedAnswer === 'string' && q.expectedAnswer.length > 0);

  if (!questions.length || !hasMcq || !hasShort || !mcqValid || !shortValid) {
    throw createError(
      502,
      'generation_failed',
      'Quiz generation failed to produce a usable quiz. Please try again.'
    );
  }

  const chosenTitle =
    (typeof title === 'string' && title.trim()) ||
    (agentResult && typeof agentResult.title === 'string' && agentResult.title.trim()) ||
    'Untitled Quiz';

  return {
    id,
    ownerId: uid,
    title: String(chosenTitle).slice(0, 200),
    sourceType: sourceType === 'upload' ? 'upload' : 'pasted',
    sourceText,
    questions,
    createdAt: new Date(),
  };
}

/**
 * Answers-hidden "taking view" (anti-cheat): strips correctOptionIndex and
 * expectedAnswer. Shape per backend-api.md.
 */
function buildTakingView(quiz) {
  return {
    id: quiz.id,
    title: quiz.title,
    sourceType: quiz.sourceType,
    createdAt: toIso(quiz.createdAt),
    questions: (quiz.questions || []).map((q) => {
      const base = { id: q.id, type: q.type, prompt: q.prompt };
      if (q.type === 'mcq') base.options = q.options || [];
      return base;
    }),
  };
}

/** List-view metadata for a quiz. */
function buildQuizListItem(quiz) {
  return {
    id: quiz.id,
    title: quiz.title,
    sourceType: quiz.sourceType,
    questionCount: Array.isArray(quiz.questions) ? quiz.questions.length : 0,
    createdAt: toIso(quiz.createdAt),
  };
}

module.exports = {
  toIso,
  normalizeQuestions,
  buildQuizDoc,
  buildTakingView,
  buildQuizListItem,
};
