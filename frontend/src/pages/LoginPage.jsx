import { useState } from 'react';
import {
  signInWithEmailPassword,
  signUp,
  signInWithGoogle,
} from '../services/authService.js';

// Email/password + Google sign-in. On success the auth guard in App redirects
// to the app (the onAuthChanged listener drives navigation).
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password);
      } else {
        await signInWithEmailPassword(email, password);
      }
    } catch (err) {
      setError(err?.message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err?.message || 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <h1>StudyPilot</h1>
      <h2>{mode === 'signup' ? 'Create an account' : 'Sign in'}</h2>

      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={busy}>
          {mode === 'signup' ? 'Sign up' : 'Sign in'}
        </button>
      </form>

      <button type="button" onClick={handleGoogle} disabled={busy}>
        Continue with Google
      </button>

      <p>
        {mode === 'signup'
          ? 'Already have an account?'
          : "Don't have an account?"}{' '}
        <button
          type="button"
          className="link"
          onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
        >
          {mode === 'signup' ? 'Sign in' : 'Sign up'}
        </button>
      </p>

      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
