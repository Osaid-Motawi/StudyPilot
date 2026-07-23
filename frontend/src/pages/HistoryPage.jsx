import { useEffect, useState } from 'react';
import {
  listQuizzes,
  listAttempts,
  getAttempt,
} from '../services/apiClient.js';

// US3: list generated quizzes and past attempts (score + date), show scores
// across attempts to gauge progress, and reopen any attempt into the results view.
export default function HistoryPage({ onOpenAttempt }) {
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [qz, at] = await Promise.all([listQuizzes(), listAttempts()]);
        if (!active) return;
        setQuizzes(qz?.quizzes || []);
        setAttempts(at?.attempts || []);
      } catch (err) {
        if (active) setError(err?.message || 'Could not load your history.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function openAttempt(attemptId) {
    try {
      const full = await getAttempt(attemptId);
      onOpenAttempt(full);
    } catch (err) {
      setError(err?.message || 'Could not open that attempt.');
    }
  }

  function fmt(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? ts : d.toLocaleString();
  }

  if (loading) return <p>Loading history…</p>;

  return (
    <div className="history-page">
      <h1>History</h1>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <section>
        <h2>Your Quizzes</h2>
        {quizzes.length === 0 ? (
          <p>No quizzes yet. Create one to get started.</p>
        ) : (
          <ul className="quiz-list">
            {quizzes.map((q) => (
              <li key={q.id}>
                <strong>{q.title || 'Untitled quiz'}</strong>
                {' — '}
                {q.questionCount != null && (
                  <span>{q.questionCount} questions · </span>
                )}
                <span>{q.sourceType}</span>
                {' · '}
                <span>{fmt(q.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Your Attempts (progress)</h2>
        {attempts.length === 0 ? (
          <p>No attempts yet.</p>
        ) : (
          <table className="attempts-table">
            <thead>
              <tr>
                <th>Quiz</th>
                <th>Score</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td>{a.quizTitle || a.quizId}</td>
                  <td>
                    {a.score}/{a.totalQuestions}
                    {a.scorePercent != null && ` (${a.scorePercent}%)`}
                  </td>
                  <td>{fmt(a.submittedAt)}</td>
                  <td>
                    <button type="button" onClick={() => openAttempt(a.id)}>
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
