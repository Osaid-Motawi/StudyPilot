import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  currentUser,
  updateDisplayName,
  changeEmail,
  changePassword,
} from '../services/authService.js';

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
