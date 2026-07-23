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
      'The quiz service is temporarily unavailable. Please try again.'
    );
  }
  if (!res.ok) {
    if (res.status === 504) {
      throw createError(504, 'agent_timeout', 'The quiz service timed out. Please try again.');
    }
    throw createError(502, 'agent_error', 'The quiz service failed. Please try again.');
  }
  return res.json();
}

/**
 * POST {AGENT_BASE_URL}/generate-quiz
 * @returns {Promise<{title:string, questions:Array}>} raw agent response (snake_case).
 */
async function generateQuiz(text, opts = {}) {
  const numMcq = Number(opts.numMcq);
  const numShort = Number(opts.numShort);
  return postJson('/generate-quiz', {
    text,
    num_mcq: Number.isFinite(numMcq) && numMcq > 0 ? numMcq : 5,
    num_short: Number.isFinite(numShort) && numShort > 0 ? numShort : 3,
  });
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

module.exports = { generateQuiz, gradeShortAnswer, setFetch };
