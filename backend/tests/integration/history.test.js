'use strict';

const request = require('supertest');

jest.mock('../../src/clients/agentClient');
const agentClient = require('../../src/clients/agentClient');
const firestoreClient = require('../../src/clients/firestoreClient');
const { makeMockDb } = require('../helpers/mockFirestore');
const { createApp } = require('../../src/app');

const NOTES =
  'Cellular respiration breaks down glucose to release energy stored as ATP in the mitochondria of cells.';

const AGENT_QUIZ = {
  title: 'Respiration',
  questions: [
    { type: 'mcq', prompt: 'Where?', options: ['Mitochondria', 'Nucleus'], correct_option_index: 0 },
    { type: 'short_answer', prompt: 'Product?', expected_answer: 'ATP' },
  ],
};

let app;
beforeEach(() => {
  firestoreClient.setDb(makeMockDb());
  firestoreClient.setAuth({ verifyIdToken: async (token) => ({ uid: token }) });
  app = createApp();
  agentClient.generateQuiz.mockResolvedValue(AGENT_QUIZ);
  agentClient.gradeShortAnswer.mockResolvedValue({ isCorrect: false, rationale: 'nope' });
});

const auth = (req) => req.set('Authorization', 'Bearer userA');

async function createQuiz() {
  const res = await auth(request(app).post('/api/quizzes')).send({ text: NOTES });
  return res.body.id;
}
async function attempt(quizId, mcqIndex) {
  return auth(request(app).post(`/api/quizzes/${quizId}/attempts`)).send({
    answers: [{ questionId: 'q1', mcqOptionIndex: mcqIndex }, { questionId: 'q2', text: '' }],
  });
}

describe('US3: history & progress', () => {
  test('GET /api/quizzes lists quizzes with metadata', async () => {
    await createQuiz();
    const res = await auth(request(app).get('/api/quizzes'));
    expect(res.status).toBe(200);
    expect(res.body.quizzes).toHaveLength(1);
    expect(res.body.quizzes[0]).toMatchObject({
      title: 'Respiration',
      sourceType: 'pasted',
      questionCount: 2,
    });
    // No answer material in list metadata.
    expect(JSON.stringify(res.body)).not.toContain('expectedAnswer');
  });

  test('multiple attempts on the same quiz are listed separately', async () => {
    const quizId = await createQuiz();
    await attempt(quizId, 0); // correct MCQ
    await attempt(quizId, 1); // wrong MCQ

    const res = await auth(request(app).get('/api/attempts'));
    expect(res.status).toBe(200);
    expect(res.body.attempts).toHaveLength(2);
    res.body.attempts.forEach((a) => {
      expect(a.quizId).toBe(quizId);
      expect(a.quizTitle).toBe('Respiration');
      expect(a).toHaveProperty('submittedAt');
    });
    const scores = res.body.attempts.map((a) => a.score).sort();
    expect(scores).toEqual([0, 1]);
  });

  test('GET /api/attempts?quizId filters to one quiz', async () => {
    const quizA = await createQuiz();
    const quizB = await createQuiz();
    await attempt(quizA, 0);
    await attempt(quizB, 0);

    const res = await auth(request(app).get('/api/attempts').query({ quizId: quizA }));
    expect(res.body.attempts).toHaveLength(1);
    expect(res.body.attempts[0].quizId).toBe(quizA);
  });

  test('GET /api/attempts/:id returns one attempt in full', async () => {
    const quizId = await createQuiz();
    const made = await attempt(quizId, 0);
    const attemptId = made.body.id;

    const res = await auth(request(app).get(`/api/attempts/${attemptId}`));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(attemptId);
    expect(res.body.answers).toHaveLength(2);
  });

  test('unknown attempt id -> 404', async () => {
    const res = await auth(request(app).get('/api/attempts/does-not-exist'));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });
});
