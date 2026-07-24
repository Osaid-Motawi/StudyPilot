'use strict';

const express = require('express');
const uploadSingle = require('../middleware/upload');
const chatService = require('../services/chatService');
const { extractText } = require('../lib/extractText');
const { createError } = require('../middleware/errorHandler');

// Mounted at /api/analysis.
const router = express.Router();

/**
 * Obtain grounding text from the uploaded PDF/.txt file (extracted in the
 * backend). extractText throws 422 for empty/unreadable content.
 */
async function extractMaterial(file) {
  return extractText(file.buffer, file.mimetype || file.originalname);
}

async function handleAnalysis(req, res, next) {
  try {
    if (!req.file) throw createError(400, 'no_file', 'No file was uploaded.');
    const body = req.body || {};
    const question =
      typeof body.question === 'string' && body.question.trim() ? body.question.trim() : '';
    if (!question) {
      throw createError(400, 'invalid_request', 'A question is required.');
    }

    // Ground an analysis chat in the uploaded content and return the first reply.
    // Quiz generation from a file lives on the Create Quiz page (POST /api/quizzes).
    const text = await extractMaterial(req.file);
    const chat = await chatService.createChat({
      uid: req.uid,
      message: question,
      kind: 'analysis',
      contextText: text,
    });
    const messages = chat.messages || [];
    const reply = messages.length ? messages[messages.length - 1].content : '';
    return res.status(201).json({ chatId: chat.id, reply });
  } catch (e) {
    return next(e);
  }
}

// POST /api/analysis — multipart { file, question }. Chat about the content.
router.post('/', (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err) return next(err);
    return handleAnalysis(req, res, next);
  });
});

module.exports = router;
