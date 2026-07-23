'use strict';

const express = require('express');
const verifyFirebaseToken = require('./middleware/verifyFirebaseToken');
const { errorHandler } = require('./middleware/errorHandler');
const quizzesRouter = require('./routes/quizzes');
const attemptsRouter = require('./routes/attempts');

function createApp() {
  const app = express();

  // CORS: the browser frontend is served from a different origin/port than this
  // API, so cross-origin requests (and the Authorization-header preflight) must
  // be allowed. Bearer tokens travel in a header (not cookies), so a wildcard
  // origin is safe here. Set CORS_ORIGIN to lock this down in production.
  // Must run BEFORE the auth guard so preflight OPTIONS is answered without a token.
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.header('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
  });

  // Health check — no auth (contracts + quickstart smoke test).
  app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

  // JSON body parsing. multipart is handled per-route by multer.
  app.use(express.json({ limit: '5mb' }));

  // All /api routes require a valid Firebase ID token (FR-001).
  app.use('/api', verifyFirebaseToken);

  // Routes.
  app.use('/api/quizzes', quizzesRouter);
  app.use('/api', attemptsRouter);

  // Centralized error model — mounted last.
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
