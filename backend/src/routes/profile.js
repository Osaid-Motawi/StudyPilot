'use strict';

const express = require('express');
const profileService = require('../services/profileService');

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

module.exports = router;
