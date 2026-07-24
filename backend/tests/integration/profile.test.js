'use strict';

const request = require('supertest');

jest.mock('../../src/clients/agentClient');
const agentClient = require('../../src/clients/agentClient');
const firestoreClient = require('../../src/clients/firestoreClient');
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

const auth = (req, user = 'userA') => req.set('Authorization', `Bearer ${user}`);

// Create an mcq quiz and submit an attempt with the given first-answer correctness.
async function seedAttempt(user, { correct }) {
  agentClient.generateQuiz.mockResolvedValue({
    title: 'Quiz',
    question_type: 'mcq',
    questions: [
      { type: 'mcq', prompt: 'Q1', options: ['A', 'B'], correct_option_index: 0 },
      { type: 'mcq', prompt: 'Q2', options: ['C', 'D'], correct_option_index: 1 },
    ],
  });
  const created = await auth(request(app).post('/api/quizzes'), user).send({
    text: NOTES,
    questionType: 'mcq',
  });
  await auth(request(app).post(`/api/quizzes/${created.body.id}/attempts`), user).send({
    answers: [
      { questionId: 'q1', mcqOptionIndex: correct ? 0 : 1 },
      { questionId: 'q2', mcqOptionIndex: 1 }, // always correct
    ],
  });
}

describe('US2: Profile overview + list', () => {
  test('overview averages scorePercent and counts total attempts', async () => {
    await seedAttempt('userA', { correct: true }); // 100%
    await seedAttempt('userA', { correct: false }); // 50%

    const res = await auth(request(app).get('/api/profile/overview'));
    expect(res.status).toBe(200);
    expect(res.body.totalQuizzes).toBe(2);
    expect(res.body.averageScorePercent).toBe(75); // mean of 100 and 50
  });

  test('empty state -> zeros', async () => {
    const res = await auth(request(app).get('/api/profile/overview'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ averageScorePercent: 0, totalQuizzes: 0 });
  });

  test('attempts list items include questionType (and title/score/date)', async () => {
    await seedAttempt('userA', { correct: true });

    const res = await auth(request(app).get('/api/attempts'));
    expect(res.status).toBe(200);
    expect(res.body.attempts).toHaveLength(1);
    const item = res.body.attempts[0];
    expect(item.questionType).toBe('mcq');
    expect(item.quizTitle).toBe('Quiz');
    expect(item.scorePercent).toBe(100);
    expect(item.submittedAt).toBeTruthy();
  });

  test('cross-user isolation: overview only reflects the caller', async () => {
    await seedAttempt('userA', { correct: true });
    await seedAttempt('userA', { correct: true });

    const other = await auth(request(app).get('/api/profile/overview'), 'userB');
    expect(other.body).toEqual({ averageScorePercent: 0, totalQuizzes: 0 });

    const mine = await auth(request(app).get('/api/profile/overview'), 'userA');
    expect(mine.body.totalQuizzes).toBe(2);
  });
});

describe('Profile photo', () => {
  const PHOTO = 'data:image/jpeg;base64,AAAA';

  test('GET /api/profile -> photoData null before anything is saved', async () => {
    const res = await auth(request(app).get('/api/profile'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ photoData: null });
  });

  test('POST /api/profile/photo saves it, GET /api/profile returns it back', async () => {
    const saved = await auth(request(app).post('/api/profile/photo')).send({ photoData: PHOTO });
    expect(saved.status).toBe(200);
    expect(saved.body).toEqual({ photoData: PHOTO });

    const fetched = await auth(request(app).get('/api/profile'));
    expect(fetched.body).toEqual({ photoData: PHOTO });
  });

  test('rejects a non-data-URI payload', async () => {
    const res = await auth(request(app).post('/api/profile/photo')).send({
      photoData: 'not-an-image',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_photo');
  });

  test('rejects an oversized payload', async () => {
    const huge = 'data:image/jpeg;base64,' + 'A'.repeat(800_000);
    const res = await auth(request(app).post('/api/profile/photo')).send({ photoData: huge });
    expect(res.status).toBe(400);
  });

  test('cross-user isolation: each user only sees their own photo', async () => {
    await auth(request(app).post('/api/profile/photo'), 'userA').send({ photoData: PHOTO });

    const other = await auth(request(app).get('/api/profile'), 'userB');
    expect(other.body).toEqual({ photoData: null });
  });
});
