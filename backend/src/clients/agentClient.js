'use strict';

const { createError } = require('../middleware/errorHandler');

/**
 * Agent client seam. Wraps the backend -> agent REST contract
 * (contracts/agent-api.md). Uses global fetch (Node 20+). The fetch
 * implementation is injectable so tests never touch the network.
 */

let _fetch = (...args) => globalThis.fetch(...args);

/** Test seam: substitute the fetch implementation. */
function setFetch(fn) {
  _fetch = fn;
}

function baseUrl() {
  return process.env.AGENT_BASE_URL || 'http://localhost:8001';
}

async function postJson(path, body) {
  let res;
  try {
    res = await _fetch(`${baseUrl()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (_e) {
    throw createError(
      502,
      'agent_unavailable',
      'The AI service is temporarily unavailable. Please try again.'
    );
  }
  if (!res.ok) {
    if (res.status === 504) {
      throw createError(504, 'agent_timeout', 'The AI service timed out. Please try again.');
    }
    throw createError(502, 'agent_error', 'The AI service failed. Please try again.');
  }
  return res.json();
}

/**
 * POST {AGENT_BASE_URL}/generate-quiz  (002: type-aware, text only)
 *
 * @param {object} args
 * @param {string} [args.text] - study text (pasted or backend-extracted PDF/.txt).
 * @param {string} [args.questionType] - mcq | fill_blank | essay | matching.
 * @param {number} [args.numQuestions] - question count (pairs for matching).
 * @returns {Promise<{title:string, question_type:string, questions:Array}>} raw agent response (snake_case).
 */
async function generateQuiz({ text, questionType, numQuestions } = {}) {
  const body = { question_type: questionType || 'mcq', text };
  const n = Number(numQuestions);
  if (Number.isFinite(n) && n > 0) body.num_questions = Math.trunc(n);
  return postJson('/generate-quiz', body);
}

/**
 * POST {AGENT_BASE_URL}/grade-short-answer
 * @returns {Promise<{isCorrect:boolean, rationale:string}>}
 */
async function gradeShortAnswer({ question, expectedAnswer, userAnswer }) {
  const data = await postJson('/grade-short-answer', {
    question,
    expected_answer: expectedAnswer,
    user_answer: userAnswer,
  });
  return { isCorrect: !!data.is_correct, rationale: data.rationale || '' };
}

/**
 * fill_blank grading REUSES the /grade-short-answer endpoint (agent-api.md).
 * Kept as a distinct name so the attempt service dispatches by type clearly.
 */
async function gradeFillBlank(args) {
  return gradeShortAnswer(args);
}

/**
 * POST {AGENT_BASE_URL}/grade-essay
 * @param {object} args
 * @param {string} args.question
 * @param {string} [args.referenceAnswer]
 * @param {string} args.userAnswer
 * @returns {Promise<{score:number, feedback:string}>} score 0-100.
 */
async function gradeEssay({ question, referenceAnswer, userAnswer }) {
  const data = await postJson('/grade-essay', {
    question,
    reference_answer: referenceAnswer == null ? '' : referenceAnswer,
    user_answer: userAnswer == null ? '' : userAnswer,
  });
  let score = Number(data.score);
  if (!Number.isFinite(score)) score = 0;
  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, feedback: data.feedback || '' };
}

/**
 * POST {AGENT_BASE_URL}/chat  (US2/US4 — general or content-grounded chat).
 * Stub wired for later feature slices; the backend supplies full history.
 *
 * @param {object} args
 * @param {{role:string,content:string}[]} args.messages
 * @param {string} [args.contextText] - grounding content for analysis chats.
 * @returns {Promise<{reply:string}>}
 */
async function chat({ messages, contextText } = {}) {
  const body = { messages: Array.isArray(messages) ? messages : [] };
  if (contextText != null) body.context_text = contextText;
  const data = await postJson('/chat', body);
  return { reply: data.reply || '' };
}

module.exports = {
  generateQuiz,
  gradeShortAnswer,
  gradeFillBlank,
  gradeEssay,
  chat,
  setFetch,
};
