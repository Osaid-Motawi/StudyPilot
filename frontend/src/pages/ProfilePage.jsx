import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProfileOverview, listAttempts, getAttempt } from '../services/apiClient.js';
import { currentUser } from '../services/authService.js';

// Profile: read-only account summary (name + email, with an Edit button that
// routes to /profile/edit), performance overview, and full quiz history.
const TYPE_LABELS = {
  mcq: 'Multiple-choice',
  fill_blank: 'Fill-in-the-blank',
  essay: 'Essay',
  matching: 'Matching',
};

export default function ProfilePage({ onOpenAttempt }) {
  const [overview, setOverview] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const user = currentUser();
  const displayName = user?.displayName || '';
  const email = user?.email || '';

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [ov, at] = await Promise.all([getProfileOverview(), listAttempts()]);
        if (!active) return;
        setOverview(ov || { averageScorePercent: 0, totalQuizzes: 0 });
        setAttempts(at?.attempts || []);
      } catch (err) {
        if (active) setError(err?.message || 'Could not load your profile.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function openAttempt(attemptId) {
    setError('');
    try {
      const full = await getAttempt(attemptId);
      onOpenAttempt(full);
    } catch (err) {
      setError(err?.message || 'Could not open that quiz for review.');
    }
  }

  function fmt(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? ts : d.toLocaleString();
  }
  const typeLabel = (t) => TYPE_LABELS[t] || t || '—';

  if (loading) return <p>Loading profile…</p>;

  const initials = (displayName || email || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="profile-page">
      <header className="page-header">
        <h1>Profile</h1>
        <p className="subtitle">Your account overview and quiz history.</p>
      </header>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {/* ---- Account (read-only + Edit) ---- */}
      <section className="card">
        <div className="profile-identity">
          <div className="avatar-lg" aria-hidden="true">
            {initials}
          </div>
          <div className="profile-identity-info">
            <div className="profile-name">{displayName || 'No name set'}</div>
            <div className="muted">{email}</div>
          </div>
          <Link to="/profile/edit" className="btn-ghost edit-profile-btn">
            Edit
          </Link>
        </div>
      </section>

      {/* ---- Overview ---- */}
      <section className="card">
        <h2>Overview</h2>
        <div className="stat-grid">
          <div className="stat">
            <span className="stat-value">{overview?.totalQuizzes ?? 0}</span>
            <span className="stat-label">Quizzes taken</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {overview?.totalQuizzes ? `${overview.averageScorePercent}%` : '—'}
            </span>
            <span className="stat-label">Average score</span>
          </div>
        </div>
      </section>

      {/* ---- History ---- */}
      <section className="card">
        <h2>Your Quizzes</h2>
        {!attempts.length ? (
          <p className="muted">
            You haven&rsquo;t taken any quizzes yet. Create one to start tracking your
            progress.
          </p>
        ) : (
          <table className="attempts-table">
            <thead>
              <tr>
                <th>Quiz</th>
                <th>Type</th>
                <th>Score</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td>{a.quizTitle || a.quizId}</td>
                  <td>{typeLabel(a.questionType)}</td>
                  <td>
                    <span className="badge">
                      {a.score}/{a.totalQuestions}
                      {a.scorePercent != null && ` · ${a.scorePercent}%`}
                    </span>
                  </td>
                  <td>{fmt(a.submittedAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => openAttempt(a.id)}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
