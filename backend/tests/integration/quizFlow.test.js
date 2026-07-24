'use strict';

const request = require('supertest');

jest.mock('../../src/clients/agentClient');
const agentClient = require('../../src/clients/agentClient');
const firestoreClient = require('../../src/clients/firestoreClient');
const { makeMockDb } = require('../helpers/mockFirestore');
const { createApp } = require('../../src/app');

const NOTES =
  'Photosynthesis converts light energy into chemical energy stored in glucose. ' +
  'The light reactions occur in the thylakoid membrane and release oxygen.';

// 002: one question type per quiz. This flow exercises the mcq type end-to-end.
const AGENT_QUIZ = {
  title: 'Photosynthesis Basics',
  question_type: 'mcq',
  questions: [
    {
      type: 'mcq',
      prompt: 'Where does the light reaction occur?',
      options: ['Thylakoid membrane', 'Stroma', 'Cytosol', 'Nucleus'],
      correct_option_index: 0,
    },
    {
      type: 'mcq',
      prompt: 'What gas is released during photosynthesis?',
      options: ['Oxygen', 'Nitrogen', 'Carbon dioxide'],
      correct_option_index: 0,
    },
  ],
};

let app;
beforeEach(() => {
  firestoreClient.setDb(makeMockDb());
  firestoreClient.setAuth({ verifyIdToken: async (token) => ({ uid: token }) });
  app = createApp();
});

const auth = (req) => req.set('Authorization', 'Bearer userA');

describe('US1: generate → take → score flow (mcq single-type)', () => {
  test('requires authentication', async () => {
    const res = await request(app).post('/api/quizzes').send({ text: NOTES });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthenticated');
  });

  test('POST /api/quizzes creates an mcq quiz with answers hidden', async () => {
    agentClient.generateQuiz.mockResolvedValue(AGENT_QUIZ);
    const res = await auth(request(app).post('/api/quizzes')).send({
      text: NOTES,
      questionType: 'mcq',
    });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Photosynthesis Basics');
    expect(res.body.questionType).toBe('mcq');
    expect(res.body.questions).toHaveLength(2);
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('correctOptionIndex');
    expect(serialized).not.toContain('correct_option_index');
    // All questions are the single chosen type.
    expect(res.body.questions.every((q) => q.type === 'mcq')).toBe(true);
    expect(res.body.questions[0].options).toContain('Thylakoid membrane');
  });

  test('defaults to mcq when questionType is omitted', async () => {
    agentClient.generateQuiz.mockResolvedValue(AGENT_QUIZ);
    const res = await auth(request(app).post('/api/quizzes')).send({ text: NOTES });
    expect(res.status).toBe(201);
    expect(res.body.questionType).toBe('mcq');
    expect(agentClient.generateQuiz).toHaveBeenCalledWith(
      expect.objectContaining({ questionType: 'mcq', text: expect.any(String) })
    );
  });

  test('too-short notes -> 422 needs more material', async () => {
    const res = await auth(request(app).post('/api/quizzes')).send({ text: 'too short' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('insufficient_material');
    expect(agentClient.generateQuiz).not.toHaveBeenCalled();
  });

  test('GET /api/quizzes/:id returns taking view with answers hidden', async () => {
    agentClient.generateQuiz.mockResolvedValue(AGENT_QUIZ);
    const created = await auth(request(app).post('/api/quizzes')).send({ text: NOTES });
    const id = created.body.id;

    const res = await auth(request(app).get(`/api/quizzes/${id}`));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.questionType).toBe('mcq');
    expect(JSON.stringify(res.body)).not.toContain('correctOptionIndex');
    expect(res.body.questions[0]).not.toHaveProperty('correctOptionIndex');
  });

  test('submit attempt scores MCQ deterministically (no agent call)', async () => {
    agentClient.generateQuiz.mockResolvedValue(AGENT_QUIZ);

    const created = await auth(request(app).post('/api/quizzes')).send({ text: NOTES });
    const id = created.body.id;

    const res = await auth(request(app).post(`/api/quizzes/${id}/attempts`)).send({
      answers: [
        { questionId: 'q1', mcqOptionIndex: 0 },
        { questionId: 'q2', mcqOptionIndex: 0 },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.score).toBe(2);
    expect(res.body.totalQuestions).toBe(2);
    expect(res.body.scorePercent).toBe(100);
    const mcq = res.body.answers.find((a) => a.questionId === 'q1');
    expect(mcq.isCorrect).toBe(true);
    expect(mcq.correctAnswer).toBe('Thylakoid membrane');
  });

  test('blank/unanswered questions are scored incorrect', async () => {
    agentClient.generateQuiz.mockResolvedValue(AGENT_QUIZ);

    const created = await auth(request(app).post('/api/quizzes')).send({ text: NOTES });
    const id = created.body.id;

    const res = await auth(request(app).post(`/api/quizzes/${id}/attempts`)).send({
      answers: [{ questionId: 'q1', mcqOptionIndex: 3 }], // wrong; q2 omitted
    });

    expect(res.status).toBe(201);
    expect(res.body.score).toBe(0);
    const q2 = res.body.answers.find((a) => a.questionId === 'q2');
    expect(q2.isCorrect).toBe(false);
    expect(q2.userAnswer).toBeNull();
  });
});
