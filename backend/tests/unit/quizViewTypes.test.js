'use strict';

const { buildTakingView } = require('../../src/lib/quizModel');

/**
 * T014: the type-aware taking view must hide ALL answer material for every
 * question type (anti-cheat), while keeping type-specific presentation fields.
 */
describe('buildTakingView — answer-hiding across all four types', () => {
  test('mcq: keeps options, hides correctOptionIndex', () => {
    const view = buildTakingView({
      id: 'qz',
      title: 'T',
      sourceType: 'pasted',
      questionType: 'mcq',
      questions: [
        {
          id: 'q1',
          type: 'mcq',
          prompt: 'Pick one',
          options: ['A', 'B', 'C'],
          correctOptionIndex: 2,
        },
      ],
    });
    expect(view.questionType).toBe('mcq');
    const q = view.questions[0];
    expect(q.options).toEqual(['A', 'B', 'C']);
    expect(q).not.toHaveProperty('correctOptionIndex');
    expect(JSON.stringify(view)).not.toContain('correctOptionIndex');
  });

  test('fill_blank: hides expectedAnswer', () => {
    const view = buildTakingView({
      id: 'qz',
      title: 'T',
      sourceType: 'pasted',
      questionType: 'fill_blank',
      questions: [
        { id: 'q1', type: 'fill_blank', prompt: 'The powerhouse is the ____', expectedAnswer: 'mitochondria' },
      ],
    });
    const q = view.questions[0];
    expect(q.prompt).toContain('powerhouse');
    expect(q).not.toHaveProperty('expectedAnswer');
    expect(JSON.stringify(view)).not.toContain('mitochondria');
  });

  test('essay: hides referenceAnswer/maxScore, keeps optional guidance', () => {
    const view = buildTakingView({
      id: 'qz',
      title: 'T',
      sourceType: 'pasted',
      questionType: 'essay',
      questions: [
        {
          id: 'q1',
          type: 'essay',
          prompt: 'Explain evolution',
          referenceAnswer: 'Natural selection over generations',
          guidance: 'Mention variation and heredity',
          maxScore: 100,
        },
      ],
    });
    const q = view.questions[0];
    expect(q.guidance).toBe('Mention variation and heredity');
    expect(q).not.toHaveProperty('referenceAnswer');
    expect(q).not.toHaveProperty('maxScore');
    const s = JSON.stringify(view);
    expect(s).not.toContain('referenceAnswer');
    expect(s).not.toContain('Natural selection');
  });

  test('matching: keeps leftItems/rightItems, hides correctPairs', () => {
    const view = buildTakingView({
      id: 'qz',
      title: 'T',
      sourceType: 'pasted',
      questionType: 'matching',
      questions: [
        {
          id: 'q1',
          type: 'matching',
          prompt: 'Match animal to sound',
          leftItems: ['Dog', 'Cat', 'Cow'],
          rightItems: ['Moo', 'Bark', 'Meow'],
          correctPairs: [
            { left: 0, right: 1 },
            { left: 1, right: 2 },
            { left: 2, right: 0 },
          ],
        },
      ],
    });
    const q = view.questions[0];
    expect(q.leftItems).toEqual(['Dog', 'Cat', 'Cow']);
    expect(q.rightItems).toEqual(['Moo', 'Bark', 'Meow']);
    expect(q).not.toHaveProperty('correctPairs');
    expect(JSON.stringify(view)).not.toContain('correctPairs');
  });
});
