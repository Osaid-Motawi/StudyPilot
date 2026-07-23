'use strict';

const express = require('express');
const attemptService = require('../services/attemptService');
const { createError } = require('../middleware/errorHandler');

// Mounted at /api. Owns the attempt submission route (nested under a quiz) and
// the attempt history/read routes.
const router = express.Router();

// POST /api/quizzes/:id/attempts — grade and persist an attempt.
router.post('/quizzes/:id/attempts', async (req, res, next) => {
  try {
    const { answers } = req.body || {};
    const result = await attemptService.submitAttempt({
      uid: req.uid,
      quizId: req.params.id,
      answers,
    });
    return res.status(201).json(result);
  } catch (e) {
    return next(e);
  }
});

// GET /api/attempts — list attempts (optional ?quizId filter).
router.get('/attempts', async (req, res, next) => {
  try {
    const attempts = await attemptService.listAttempts({
      uid: req.uid,
      quizId: req.query.quizId,
    });
    return res.status(200).json({ attempts });
  } catch (e) {
    return next(e);
  }
});

// GET /api/attempts/:id — one attempt in full; 404 if not owned.
router.get('/attempts/:id', async (req, res, next) => {
  try {
    const attempt = await attemptService.getAttempt({
      uid: req.uid,
      attemptId: req.params.id,
    });
    if (!attempt) throw createError(404, 'not_found', 'Attempt not found.');
    return res.status(200).json(attempt);
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
