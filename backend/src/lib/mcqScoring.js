'use strict';

/**
 * Deterministic multiple-choice scoring (FR-017a, FR-016). No agent involved.
 *
 * @param {{correctOptionIndex:number}} question
 * @param {number|null|undefined} submittedIndex - selected option index; null/undefined = unanswered.
 * @returns {boolean} true only when an answer was provided AND matches the correct index.
 */
function scoreMcq(question, submittedIndex) {
  if (submittedIndex === null || submittedIndex === undefined) return false;
  const submitted = Number(submittedIndex);
  if (!Number.isInteger(submitted)) return false;
  return submitted === Number(question.correctOptionIndex);
}

module.exports = { scoreMcq };
