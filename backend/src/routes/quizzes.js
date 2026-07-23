'use strict';

const express = require('express');
const quizService = require('../services/quizService');
const uploadSingle = require('../middleware/upload');
const { extractText } = require('../lib/extractText');
const { createError } = require('../middleware/errorHandler');

const router = express.Router();

async function handleTextCreate(req, res, next) {
  try {
    const { text, title, numMcq, numShort } = req.body || {};
    const quiz = await quizService.createQuiz({
      uid: req.uid,
      text,
      sourceType: 'pasted',
      title,
      numMcq,
      numShort,
    });
    return res.status(201).json(quiz);
  } catch (e) {
    return next(e);
  }
}

async function handleUploadCreate(req, res, next) {
  try {
    if (!req.file) throw createError(400, 'no_file', 'No file was uploaded.');
    const text = await extractText(req.file.buffer, req.file.mimetype || req.file.originalname);
    const body = req.body || {};
    const quiz = await quizService.createQuiz({
      uid: req.uid,
      text,
      sourceType: 'upload',
      title: body.title,
      numMcq: body.numMcq,
      numShort: body.numShort,
    });
    return res.status(201).json(quiz);
  } catch (e) {
    return next(e);
  }
}

// POST /api/quizzes — text mode (JSON) OR upload mode (multipart/form-data).
router.post('/', (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return uploadSingle(req, res, (err) => {
      if (err) return next(err);
      return handleUploadCreate(req, res, next);
    });
  }
  return handleTextCreate(req, res, next);
});

// GET /api/quizzes — list the user's quizzes (metadata).
router.get('/', async (req, res, next) => {
  try {
    const quizzes = await quizService.listQuizzes({ uid: req.uid });
    return res.status(200).json({ quizzes });
  } catch (e) {
    return next(e);
  }
});

// GET /api/quizzes/:id — taking view (answers hidden); 404 if not owned.
router.get('/:id', async (req, res, next) => {
  try {
    const quiz = await quizService.getQuizForTaking({ uid: req.uid, quizId: req.params.id });
    if (!quiz) throw createError(404, 'not_found', 'Quiz not found.');
    return res.status(200).json(quiz);
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
