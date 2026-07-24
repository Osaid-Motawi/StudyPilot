'use strict';

const { getDb } = require('../clients/firestoreClient');

function attemptsCol(uid) {
  return getDb().collection('users').doc(uid).collection('attempts');
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

module.exports = { getOverview };
