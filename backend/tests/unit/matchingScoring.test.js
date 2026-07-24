'use strict';

const { scoreMatching } = require('../../src/lib/scoring');

describe('scoreMatching (deterministic matching scoring)', () => {
  // 4 pairs: left i -> right i (identity mapping for clarity).
  const question = {
    leftItems: ['Dog', 'Cat', 'Cow', 'Hen'],
    rightItems: ['Bark', 'Meow', 'Moo', 'Cluck'],
    correctPairs: [
      { left: 0, right: 0 },
      { left: 1, right: 1 },
      { left: 2, right: 2 },
      { left: 3, right: 3 },
    ],
  };

  test('all correct -> full count', () => {
    const res = scoreMatching(question, [
      { left: 0, right: 0 },
      { left: 1, right: 1 },
      { left: 2, right: 2 },
      { left: 3, right: 3 },
    ]);
    expect(res).toEqual({ correctCount: 4, totalPairs: 4 });
  });

  test('partial correct -> counts only matching pairs', () => {
    const res = scoreMatching(question, [
      { left: 0, right: 0 }, // correct
      { left: 1, right: 2 }, // wrong
      { left: 2, right: 2 }, // correct
      { left: 3, right: 1 }, // wrong
    ]);
    expect(res).toEqual({ correctCount: 2, totalPairs: 4 });
  });

  test('none correct -> zero', () => {
    const res = scoreMatching(question, [
      { left: 0, right: 1 },
      { left: 1, right: 0 },
      { left: 2, right: 3 },
      { left: 3, right: 2 },
    ]);
    expect(res).toEqual({ correctCount: 0, totalPairs: 4 });
  });

  test('unanswered (null) -> zero correct', () => {
    expect(scoreMatching(question, null)).toEqual({ correctCount: 0, totalPairs: 4 });
  });

  test('unanswered (empty array) -> zero correct', () => {
    expect(scoreMatching(question, [])).toEqual({ correctCount: 0, totalPairs: 4 });
  });

  test('duplicate left mappings are counted once', () => {
    const res = scoreMatching(question, [
      { left: 0, right: 0 }, // correct
      { left: 0, right: 0 }, // duplicate — ignored
      { left: 1, right: 1 }, // correct
    ]);
    expect(res).toEqual({ correctCount: 2, totalPairs: 4 });
  });

  test('string indices are coerced', () => {
    const res = scoreMatching(question, [
      { left: '0', right: '0' },
      { left: '1', right: '1' },
    ]);
    expect(res).toEqual({ correctCount: 2, totalPairs: 4 });
  });
});
