'use strict';

const request = require('supertest');

jest.mock('../../src/clients/agentClient');
const agentClient = require('../../src/clients/agentClient');
const firestoreClient = require('../../src/clients/firestoreClient');
const { resetPdfExtractor } = require('../../src/lib/extractText');
const { makeMockDb } = require('../helpers/mockFirestore');
const { createApp } = require('../../src/app');

const LONG_TEXT =
  'Cellular respiration converts glucose and oxygen into ATP, water, and carbon ' +
  'dioxide across glycolysis, the Krebs cycle, and the electron transport chain.';

let app;
beforeEach(() => {
  firestoreClient.setDb(makeMockDb());
  firestoreClient.setAuth({ verifyIdToken: async (token) => ({ uid: token }) });
  app = createApp();
});
afterEach(() => resetPdfExtractor());

const BEARER = 'Bearer userA';
const attachTxt = (req, content = LONG_TEXT) =>
  req.attach('file', Buffer.from(content), { filename: 'notes.txt', contentType: 'text/plain' });

// Analysis is CHAT-ONLY over PDF/.txt: upload a file + a question -> a grounded
// analysis chat. (Quiz generation from a file lives on POST /api/quizzes.)
describe('File analysis (chat about it)', () => {
  test('grounds on the extracted content and returns {chatId, reply}', async () => {
    agentClient.chat.mockResolvedValue({ reply: 'ATP is the energy currency.' });

    const res = await attachTxt(
      request(app).post('/api/analysis').set('Authorization', BEARER)
    ).field('question', 'What is produced?');

    expect(res.status).toBe(201);
    expect(res.body.chatId).toBeTruthy();
    expect(res.body.reply).toBe('ATP is the energy currency.');
    // Grounding: the extracted text is passed as contextText.
    expect(agentClient.chat).toHaveBeenCalledWith(
      expect.objectContaining({ contextText: LONG_TEXT })
    );

    // The analysis chat is persisted and continuable via /api/chats/:id.
    const got = await request(app)
      .get(`/api/chats/${res.body.chatId}`)
      .set('Authorization', BEARER);
    expect(got.status).toBe(200);
    expect(got.body.kind).toBe('analysis');
  });

  test('unsupported file -> 400, no agent calls', async () => {
    const res = await request(app)
      .post('/api/analysis')
      .set('Authorization', BEARER)
      .field('question', 'x')
      .attach('file', Buffer.from('PK docx'), {
        filename: 'notes.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('unsupported_file');
    expect(agentClient.chat).not.toHaveBeenCalled();
  });

  test('empty extracted text -> 422', async () => {
    const res = await attachTxt(
      request(app).post('/api/analysis').set('Authorization', BEARER),
      '   '
    ).field('question', 'What?');
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('no_extractable_text');
    expect(agentClient.chat).not.toHaveBeenCalled();
  });

  test('missing question -> 400', async () => {
    const res = await attachTxt(
      request(app).post('/api/analysis').set('Authorization', BEARER)
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_request');
  });
});
