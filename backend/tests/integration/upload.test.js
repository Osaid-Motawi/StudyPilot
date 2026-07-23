'use strict';

const request = require('supertest');

jest.mock('../../src/clients/agentClient');
const agentClient = require('../../src/clients/agentClient');
const firestoreClient = require('../../src/clients/firestoreClient');
// Stub PDF extraction via the injectable seam so tests never spawn the worker.
const { setPdfExtractor, resetPdfExtractor } = require('../../src/lib/extractText');
const { makeMockDb } = require('../helpers/mockFirestore');
const { createApp } = require('../../src/app');

const AGENT_QUIZ = {
  title: 'From Upload',
  questions: [
    {
      type: 'mcq',
      prompt: 'Q?',
      options: ['A', 'B'],
      correct_option_index: 1,
    },
    { type: 'short_answer', prompt: 'Explain?', expected_answer: 'Because' },
  ],
};

let app;
beforeEach(() => {
  firestoreClient.setDb(makeMockDb());
  firestoreClient.setAuth({ verifyIdToken: async (token) => ({ uid: token }) });
  app = createApp();
  agentClient.generateQuiz.mockResolvedValue(AGENT_QUIZ);
});

afterEach(() => resetPdfExtractor());

const BEARER = 'Bearer userA';

describe('US2: upload mode', () => {
  test('multipart PDF with extractable text -> 201 quiz', async () => {
    setPdfExtractor(
      async () =>
        'This is a sufficiently long extracted study document about cellular respiration and ATP.'
    );

    const res = await request(app)
      .post('/api/quizzes')
      .set('Authorization', BEARER)
      .attach('file', Buffer.from('%PDF-1.4 fake'), {
        filename: 'notes.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('From Upload');
    expect(res.body.sourceType).toBe('upload');
    expect(res.body.questions).toHaveLength(2);
  });

  test('multipart .txt file -> 201 quiz', async () => {
    const res = await request(app)
      .post('/api/quizzes')
      .set('Authorization', BEARER)
      .attach(
        'file',
        Buffer.from(
          'Plain text study notes long enough to pass the sufficiency threshold for generation.'
        ),
        { filename: 'notes.txt', contentType: 'text/plain' }
      );

    expect(res.status).toBe(201);
    expect(res.body.sourceType).toBe('upload');
  });

  test('unsupported file type (.docx) -> 400, no generation', async () => {
    const res = await request(app)
      .post('/api/quizzes')
      .set('Authorization', BEARER)
      .attach('file', Buffer.from('PK fake docx'), {
        filename: 'notes.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('unsupported_file');
    expect(agentClient.generateQuiz).not.toHaveBeenCalled();
  });

  test('PDF with no extractable text -> 422', async () => {
    setPdfExtractor(async () => '   ');

    const res = await request(app)
      .post('/api/quizzes')
      .set('Authorization', BEARER)
      .attach('file', Buffer.from('%PDF-1.4 empty'), {
        filename: 'empty.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('no_extractable_text');
    expect(agentClient.generateQuiz).not.toHaveBeenCalled();
  });
});
