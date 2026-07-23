'use strict';

const { buildTakingView } = require('../../src/lib/quizModel');

describe('buildTakingView (answer-hiding anti-cheat)', () => {
  const quiz = {
    id: 'qz1',
    title: 'Photosynthesis',
    sourceType: 'pasted',
    createdAt: new Date('2026-07-23T10:00:00Z'),
    questions: [
      {
        id: 'q1',
        type: 'mcq',
        prompt: 'Where does the light reaction occur?',
        options: ['Thylakoid membrane', 'Stroma', 'Cytosol'],
        correctOptionIndex: 0,
      },
      {
        id: 'q2',
        type: 'short_answer',
        prompt: 'What gas is released?',
        expectedAnswer: 'Oxygen',
      },
    ],
  };

  const view = buildTakingView(quiz);

  test('MCQ omits correctOptionIndex but keeps options', () => {
    const mcq = view.questions.find((q) => q.id === 'q1');
    expect(mcq.options).toEqual(['Thylakoid membrane', 'Stroma', 'Cytosol']);
    expect(mcq).not.toHaveProperty('correctOptionIndex');
  });

  test('short-answer omits expectedAnswer', () => {
    const sa = view.questions.find((q) => q.id === 'q2');
    expect(sa).not.toHaveProperty('expectedAnswer');
    expect(sa).not.toHaveProperty('options');
    expect(sa.prompt).toBe('What gas is released?');
  });

  test('no answer material anywhere in the serialized view', () => {
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain('correctOptionIndex');
    expect(serialized).not.toContain('expectedAnswer');
    expect(serialized).not.toContain('Oxygen');
  });

  test('createdAt is serialized to ISO string', () => {
    expect(view.createdAt).toBe('2026-07-23T10:00:00.000Z');
  });
});
