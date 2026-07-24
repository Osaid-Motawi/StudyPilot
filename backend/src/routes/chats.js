'use strict';

const express = require('express');
const chatService = require('../services/chatService');
const { createError } = require('../middleware/errorHandler');

// Mounted at /api/chats.
const router = express.Router();

function requireMessage(body) {
  const message = body && typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    throw createError(400, 'invalid_request', 'A non-empty message is required.');
  }
  return message;
}

// POST /api/chats — create a general chat and get the first assistant reply.
router.post('/', async (req, res, next) => {
  try {
    const message = requireMessage(req.body || {});
    const chat = await chatService.createChat({ uid: req.uid, message, kind: 'general' });
    return res.status(201).json(chat);
  } catch (e) {
    return next(e);
  }
});

// POST /api/chats/:id/messages — append a message; 404 if not owned.
router.post('/:id/messages', async (req, res, next) => {
  try {
    const message = requireMessage(req.body || {});
    const chat = await chatService.appendToChat({
      uid: req.uid,
      chatId: req.params.id,
      message,
    });
    if (!chat) throw createError(404, 'not_found', 'Chat not found.');
    return res.status(201).json(chat);
  } catch (e) {
    return next(e);
  }
});

// GET /api/chats — list the user's chats.
router.get('/', async (req, res, next) => {
  try {
    const chats = await chatService.listChats({ uid: req.uid });
    return res.status(200).json({ chats });
  } catch (e) {
    return next(e);
  }
});

// GET /api/chats/:id — full conversation; 404 if not owned.
router.get('/:id', async (req, res, next) => {
  try {
    const chat = await chatService.getChat({ uid: req.uid, chatId: req.params.id });
    if (!chat) throw createError(404, 'not_found', 'Chat not found.');
    return res.status(200).json(chat);
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
