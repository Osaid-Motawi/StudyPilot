import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../firebase.js';

const googleProvider = new GoogleAuthProvider();

export function signInWithEmailPassword(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signUp(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function signOut() {
  return fbSignOut(auth);
}

// Subscribe to auth state changes. Returns an unsubscribe function.
export function onAuthChanged(callback) {
  return onAuthStateChanged(auth, callback);
}

export function currentUser() {
  return auth.currentUser;
}

// Returns a fresh Firebase ID token for the signed-in user, or null when
// unauthenticated. Sent as `Authorization: Bearer <token>` on every backend call.
export async function getIdToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}
