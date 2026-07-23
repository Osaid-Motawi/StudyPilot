'use strict';

const { scoreMcq } = require('../../src/lib/mcqScoring');

describe('scoreMcq (deterministic MCQ scoring)', () => {
  const question = { correctOptionIndex: 2 };

  test('correct selection scores true', () => {
    expect(scoreMcq(question, 2)).toBe(true);
  });

  test('incorrect selection scores false', () => {
    expect(scoreMcq(question, 0)).toBe(false);
  });

  test('unanswered (null) scores false', () => {
    expect(scoreMcq(question, null)).toBe(false);
  });

  test('unanswered (undefined) scores false', () => {
    expect(scoreMcq(question, undefined)).toBe(false);
  });

  test('handles string index equivalence', () => {
    expect(scoreMcq(question, '2')).toBe(true);
    expect(scoreMcq(question, '1')).toBe(false);
  });
});
