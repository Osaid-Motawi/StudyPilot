'use strict';

const request = require('supertest');

jest.mock('../../src/clients/agentClient');
const agentClient = require('../../src/clients/agentClient');
const firestoreClient = require('../../src/clients/firestoreClient');
const { AppError } = require('../../src/middleware/errorHandler');
const { makeMockDb } = require('../helpers/mockFirestore');
const { createApp } = require('../../src/app');

let app;
beforeEach(() => {
  firestoreClient.setDb(makeMockDb());
  firestoreClient.setAuth({ verifyIdToken: async (token) => ({ uid: token }) });
  app = createApp();
});

const auth = (req, user = 'userA') => req.set('Authorization', `Bearer ${user}`);

describe('US3: persisted general chat', () => {
  test('create -> agent reply appended, persisted, title derived', async () => {
    agentClient.chat.mockResolvedValue({ reply: 'Photosynthesis converts light to energy.' });

    const res = await auth(request(app).post('/api/chats')).send({
      message: 'What is photosynthesis?',
    });
    expect(res.status).toBe(201);
    expect(res.body.kind).toBe('general');
    expect(res.body.title).toBe('What is photosynthesis?');
    expect(res.body.messages).toHaveLength(2);
    expect(res.body.messages[0]).toMatchObject({ role: 'user', content: 'What is photosynthesis?' });
    expect(res.body.messages[1]).toMatchObject({
      role: 'assistant',
      content: 'Photosynthesis converts light to energy.',
    });
    // Agent gets the user turn; general chats send no contextText.
    expect(agentClient.chat).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [{ role: 'user', content: 'What is photosynthesis?' }] })
    );
    expect(agentClient.chat.mock.calls[0][0].contextText).toBeUndefined();
  });

  test('empty message -> 400', async () => {
    const res = await auth(request(app).post('/api/chats')).send({ message: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_request');
    expect(agentClient.chat).not.toHaveBeenCalled();
  });

  test('post message replays history and appends turn; persisted on get', async () => {
    agentClient.chat.mockResolvedValueOnce({ reply: 'First reply.' });
    const created = await auth(request(app).post('/api/chats')).send({ message: 'Hello' });
    const id = created.body.id;

    agentClient.chat.mockResolvedValueOnce({ reply: 'Second reply.' });
    const follow = await auth(request(app).post(`/api/chats/${id}/messages`)).send({
      message: 'Tell me more',
    });
    expect(follow.status).toBe(201);
    expect(follow.body.messages).toHaveLength(4);
    // Second agent call replays prior turns + the new user message.
    const secondCall = agentClient.chat.mock.calls[1][0];
    expect(secondCall.messages).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'First reply.' },
      { role: 'user', content: 'Tell me more' },
    ]);

    const got = await auth(request(app).get(`/api/chats/${id}`));
    expect(got.status).toBe(200);
    expect(got.body.messages).toHaveLength(4);
  });

  test('list returns compact items newest first', async () => {
    agentClient.chat.mockResolvedValue({ reply: 'ok' });
    await auth(request(app).post('/api/chats')).send({ message: 'first chat' });
    await auth(request(app).post('/api/chats')).send({ message: 'second chat' });

    const res = await auth(request(app).get('/api/chats'));
    expect(res.status).toBe(200);
    expect(res.body.chats).toHaveLength(2);
    expect(res.body.chats[0]).toHaveProperty('kind', 'general');
    expect(res.body.chats[0]).toHaveProperty('title');
    expect(res.body.chats[0]).toHaveProperty('updatedAt');
    expect(res.body.chats[0]).not.toHaveProperty('messages');
  });

  test('agent failure -> 502, nothing persisted', async () => {
    agentClient.chat.mockRejectedValue(
      new AppError(502, 'agent_error', 'The AI service failed. Please try again.')
    );
    const res = await auth(request(app).post('/api/chats')).send({ message: 'Hi' });
    expect(res.status).toBe(502);

    const list = await auth(request(app).get('/api/chats'));
    expect(list.body.chats).toHaveLength(0);
  });

  test('cross-user isolation: other user cannot get/append -> 404', async () => {
    agentClient.chat.mockResolvedValue({ reply: 'ok' });
    const created = await auth(request(app).post('/api/chats')).send({ message: 'private' });
    const id = created.body.id;

    const get = await auth(request(app).get(`/api/chats/${id}`), 'userB');
    expect(get.status).toBe(404);

    const post = await auth(request(app).post(`/api/chats/${id}/messages`), 'userB').send({
      message: 'sneaky',
    });
    expect(post.status).toBe(404);

    const list = await auth(request(app).get('/api/chats'), 'userB');
    expect(list.body.chats).toHaveLength(0);
  });
});
