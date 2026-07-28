import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import {
  useProfileData,
  TYPE_LABELS,
  TYPE_ICONS,
} from '../hooks/useProfileData.js';
import { signOut } from '../services/authService.js';

// Profile: read-only account summary (name + email, with an Edit button that
// routes to /profile/edit), performance overview, and full quiz history.
// Data + attempt loading live in the shared useProfileData hook (also used by
// the MUI design); this file is only the Classic presentation.
export default function ProfilePage({ onOpenAttempt }) {
  const {
    overview,
    attempts,
    photoData,
    loading,
    error,
    displayName,
    email,
    openAttempt: loadAttempt,
  } = useProfileData();

  async function openAttempt(attemptId) {
    const full = await loadAttempt(attemptId);
    if (full) onOpenAttempt(full);
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
              <LogOut size={15} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: '0.4rem' }} />
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
