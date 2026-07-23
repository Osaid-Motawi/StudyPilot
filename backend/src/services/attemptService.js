'use strict';

const { getDb } = require('../clients/firestoreClient');
const agentClient = require('../clients/agentClient');
const { scoreMcq } = require('../lib/mcqScoring');
const { toIso } = require('../lib/quizModel');
const { createError } = require('../middleware/errorHandler');

function usersDoc(uid) {
  return getDb().collection('users').doc(uid);
}

/**
 * Format a persisted attempt into the API result body (backend-api.md).
 * Optionally include quizTitle (list view only).
 */
function formatAttempt(attempt, quizTitle) {
  const out = {
    id: attempt.id,
    quizId: attempt.quizId,
    submittedAt: toIso(attempt.submittedAt),
    score: attempt.score,
    totalQuestions: attempt.totalQuestions,
    scorePercent: attempt.scorePercent,
    answers: attempt.answers,
  };
  if (quizTitle !== undefined) out.quizTitle = quizTitle;
  return out;
}

/**
 * Load quiz, score MCQs deterministically, grade short-answers via the agent,
 * compute the score, persist under users/{uid}/attempts/{attemptId}, and return
 * the graded result. On agent failure the error propagates and NOTHING is
 * persisted (persistence happens only after all grading succeeds).
 */
async function submitAttempt({ uid, quizId, answers }) {
  const quizSnap = await usersDoc(uid).collection('quizzes').doc(quizId).get();
  if (!quizSnap.exists) {
    throw createError(404, 'not_found', 'Quiz not found.');
  }
  const quiz = { id: quizSnap.id, ...quizSnap.data() };

  const submittedByQuestion = new Map();
  (Array.isArray(answers) ? answers : []).forEach((a) => {
    if (a && a.questionId != null) submittedByQuestion.set(a.questionId, a);
  });

  const results = [];
  let score = 0;

  for (const q of quiz.questions) {
    const submitted = submittedByQuestion.get(q.id);

    if (q.type === 'mcq') {
      const idx =
        submitted && submitted.mcqOptionIndex != null ? submitted.mcqOptionIndex : null;
      const isCorrect = scoreMcq(q, idx);
      if (isCorrect) score += 1;
      results.push({
        questionId: q.id,
        type: 'mcq',
        userAnswer: idx,
        isCorrect,
        correctAnswer: q.options[q.correctOptionIndex],
      });
    } else {
      const userText =
        submitted && submitted.text != null ? String(submitted.text) : '';
      let isCorrect = false;
      let rationale = '';
      if (userText.trim() === '') {
        // Unanswered -> incorrect, no agent call (FR-016).
        rationale = 'No answer was provided.';
      } else {
        const verdict = await agentClient.gradeShortAnswer({
          question: q.prompt,
          expectedAnswer: q.expectedAnswer,
          userAnswer: userText,
        });
        isCorrect = !!verdict.isCorrect;
        rationale = verdict.rationale || '';
      }
      if (isCorrect) score += 1;
      results.push({
        questionId: q.id,
        type: 'short_answer',
        userAnswer: userText === '' ? null : userText,
        isCorrect,
        correctAnswer: q.expectedAnswer,
        rationale,
      });
    }
  }

  const totalQuestions = quiz.questions.length;
  const scorePercent = totalQuestions ? Math.round((score / totalQuestions) * 100) : 0;

  const ref = usersDoc(uid).collection('attempts').doc();
  const attempt = {
    id: ref.id,
    ownerId: uid,
    quizId,
    submittedAt: new Date(),
    score,
    totalQuestions,
    scorePercent,
    answers: results,
  };
  await ref.set(attempt);

  return formatAttempt(attempt);
}

/** List the user's attempts (optionally filtered by quizId), newest first. */
async function listAttempts({ uid, quizId }) {
  const attemptsSnap = await usersDoc(uid).collection('attempts').get();
  let attempts = attemptsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (quizId) attempts = attempts.filter((a) => a.quizId === quizId);

  // Resolve quiz titles for the list view.
  const quizzesSnap = await usersDoc(uid).collection('quizzes').get();
  const titleById = new Map();
  quizzesSnap.docs.forEach((d) => titleById.set(d.id, (d.data() || {}).title));

  const items = attempts.map((a) => formatAttempt(a, titleById.get(a.quizId) || null));
  items.sort((x, y) =>
    String(y.submittedAt || '').localeCompare(String(x.submittedAt || ''))
  );
  return items;
}

/** Return one attempt in full, or null if not owned by uid. */
async function getAttempt({ uid, attemptId }) {
  const snap = await usersDoc(uid).collection('attempts').doc(attemptId).get();
  if (!snap.exists) return null;
  return formatAttempt({ id: snap.id, ...snap.data() });
}

module.exports = { submitAttempt, listAttempts, getAttempt, formatAttempt };
