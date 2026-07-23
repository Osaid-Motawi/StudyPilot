'use strict';

const { getAuth } = require('../clients/firestoreClient');
const { createError } = require('./errorHandler');

/**
 * Verify the `Authorization: Bearer <firebase-id-token>` header (FR-001).
 * On success attaches `req.uid`. Missing/invalid -> 401.
 */
module.exports = async function verifyFirebaseToken(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer (.+)$/);
    if (!match) {
      return next(
        createError(401, 'unauthenticated', 'Missing or invalid authentication token.')
      );
    }
    const decoded = await getAuth().verifyIdToken(match[1]);
    if (!decoded || !decoded.uid) {
      return next(
        createError(401, 'unauthenticated', 'Missing or invalid authentication token.')
      );
    }
    req.uid = decoded.uid;
    return next();
  } catch (_e) {
    return next(createError(401, 'unauthenticated', 'Missing or invalid authentication token.'));
  }
};
