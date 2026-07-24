import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getProfileOverview,
  listAttempts,
  getAttempt,
  getProfile,
} from '../services/apiClient.js';
import { currentUser, signOut } from '../services/authService.js';

// Profile: read-only account summary (name + email, with an Edit button that
// routes to /profile/edit), performance overview, and full quiz history.
const TYPE_LABELS = {
  mcq: 'Multiple-choice',
  fill_blank: 'Fill-in-the-blank',
  essay: 'Essay',
  matching: 'Matching',
};

const TYPE_ICONS = {
  mcq: '🔘',
  fill_blank: '✏️',
  essay: '📝',
  matching: '🔗',
};

export default function ProfilePage({ onOpenAttempt }) {
  const [overview, setOverview] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [photoData, setPhotoData] = useState(null);
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
        const [ov, at, profile] = await Promise.all([
          getProfileOverview(),
          listAttempts(),
          getProfile().catch(() => null),
        ]);
        if (!active) return;
        setOverview(ov || { averageScorePercent: 0, totalQuizzes: 0 });
        setAttempts(at?.attempts || []);
        setPhotoData(profile?.photoData || null);
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
  const typeIcon = (t) => TYPE_ICONS[t] || '❓';

  if (loading) return <p>Loading profile…</p>;

  const initials = (displayName || email || '?').trim().charAt(0).toUpperCase();
  const avgScore = overview?.totalQuizzes ? overview.averageScorePercent : 0;

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
      <section className="card profile-hero">
        <div className="profile-banner" aria-hidden="true" />
        <div className="profile-hero-body">
          <div className="avatar-lg profile-hero-avatar" aria-hidden="true">
            {photoData ? <img src={photoData} alt="" /> : initials}
          </div>
          <div className="profile-identity-info">
            <div className="profile-name">{displayName || 'No name set'}</div>
            <div className="muted">{email}</div>
          </div>
          <div className="profile-hero-actions">
            <Link to="/profile/edit" className="btn-ghost edit-profile-btn">
              Edit
            </Link>
            <button type="button" className="btn-ghost" onClick={() => signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </section>

      {/* ---- Overview ---- */}
      <section className="card">
        <h2>Overview</h2>
        <div className="overview-row">
          <div className="score-ring-wrap">
            <div className="score-ring" style={{ '--pct': avgScore }}>
              <span>{overview?.totalQuizzes ? `${avgScore}%` : '—'}</span>
            </div>
            <span className="stat-label">Average score</span>
          </div>
          <div className="stat-grid">
            <div className="stat">
              <span className="stat-icon" aria-hidden="true">
                📚
              </span>
              <span className="stat-value">{overview?.totalQuizzes ?? 0}</span>
              <span className="stat-label">Quizzes taken</span>
            </div>
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
                  <td>
                    <span className="quiz-title-cell">
                      <span className="quiz-type-icon" aria-hidden="true">
                        {typeIcon(a.questionType)}
                      </span>
                      {a.quizTitle || a.quizId}
                    </span>
                  </td>
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
