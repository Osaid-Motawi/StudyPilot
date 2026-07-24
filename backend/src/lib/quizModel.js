'use strict';

const { createError } = require('../middleware/errorHandler');

const QUESTION_TYPES = ['mcq', 'fill_blank', 'essay', 'matching'];
const MATCHING_MIN_PAIRS = 3;
const MATCHING_MAX_PAIRS = 10;

/** Normalize/validate a requested question type; defaults to mcq. */
function normalizeQuestionType(value) {
  const t = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return QUESTION_TYPES.includes(t) ? t : 'mcq';
}

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

function pick(obj, camel, snake) {
  return obj[camel] != null ? obj[camel] : obj[snake];
}

/**
 * Normalize the agent's snake_case questions into stored camelCase Question
 * objects with stable ids (q1, q2, ...) for a single question type.
 * Shape per data-model.md. Each question's `type` is forced to the quiz's type.
 */
function normalizeQuestions(rawQuestions, questionType) {
  const type = normalizeQuestionType(questionType);
  if (!Array.isArray(rawQuestions)) return [];
  const questions = [];
  rawQuestions.forEach((q, i) => {
    if (!q || typeof q.prompt !== 'string') return;
    const id = `q${i + 1}`;

    if (type === 'mcq') {
      const options = Array.isArray(q.options) ? q.options.map(String) : [];
      const correctOptionIndex = pick(q, 'correctOptionIndex', 'correct_option_index');
      questions.push({
        id,
        type: 'mcq',
        prompt: q.prompt,
        options,
        correctOptionIndex: Number(correctOptionIndex),
      });
    } else if (type === 'fill_blank') {
      const expectedAnswer = pick(q, 'expectedAnswer', 'expected_answer');
      questions.push({
        id,
        type: 'fill_blank',
        prompt: q.prompt,
        expectedAnswer: expectedAnswer == null ? '' : String(expectedAnswer),
      });
    } else if (type === 'essay') {
      const referenceAnswer = pick(q, 'referenceAnswer', 'reference_answer');
      const guidance = q.guidance;
      const out = {
        id,
        type: 'essay',
        prompt: q.prompt,
        referenceAnswer: referenceAnswer == null ? '' : String(referenceAnswer),
        maxScore: 100,
      };
      if (guidance != null && String(guidance).trim()) out.guidance = String(guidance);
      questions.push(out);
    } else if (type === 'matching') {
      const leftItems = Array.isArray(pick(q, 'leftItems', 'left_items'))
        ? pick(q, 'leftItems', 'left_items').map(String)
        : [];
      const rightItems = Array.isArray(pick(q, 'rightItems', 'right_items'))
        ? pick(q, 'rightItems', 'right_items').map(String)
        : [];
      const rawPairs = pick(q, 'correctPairs', 'correct_pairs');
      const correctPairs = Array.isArray(rawPairs)
        ? rawPairs
            .filter((p) => p && p.left != null && p.right != null)
            .map((p) => ({ left: Number(p.left), right: Number(p.right) }))
        : [];
      questions.push({
        id,
        type: 'matching',
        prompt: q.prompt,
        leftItems,
        rightItems,
        correctPairs,
      });
    }
  });
  return questions;
}

/** Per-type structural validation of normalized questions. */
function questionsValid(questions, type) {
  if (!questions.length) return false;
  if (type === 'mcq') {
    return questions.every(
      (q) =>
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        q.options.length <= 5 &&
        Number.isInteger(q.correctOptionIndex) &&
        q.correctOptionIndex >= 0 &&
        q.correctOptionIndex < q.options.length
    );
  }
  if (type === 'fill_blank') {
    return questions.every(
      (q) => typeof q.expectedAnswer === 'string' && q.expectedAnswer.length > 0
    );
  }
  if (type === 'essay') {
    // referenceAnswer guides grading; prompt is the hard requirement.
    return questions.every((q) => typeof q.prompt === 'string' && q.prompt.length > 0);
  }
  if (type === 'matching') {
    return questions.every(
      (q) =>
        Array.isArray(q.leftItems) &&
        Array.isArray(q.rightItems) &&
        Array.isArray(q.correctPairs) &&
        q.leftItems.length >= MATCHING_MIN_PAIRS &&
        q.leftItems.length <= MATCHING_MAX_PAIRS &&
        q.rightItems.length >= MATCHING_MIN_PAIRS &&
        q.rightItems.length <= MATCHING_MAX_PAIRS &&
        q.correctPairs.length >= MATCHING_MIN_PAIRS &&
        q.correctPairs.length <= MATCHING_MAX_PAIRS &&
        q.correctPairs.every(
          (p) =>
            Number.isInteger(p.left) &&
            Number.isInteger(p.right) &&
            p.left >= 0 &&
            p.left < q.leftItems.length &&
            p.right >= 0 &&
            p.right < q.rightItems.length
        )
    );
  }
  return false;
}

/**
 * Build a persisted Quiz doc from the agent response (does NOT persist).
 * One question type per quiz (002). Validates the type-specific answer material
 * is present and well-formed; otherwise surfaces a retryable 502.
 */
function buildQuizDoc({ id, uid, agentResult, sourceType, sourceText, title, questionType }) {
  const type = normalizeQuestionType(questionType);
  const questions = normalizeQuestions(agentResult && agentResult.questions, type);

  if (!questionsValid(questions, type)) {
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

  const allowedSource = ['pasted', 'upload', 'image'];
  return {
    id,
    ownerId: uid,
    title: String(chosenTitle).slice(0, 200),
    sourceType: allowedSource.includes(sourceType) ? sourceType : 'pasted',
    sourceText: sourceText || '',
    questionType: type,
    questions,
    createdAt: new Date(),
  };
}

/**
 * Answers-hidden "taking view" (anti-cheat): strips all answer material
 * (correctOptionIndex, expectedAnswer, referenceAnswer, correctPairs) while
 * keeping type-specific presentation fields. Shape per backend-api.md.
 */
function buildTakingView(quiz) {
  const type = normalizeQuestionType(quiz.questionType);
  return {
    id: quiz.id,
    title: quiz.title,
    sourceType: quiz.sourceType,
    questionType: type,
    createdAt: toIso(quiz.createdAt),
    questions: (quiz.questions || []).map((q) => {
      const base = { id: q.id, type: q.type, prompt: q.prompt };
      if (q.type === 'mcq') {
        base.options = q.options || [];
      } else if (q.type === 'matching') {
        base.leftItems = q.leftItems || [];
        base.rightItems = q.rightItems || [];
      } else if (q.type === 'essay' && q.guidance) {
        base.guidance = q.guidance;
      }
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
    questionType: normalizeQuestionType(quiz.questionType),
    questionCount: Array.isArray(quiz.questions) ? quiz.questions.length : 0,
    createdAt: toIso(quiz.createdAt),
  };
}

module.exports = {
  toIso,
  normalizeQuestionType,
  normalizeQuestions,
  buildQuizDoc,
  buildTakingView,
  buildQuizListItem,
  QUESTION_TYPES,
  MATCHING_MIN_PAIRS,
  MATCHING_MAX_PAIRS,
};
