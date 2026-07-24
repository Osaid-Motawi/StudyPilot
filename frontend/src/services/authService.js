import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  verifyBeforeUpdateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { auth } from '../firebase.js';

export function signInWithEmailPassword(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUp(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && displayName.trim()) {
    await updateProfile(cred.user, { displayName: displayName.trim() });
  }
  return cred;
}

export function signOut() {
  return fbSignOut(auth);
}

// ---- Profile editing ------------------------------------------------------

// Update the signed-in user's display name. No reauthentication required.
export async function updateDisplayName(name) {
  await updateProfile(auth.currentUser, { displayName: name });
  return auth.currentUser;
}

// Re-authenticate with the current password — required by Firebase before
// security-sensitive changes (email/password).
export function reauthenticate(currentPassword) {
  const user = auth.currentUser;
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  return reauthenticateWithCredential(user, cred);
}

// Change password (requires the current password to reauthenticate).
export async function changePassword(currentPassword, newPassword) {
  await reauthenticate(currentPassword);
  return updatePassword(auth.currentUser, newPassword);
}

// Change email: sends a verification link to the NEW address; the email is
// updated only after the user clicks that link (Firebase's current, safe flow).
export async function changeEmail(currentPassword, newEmail) {
  await reauthenticate(currentPassword);
  return verifyBeforeUpdateEmail(auth.currentUser, newEmail);
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
