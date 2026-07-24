'use strict';

const express = require('express');
const profileService = require('../services/profileService');
const { createError } = require('../middleware/errorHandler');

// Mounted at /api/profile.
const router = express.Router();

// GET /api/profile/overview — derived aggregate over the user's attempts.
router.get('/overview', async (req, res, next) => {
  try {
    const overview = await profileService.getOverview({ uid: req.uid });
    return res.status(200).json(overview);
  } catch (e) {
    return next(e);
  }
});

// GET /api/profile — { photoData } (null if never set).
router.get('/', async (req, res, next) => {
  try {
    const profile = await profileService.getPhoto({ uid: req.uid });
    return res.status(200).json(profile);
  } catch (e) {
    return next(e);
  }
});

// POST /api/profile/photo — body: { photoData: "data:image/...;base64,..." }.
router.post('/photo', async (req, res, next) => {
  try {
    const { photoData } = req.body || {};
    const saved = await profileService.savePhoto({ uid: req.uid, photoData });
    return res.status(200).json(saved);
  } catch (e) {
    return next(createError(400, 'invalid_photo', e.message || 'Invalid photo.'));
  }
});

module.exports = router;
