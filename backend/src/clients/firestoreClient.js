'use strict';

/**
 * Firestore + Firebase Auth client seam.
 *
 * Initialization is LAZY: firebase-admin is only touched the first time a real
 * handle is requested at runtime. Tests never trigger initialization because
 * they inject mock handles via setDb()/setAuth() before any call.
 */

let _db = null;
let _auth = null;
let _initialized = false;

function init() {
  if (_initialized) return;
  // Lazy require so unit tests that never call getDb()/getAuth() don't need
  // firebase-admin resolved or credentials present.
  // eslint-disable-next-line global-require
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }
  _db = admin.firestore();
  _auth = admin.auth();
  _initialized = true;
}

/** Returns the Firestore handle, initializing firebase-admin on first use. */
function getDb() {
  if (!_db) init();
  return _db;
}

/** Returns the Firebase Auth handle, initializing firebase-admin on first use. */
function getAuth() {
  if (!_auth) init();
  return _auth;
}

/** Test seam: inject a mock Firestore. */
function setDb(mock) {
  _db = mock;
  _initialized = true;
}

/** Test seam: inject a mock Auth. */
function setAuth(mock) {
  _auth = mock;
}

/** Test seam: reset injected handles. */
function reset() {
  _db = null;
  _auth = null;
  _initialized = false;
}

module.exports = { getDb, getAuth, setDb, setAuth, reset };
