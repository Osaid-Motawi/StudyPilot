'use strict';

const request = require('supertest');

jest.mock('../../src/clients/agentClient');
const agentClient = require('../../src/clients/agentClient');
const firestoreClient = require('../../src/clients/firestoreClient');
const { makeMockDb } = require('../helpers/mockFirestore');
const { createApp } = require('../../src/app');

const NOTES =
  'The water cycle describes how water evaporates, condenses into clouds, and returns as precipitation.';

const AGENT_QUIZ = {
  title: 'Water Cycle',
  questions: [
    { type: 'mcq', prompt: 'First step?', options: ['Evaporation', 'Rain'], correct_option_index: 0 },
    { type: 'short_answer', prompt: 'Define condensation.', expected_answer: 'Vapor to liquid' },
  ],
};

let app;
beforeEach(() => {
  firestoreClient.setDb(makeMockDb());
  // Each bearer token maps to a distinct uid.
  firestoreClient.setAuth({ verifyIdToken: async (token) => ({ uid: token }) });
  app = createApp();
  agentClient.generateQuiz.mockResolvedValue(AGENT_QUIZ);
  agentClient.gradeShortAnswer.mockResolvedValue({ isCorrect: true, rationale: 'ok' });
});

describe('FR-002: cross-user isolation', () => {
  test("user B gets 404 for user A's quiz (existence not leaked)", async () => {
    const created = await request(app)
      .post('/api/quizzes')
      .set('Authorization', 'Bearer userA')
      .send({ text: NOTES });
    const quizId = created.body.id;

    // User B: same quiz id, different identity.
    const res = await request(app)
      .get(`/api/quizzes/${quizId}`)
      .set('Authorization', 'Bearer userB');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });

  test("user B cannot submit an attempt against user A's quiz", async () => {
    const created = await request(app)
      .post('/api/quizzes')
      .set('Authorization', 'Bearer userA')
      .send({ text: NOTES });
    const quizId = created.body.id;

    const res = await request(app)
      .post(`/api/quizzes/${quizId}/attempts`)
      .set('Authorization', 'Bearer userB')
      .send({ answers: [{ questionId: 'q1', mcqOptionIndex: 0 }] });
    expect(res.status).toBe(404);
  });

  test("user B gets 404 for user A's attempt and sees none in their history", async () => {
    // User A creates a quiz and an attempt.
    const created = await request(app)
      .post('/api/quizzes')
      .set('Authorization', 'Bearer userA')
      .send({ text: NOTES });
    const quizId = created.body.id;
    const madeAttempt = await request(app)
      .post(`/api/quizzes/${quizId}/attempts`)
      .set('Authorization', 'Bearer userA')
      .send({ answers: [{ questionId: 'q1', mcqOptionIndex: 0 }, { questionId: 'q2', text: 'x' }] });
    const attemptId = madeAttempt.body.id;

    // User B cannot read the attempt.
    const readRes = await request(app)
      .get(`/api/attempts/${attemptId}`)
      .set('Authorization', 'Bearer userB');
    expect(readRes.status).toBe(404);

    // User B's history is empty.
    const listRes = await request(app)
      .get('/api/attempts')
      .set('Authorization', 'Bearer userB');
    expect(listRes.body.attempts).toHaveLength(0);

    // User B's quiz list is empty.
    const quizList = await request(app)
      .get('/api/quizzes')
      .set('Authorization', 'Bearer userB');
    expect(quizList.body.quizzes).toHaveLength(0);
  });
});
