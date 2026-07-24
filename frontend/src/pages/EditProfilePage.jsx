import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  currentUser,
  updateDisplayName,
  changeEmail,
  changePassword,
} from '../services/authService.js';
import { getProfile, updateProfilePhoto } from '../services/apiClient.js';

// Photos are stored as a base64 data URI directly on the Firestore user doc
// (no Cloud Storage bucket needed). Downscale client-side first so the
// resulting string stays well under Firestore's 1 MiB document limit.
const MAX_PHOTO_DIMENSION = 256;
const PHOTO_JPEG_QUALITY = 0.82;

function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', PHOTO_JPEG_QUALITY));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('Could not read that image.'));
    img.src = URL.createObjectURL(file);
  });
}

// Dedicated edit screen reached from the Profile page's "Edit" button.
// Edit display name, email (via verification link), and password.
function friendlyAuthError(err) {
  const code = err?.code || '';
  if (code.includes('wrong-password') || code.includes('invalid-credential'))
    return 'Current password is incorrect.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Try again later.';
  if (code.includes('requires-recent-login')) return 'Please sign out and back in, then retry.';
  if (code.includes('email-already-in-use')) return 'That email is already in use.';
  if (code.includes('invalid-email')) return 'That email address is not valid.';
  if (code.includes('weak-password')) return 'Password should be at least 6 characters.';
  return err?.message || 'Something went wrong. Please try again.';
}

function Note({ msg }) {
  if (!msg) return null;
  return (
    <p className={msg.type === 'ok' ? 'form-ok' : 'form-err'} role="alert">
      {msg.text}
    </p>
  );
}

export default function EditProfilePage() {
  const navigate = useNavigate();
  const [name, setName] = useState(currentUser()?.displayName || '');
  const [nameMsg, setNameMsg] = useState(null);
  const [newEmail, setNewEmail] = useState('');
  const [emailPw, setEmailPw] = useState('');
  const [emailMsg, setEmailMsg] = useState(null);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState(null);
  const [busy, setBusy] = useState('');

  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoMsg, setPhotoMsg] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    getProfile()
      .then((p) => active && setPhotoPreview(p?.photoData || null))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function handlePhotoChosen(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoMsg(null);
    try {
      const dataUri = await resizeImageFile(file);
      setPhotoPreview(dataUri);
    } catch (err) {
      setPhotoMsg({ type: 'err', text: err?.message || 'Could not read that image.' });
    }
  }

  async function savePhoto() {
    if (!photoPreview) return;
    setPhotoMsg(null);
    setBusy('photo');
    try {
      await updateProfilePhoto(photoPreview);
      setPhotoMsg({ type: 'ok', text: 'Photo updated.' });
    } catch (err) {
      setPhotoMsg({ type: 'err', text: err?.message || 'Could not save photo.' });
    } finally {
      setBusy('');
    }
  }

  async function saveName(e) {
    e.preventDefault();
    setNameMsg(null);
    setBusy('name');
    try {
      await updateDisplayName(name.trim());
      setNameMsg({ type: 'ok', text: 'Name updated.' });
    } catch (err) {
      setNameMsg({ type: 'err', text: friendlyAuthError(err) });
    } finally {
      setBusy('');
    }
  }

  async function saveEmail(e) {
    e.preventDefault();
    setEmailMsg(null);
    setBusy('email');
    try {
      await changeEmail(emailPw, newEmail.trim());
      setEmailMsg({
        type: 'ok',
        text: `Verification link sent to ${newEmail.trim()}. Your email changes after you click it.`,
      });
      setNewEmail('');
      setEmailPw('');
    } catch (err) {
      setEmailMsg({ type: 'err', text: friendlyAuthError(err) });
    } finally {
      setBusy('');
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPwMsg(null);
    setBusy('pw');
    try {
      await changePassword(curPw, newPw);
      setPwMsg({ type: 'ok', text: 'Password updated.' });
      setCurPw('');
      setNewPw('');
    } catch (err) {
      setPwMsg({ type: 'err', text: friendlyAuthError(err) });
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="edit-profile-page">
      <header className="page-header">
        <button type="button" className="btn-ghost back-link" onClick={() => navigate('/profile')}>
          ← Back to profile
        </button>
        <h1>Edit profile</h1>
        <p className="subtitle">Update your name, email, and password.</p>
      </header>

      <section className="card">
        <h2>Profile photo</h2>
        <div className="photo-editor">
          <div className="photo-preview" aria-hidden="true">
            {photoPreview ? (
              <img src={photoPreview} alt="" />
            ) : (
              (currentUser()?.displayName || currentUser()?.email || '?')
                .trim()
                .charAt(0)
                .toUpperCase()
            )}
          </div>
          <div className="photo-editor-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              aria-label="Profile photo"
              onChange={handlePhotoChosen}
            />
            <button type="button" onClick={savePhoto} disabled={!photoPreview || busy === 'photo'}>
              {busy === 'photo' ? 'Saving…' : 'Save photo'}
            </button>
            <Note msg={photoMsg} />
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Display name</h2>
        <form onSubmit={saveName}>
          <label>
            Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </label>
          <button type="submit" disabled={busy === 'name'}>
            {busy === 'name' ? 'Saving…' : 'Save name'}
          </button>
          <Note msg={nameMsg} />
        </form>
      </section>

      <section className="card">
        <h2>Email</h2>
        <form onSubmit={saveEmail}>
          <label>
            New email
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new@email.com"
              required
            />
          </label>
          <label>
            Current password
            <input
              type="password"
              value={emailPw}
              onChange={(e) => setEmailPw(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>
          <button type="submit" disabled={busy === 'email'}>
            {busy === 'email' ? 'Sending…' : 'Change email'}
          </button>
          <Note msg={emailMsg} />
        </form>
      </section>

      <section className="card">
        <h2>Password</h2>
        <form onSubmit={savePassword}>
          <label>
            Current password
            <input
              type="password"
              value={curPw}
              onChange={(e) => setCurPw(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>
          <label>
            New password
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="At least 6 characters"
              required
            />
          </label>
          <button type="submit" disabled={busy === 'pw'}>
            {busy === 'pw' ? 'Updating…' : 'Change password'}
          </button>
          <Note msg={pwMsg} />
        </form>
      </section>
    </div>
  );
}
