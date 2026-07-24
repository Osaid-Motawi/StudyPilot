'use strict';

const request = require('supertest');

jest.mock('../../src/clients/agentClient');
const agentClient = require('../../src/clients/agentClient');
const firestoreClient = require('../../src/clients/firestoreClient');
const { AppError } = require('../../src/middleware/errorHandler');
const { makeMockDb } = require('../helpers/mockFirestore');
const { createApp } = require('../../src/app');

const NOTES =
  'A long enough passage of study material to comfortably pass the sufficiency ' +
  'threshold used by the backend before it calls the generation agent.';

let app;
beforeEach(() => {
  firestoreClient.setDb(makeMockDb());
  firestoreClient.setAuth({ verifyIdToken: async (token) => ({ uid: token }) });
  app = createApp();
});

const auth = (req) => req.set('Authorization', 'Bearer userA');

async function generate(questionType, agentQuiz, extra = {}) {
  agentClient.generateQuiz.mockResolvedValue(agentQuiz);
  const res = await auth(request(app).post('/api/quizzes')).send({
    text: NOTES,
    questionType,
    ...extra,
  });
  return res;
}

describe('T015: generate → take → submit across all four question types', () => {
  test('mcq: deterministic scoring, no agent grading call', async () => {
    const created = await generate('mcq', {
      title: 'MCQ Quiz',
      question_type: 'mcq',
      questions: [
        { type: 'mcq', prompt: 'Q1', options: ['A', 'B'], correct_option_index: 0 },
        { type: 'mcq', prompt: 'Q2', options: ['C', 'D'], correct_option_index: 1 },
      ],
    });
    expect(created.status).toBe(201);
    expect(created.body.questionType).toBe('mcq');
    expect(JSON.stringify(created.body)).not.toContain('correct_option_index');

    const res = await auth(request(app).post(`/api/quizzes/${created.body.id}/attempts`)).send({
      answers: [
        { questionId: 'q1', mcqOptionIndex: 0 }, // correct
        { questionId: 'q2', mcqOptionIndex: 0 }, // wrong
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.score).toBe(1);
    expect(res.body.totalQuestions).toBe(2);
    expect(res.body.scorePercent).toBe(50);
  });

  test('matching: deterministic pair scoring in the backend', async () => {
    const created = await generate(
      'matching',
      {
        title: 'Matching Quiz',
        question_type: 'matching',
        questions: [
          {
            type: 'matching',
            prompt: 'Match animal to sound',
            left_items: ['Dog', 'Cat', 'Cow', 'Hen'],
            right_items: ['Bark', 'Meow', 'Moo', 'Cluck'],
            correct_pairs: [
              { left: 0, right: 0 },
              { left: 1, right: 1 },
              { left: 2, right: 2 },
              { left: 3, right: 3 },
            ],
          },
        ],
      },
      { numQuestions: 4 }
    );
    expect(created.status).toBe(201);
    expect(created.body.questionType).toBe('matching');
    // Taking view exposes items but NOT the correct pairs.
    const q = created.body.questions[0];
    expect(q.leftItems).toHaveLength(4);
    expect(q.rightItems).toHaveLength(4);
    expect(JSON.stringify(created.body)).not.toContain('correctPairs');

    const res = await auth(request(app).post(`/api/quizzes/${created.body.id}/attempts`)).send({
      answers: [
        {
          questionId: 'q1',
          pairs: [
            { left: 0, right: 0 }, // correct
            { left: 1, right: 1 }, // correct
            { left: 2, right: 3 }, // wrong
            { left: 3, right: 2 }, // wrong
          ],
        },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.score).toBe(2);
    expect(res.body.totalQuestions).toBe(4); // pair count
    expect(res.body.scorePercent).toBe(50);
    expect(agentClient.gradeFillBlank).not.toHaveBeenCalled();
    expect(agentClient.gradeEssay).not.toHaveBeenCalled();
  });

  test('fill_blank: graded via agent /grade-short-answer', async () => {
    const created = await generate('fill_blank', {
      title: 'Fill Quiz',
      question_type: 'fill_blank',
      questions: [
        { type: 'fill_blank', prompt: 'The powerhouse is the ____', expected_answer: 'mitochondria' },
        { type: 'fill_blank', prompt: 'Water is H2 ____', expected_answer: 'O' },
      ],
    });
    expect(created.status).toBe(201);
    expect(created.body.questionType).toBe('fill_blank');
    expect(JSON.stringify(created.body)).not.toContain('mitochondria');

    agentClient.gradeFillBlank
      .mockResolvedValueOnce({ isCorrect: true, rationale: 'matches' })
      .mockResolvedValueOnce({ isCorrect: false, rationale: 'nope' });

    const res = await auth(request(app).post(`/api/quizzes/${created.body.id}/attempts`)).send({
      answers: [
        { questionId: 'q1', text: 'the mitochondria' },
        { questionId: 'q2', text: 'H' },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.score).toBe(1);
    expect(res.body.totalQuestions).toBe(2);
    expect(res.body.scorePercent).toBe(50);
    expect(agentClient.gradeFillBlank).toHaveBeenCalledTimes(2);
  });

  test('essay: agent score+feedback, scorePercent = mean of questionScores', async () => {
    const created = await generate('essay', {
      title: 'Essay Quiz',
      question_type: 'essay',
      questions: [
        { type: 'essay', prompt: 'Explain evolution', reference_answer: 'Natural selection' },
        { type: 'essay', prompt: 'Explain gravity', reference_answer: 'Mass attracts mass' },
      ],
    });
    expect(created.status).toBe(201);
    expect(created.body.questionType).toBe('essay');
    expect(JSON.stringify(created.body)).not.toContain('reference_answer');
    expect(JSON.stringify(created.body)).not.toContain('Natural selection');

    agentClient.gradeEssay
      .mockResolvedValueOnce({ score: 80, feedback: 'Good' })
      .mockResolvedValueOnce({ score: 60, feedback: 'Okay' });

    const res = await auth(request(app).post(`/api/quizzes/${created.body.id}/attempts`)).send({
      answers: [
        { questionId: 'q1', text: 'Evolution is change over time via natural selection.' },
        { questionId: 'q2', text: 'Gravity is the attraction between masses.' },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.scorePercent).toBe(70); // mean of 80 and 60
    expect(res.body.score).toBe(70);
    expect(res.body.totalQuestions).toBe(2);
    const a1 = res.body.answers.find((a) => a.questionId === 'q1');
    expect(a1.questionScore).toBe(80);
    expect(a1.feedback).toBe('Good');
  });

  test('agent failure during grading -> 502 and attempt not persisted', async () => {
    const created = await generate('fill_blank', {
      title: 'Fill Quiz',
      question_type: 'fill_blank',
      questions: [
        { type: 'fill_blank', prompt: 'A ____', expected_answer: 'x' },
      ],
    });

    agentClient.gradeFillBlank.mockRejectedValue(
      new AppError(502, 'agent_error', 'The AI service failed. Please try again.')
    );

    const res = await auth(request(app).post(`/api/quizzes/${created.body.id}/attempts`)).send({
      answers: [{ questionId: 'q1', text: 'something' }],
    });
    expect(res.status).toBe(502);

    const list = await auth(request(app).get('/api/attempts'));
    expect(list.body.attempts).toHaveLength(0);
  });

  test('matching pair count is clamped to 3-10', async () => {
    // Request 20 pairs; service clamps numQuestions to 10 before calling agent.
    await generate(
      'matching',
      {
        title: 'M',
        question_type: 'matching',
        questions: [
          {
            type: 'matching',
            prompt: 'p',
            left_items: ['a', 'b', 'c'],
            right_items: ['x', 'y', 'z'],
            correct_pairs: [
              { left: 0, right: 0 },
              { left: 1, right: 1 },
              { left: 2, right: 2 },
            ],
          },
        ],
      },
      { numQuestions: 20 }
    );
    expect(agentClient.generateQuiz).toHaveBeenCalledWith(
      expect.objectContaining({ questionType: 'matching', numQuestions: 10 })
    );
  });
});
