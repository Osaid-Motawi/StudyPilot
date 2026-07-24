'use strict';

const { getDb } = require('../clients/firestoreClient');

// Firestore documents cap out at 1 MiB; leave generous headroom under that
// for the base64 string (encoded size is ~4/3 of the original file).
const MAX_PHOTO_LENGTH = 700_000;

function attemptsCol(uid) {
  return getDb().collection('users').doc(uid).collection('attempts');
}

function userDoc(uid) {
  return getDb().collection('users').doc(uid);
}

/**
 * Profile Overview — derived at read time from the user's attempts (never
 * stored). Returns the mean scorePercent across all attempts and the total
 * attempt count. Empty state → { averageScorePercent: 0, totalQuizzes: 0 }.
 *
 * @param {object} args
 * @param {string} args.uid
 * @returns {Promise<{averageScorePercent:number, totalQuizzes:number}>}
 */
async function getOverview({ uid }) {
  const snap = await attemptsCol(uid).get();
  const attempts = snap.docs.map((d) => d.data() || {});
  const totalQuizzes = attempts.length;
  if (totalQuizzes === 0) {
    return { averageScorePercent: 0, totalQuizzes: 0 };
  }
  const sum = attempts.reduce((acc, a) => {
    const p = Number(a.scorePercent);
    return acc + (Number.isFinite(p) ? p : 0);
  }, 0);
  const averageScorePercent = Math.round(sum / totalQuizzes);
  return { averageScorePercent, totalQuizzes };
}

/**
 * Returns the user's stored profile photo, or null if none has been set.
 *
 * @param {object} args
 * @param {string} args.uid
 * @returns {Promise<{photoData: string|null}>}
 */
async function getPhoto({ uid }) {
  const snap = await userDoc(uid).get();
  const data = snap.exists ? snap.data() || {} : {};
  return { photoData: data.photoData || null };
}

/**
 * Saves the user's profile photo as a base64 data-URI string directly on the
 * `users/{uid}` document (no Cloud Storage — kept simple per product decision).
 *
 * @param {object} args
 * @param {string} args.uid
 * @param {string} args.photoData - data URI, e.g. "data:image/jpeg;base64,...."
 * @returns {Promise<{photoData: string}>}
 */
async function savePhoto({ uid, photoData }) {
  if (typeof photoData !== 'string' || !photoData.startsWith('data:image/')) {
    throw new Error('photoData must be an image data URI');
  }
  if (photoData.length > MAX_PHOTO_LENGTH) {
    throw new Error('photoData exceeds the maximum allowed size');
  }
  await userDoc(uid).set({ photoData }, { merge: true });
  return { photoData };
}

module.exports = { getOverview, getPhoto, savePhoto, MAX_PHOTO_LENGTH };
