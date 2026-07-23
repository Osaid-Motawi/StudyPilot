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

const AGENT_QUIZ = {
  title: 'Photosynthesis Basics',
  questions: [
    {
      type: 'mcq',
      prompt: 'Where does the light reaction occur?',
      options: ['Thylakoid membrane', 'Stroma', 'Cytosol', 'Nucleus'],
      correct_option_index: 0,
    },
    {
      type: 'short_answer',
      prompt: 'What gas is released during photosynthesis?',
      expected_answer: 'Oxygen',
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

describe('US1: generate → take → score flow', () => {
  test('requires authentication', async () => {
    const res = await request(app).post('/api/quizzes').send({ text: NOTES });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthenticated');
  });

  test('POST /api/quizzes creates a quiz with answers hidden', async () => {
    agentClient.generateQuiz.mockResolvedValue(AGENT_QUIZ);
    const res = await auth(request(app).post('/api/quizzes')).send({ text: NOTES });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Photosynthesis Basics');
    expect(res.body.questions).toHaveLength(2);
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('correctOptionIndex');
    expect(serialized).not.toContain('expectedAnswer');
    expect(serialized).not.toContain('Oxygen');
    // Mixed types present.
    const types = res.body.questions.map((q) => q.type).sort();
    expect(types).toEqual(['mcq', 'short_answer']);
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
    expect(JSON.stringify(res.body)).not.toContain('expectedAnswer');
    expect(res.body.questions[0]).not.toHaveProperty('correctOptionIndex');
  });

  test('submit attempt scores MCQ deterministically and grades short-answer via agent', async () => {
    agentClient.generateQuiz.mockResolvedValue(AGENT_QUIZ);
    agentClient.gradeShortAnswer.mockResolvedValue({
      isCorrect: true,
      rationale: 'O2 is oxygen; matches the expected answer.',
    });

    const created = await auth(request(app).post('/api/quizzes')).send({ text: NOTES });
    const id = created.body.id;

    const res = await auth(request(app).post(`/api/quizzes/${id}/attempts`)).send({
      answers: [
        { questionId: 'q1', mcqOptionIndex: 0 },
        { questionId: 'q2', text: 'it gives off O2' },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.score).toBe(2);
    expect(res.body.totalQuestions).toBe(2);
    expect(res.body.scorePercent).toBe(100);
    const mcq = res.body.answers.find((a) => a.questionId === 'q1');
    expect(mcq.isCorrect).toBe(true);
    expect(mcq.correctAnswer).toBe('Thylakoid membrane');
    const sa = res.body.answers.find((a) => a.questionId === 'q2');
    expect(sa.isCorrect).toBe(true);
    expect(sa.correctAnswer).toBe('Oxygen');
    expect(sa.rationale).toContain('oxygen');
  });

  test('blank/unanswered questions are scored incorrect without calling the agent', async () => {
    agentClient.generateQuiz.mockResolvedValue(AGENT_QUIZ);

    const created = await auth(request(app).post('/api/quizzes')).send({ text: NOTES });
    const id = created.body.id;

    const res = await auth(request(app).post(`/api/quizzes/${id}/attempts`)).send({
      answers: [{ questionId: 'q1', mcqOptionIndex: 3 }], // wrong; q2 omitted
    });

    expect(res.status).toBe(201);
    expect(res.body.score).toBe(0);
    const sa = res.body.answers.find((a) => a.questionId === 'q2');
    expect(sa.isCorrect).toBe(false);
    expect(sa.userAnswer).toBeNull();
    expect(agentClient.gradeShortAnswer).not.toHaveBeenCalled();
  });

  test('agent failure during grading -> 502 and attempt not persisted', async () => {
    agentClient.generateQuiz.mockResolvedValue(AGENT_QUIZ);
    const err = Object.assign(new Error('agent down'), { status: 502, code: 'agent_error' });
    err.name = 'AppError';
    // Make it an AppError instance so errorHandler exposes it.
    const { AppError } = require('../../src/middleware/errorHandler');
    agentClient.gradeShortAnswer.mockRejectedValue(
      new AppError(502, 'agent_error', 'The quiz service failed. Please try again.')
    );

    const created = await auth(request(app).post('/api/quizzes')).send({ text: NOTES });
    const id = created.body.id;

    const res = await auth(request(app).post(`/api/quizzes/${id}/attempts`)).send({
      answers: [
        { questionId: 'q1', mcqOptionIndex: 0 },
        { questionId: 'q2', text: 'oxygen' },
      ],
    });
    expect(res.status).toBe(502);

    const list = await auth(request(app).get('/api/attempts'));
    expect(list.body.attempts).toHaveLength(0);
  });
});
