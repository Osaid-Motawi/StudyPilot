'use strict';

/**
 * Deterministic matching scoring (Constitution v1.2.0, FR-011). No agent
 * involved — the backend owns scoring for both mcq AND matching.
 *
 * A matching question maps left items to right items. The user submits pairs
 * `{left:int, right:int}`; a pair is correct when it matches the question's
 * `correctPairs` mapping. Unanswered (null/empty) → 0 correct.
 *
 * @param {{correctPairs:{left:number,right:number}[]}} question
 * @param {{left:number,right:number}[]|null|undefined} submittedPairs
 * @returns {{correctCount:number, totalPairs:number}}
 */
function scoreMatching(question, submittedPairs) {
  const correct = Array.isArray(question && question.correctPairs) ? question.correctPairs : [];
  const totalPairs = correct.length;

  if (!Array.isArray(submittedPairs) || submittedPairs.length === 0) {
    return { correctCount: 0, totalPairs };
  }

  const correctByLeft = new Map();
  correct.forEach((p) => {
    if (p && p.left != null) correctByLeft.set(Number(p.left), Number(p.right));
  });

  const seenLeft = new Set();
  let correctCount = 0;
  submittedPairs.forEach((p) => {
    if (!p || p.left == null) return;
    const left = Number(p.left);
    if (seenLeft.has(left)) return; // one mapping per left item
    seenLeft.add(left);
    if (correctByLeft.has(left) && correctByLeft.get(left) === Number(p.right)) {
      correctCount += 1;
    }
  });

  return { correctCount, totalPairs };
}

module.exports = { scoreMatching };
