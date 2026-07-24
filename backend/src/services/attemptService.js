'use strict';

const { getDb } = require('../clients/firestoreClient');
const agentClient = require('../clients/agentClient');
const { scoreMcq, scoreMatching } = require('../lib/scoring');
const { toIso, normalizeQuestionType } = require('../lib/quizModel');
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
    questionType: attempt.questionType,
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
 * Grade an attempt with type-aware dispatch:
 *   - mcq, matching  -> deterministic backend scoring (lib/scoring.js)
 *   - fill_blank     -> agent /grade-short-answer
 *   - essay          -> agent /grade-essay (score 0-100 + feedback)
 *
 * Persist under users/{uid}/attempts/{attemptId} and return the graded result.
 * On agent failure the error propagates and NOTHING is persisted (persistence
 * happens only after all grading succeeds — carried-over resilience).
 */
async function submitAttempt({ uid, quizId, answers }) {
  const quizSnap = await usersDoc(uid).collection('quizzes').doc(quizId).get();
  if (!quizSnap.exists) {
    throw createError(404, 'not_found', 'Quiz not found.');
  }
  const quiz = { id: quizSnap.id, ...quizSnap.data() };
  const type = normalizeQuestionType(quiz.questionType);

  const submittedByQuestion = new Map();
  (Array.isArray(answers) ? answers : []).forEach((a) => {
    if (a && a.questionId != null) submittedByQuestion.set(a.questionId, a);
  });

  const results = [];
  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];

  // Accumulators. Semantics differ by type; scorePercent is authoritative.
  let correctUnits = 0; // mcq/fill_blank: correct questions; matching: correct pairs
  let totalUnits = 0; // mcq/fill_blank: questions; matching: pairs
  let essayScoreSum = 0; // essay: sum of per-question questionScore

  for (const q of questions) {
    const submitted = submittedByQuestion.get(q.id);

    if (type === 'mcq') {
      const idx = submitted && submitted.mcqOptionIndex != null ? submitted.mcqOptionIndex : null;
      const isCorrect = scoreMcq(q, idx);
      if (isCorrect) correctUnits += 1;
      totalUnits += 1;
      results.push({
        questionId: q.id,
        type: 'mcq',
        userAnswer: idx,
        isCorrect,
        correctAnswer: q.options[q.correctOptionIndex],
      });
    } else if (type === 'matching') {
      const pairs = submitted && Array.isArray(submitted.pairs) ? submitted.pairs : null;
      const { correctCount, totalPairs } = scoreMatching(q, pairs);
      correctUnits += correctCount;
      totalUnits += totalPairs;
      results.push({
        questionId: q.id,
        type: 'matching',
        userAnswer: pairs,
        isCorrect: totalPairs > 0 && correctCount === totalPairs,
        correctCount,
        totalPairs,
        correctPairs: q.correctPairs,
      });
    } else if (type === 'fill_blank') {
      const userText = submitted && submitted.text != null ? String(submitted.text) : '';
      let isCorrect = false;
      let rationale = '';
      if (userText.trim() === '') {
        rationale = 'No answer was provided.';
      } else {
        const verdict = await agentClient.gradeFillBlank({
          question: q.prompt,
          expectedAnswer: q.expectedAnswer,
          userAnswer: userText,
        });
        isCorrect = !!verdict.isCorrect;
        rationale = verdict.rationale || '';
      }
      if (isCorrect) correctUnits += 1;
      totalUnits += 1;
      results.push({
        questionId: q.id,
        type: 'fill_blank',
        userAnswer: userText === '' ? null : userText,
        isCorrect,
        correctAnswer: q.expectedAnswer,
        rationale,
      });
    } else if (type === 'essay') {
      const userText = submitted && submitted.text != null ? String(submitted.text) : '';
      let questionScore = 0;
      let feedback = '';
      if (userText.trim() === '') {
        questionScore = 0;
        feedback = 'No answer was provided.';
      } else {
        const verdict = await agentClient.gradeEssay({
          question: q.prompt,
          referenceAnswer: q.referenceAnswer,
          userAnswer: userText,
        });
        questionScore = verdict.score;
        feedback = verdict.feedback || '';
      }
      essayScoreSum += questionScore;
      totalUnits += 1; // question count for essay
      results.push({
        questionId: q.id,
        type: 'essay',
        userAnswer: userText === '' ? null : userText,
        questionScore,
        feedback,
        isCorrect: questionScore >= 50,
        correctAnswer: q.referenceAnswer,
      });
    }
  }

  // Compute the unified score + scorePercent per data-model.md.
  let score;
  let totalQuestions;
  let scorePercent;
  if (type === 'essay') {
    const nQuestions = questions.length;
    const mean = nQuestions ? essayScoreSum / nQuestions : 0;
    score = Math.round(mean); // attempt score = mean of per-question questionScore
    scorePercent = Math.round(mean);
    totalQuestions = nQuestions;
  } else {
    score = correctUnits; // correct count (questions, or pairs for matching)
    totalQuestions = totalUnits; // question count (or pair count for matching)
    scorePercent = totalUnits ? Math.round((correctUnits / totalUnits) * 100) : 0;
  }

  const ref = usersDoc(uid).collection('attempts').doc();
  const attempt = {
    id: ref.id,
    ownerId: uid,
    quizId,
    questionType: type,
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
  items.sort((x, y) => String(y.submittedAt || '').localeCompare(String(x.submittedAt || '')));
  return items;
}

/** Return one attempt in full, or null if not owned by uid. */
async function getAttempt({ uid, attemptId }) {
  const snap = await usersDoc(uid).collection('attempts').doc(attemptId).get();
  if (!snap.exists) return null;
  return formatAttempt({ id: snap.id, ...snap.data() });
}

module.exports = { submitAttempt, listAttempts, getAttempt, formatAttempt };
