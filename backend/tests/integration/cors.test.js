'use strict';

const request = require('supertest');
const { createApp } = require('../../src/app');

// The browser frontend runs on a different origin than the API, so CORS must be
// present. Regression guard for the "Failed to fetch" preflight bug.
describe('CORS', () => {
  const app = createApp();

  test('preflight OPTIONS on /api is answered 204 with CORS headers (no auth)', async () => {
    const res = await request(app)
      .options('/api/quizzes')
      .set('Origin', 'http://localhost:5174')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBeDefined();
    expect(res.headers['access-control-allow-headers']).toMatch(/authorization/i);
    expect(res.headers['access-control-allow-methods']).toMatch(/POST/);
  });

  test('responses include Access-Control-Allow-Origin', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://localhost:5174');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });
});
