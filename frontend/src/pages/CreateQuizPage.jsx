import { useState } from 'react';
import { createQuizFromText, createQuizFromFile } from '../services/apiClient.js';

// Create a quiz from pasted notes or an uploaded PDF/.txt. Pick a single question
// type + how many questions. Preserves input and offers a retry on failure.
const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple-choice', desc: 'Pick the correct option' },
  { value: 'fill_blank', label: 'Fill-in-the-blank', desc: 'Complete the missing word' },
  { value: 'essay', label: 'Essay', desc: 'Write a free-response answer' },
  { value: 'matching', label: 'Matching', desc: 'Match items across two columns' },
];

const COUNT_PRESETS = [5, 10, 20, 50];
const MIN_QUESTIONS = 1;
const MAX_QUESTIONS = 100;

function clampCount(n) {
  const v = Math.trunc(Number(n));
  if (!Number.isFinite(v)) return MIN_QUESTIONS;
  return Math.max(MIN_QUESTIONS, Math.min(MAX_QUESTIONS, v));
}

export default function CreateQuizPage({ onQuizCreated }) {
  const [mode, setMode] = useState('paste'); // 'paste' | 'upload'
  const [questionType, setQuestionType] = useState('mcq');
  const [numQuestions, setNumQuestions] = useState(5);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null); // { message, retryable }

  const canSubmit = mode === 'paste' ? text.trim().length > 0 : Boolean(file);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const opts = { questionType, numQuestions: clampCount(numQuestions) };
      if (title.trim()) opts.title = title.trim();
      const quiz =
        mode === 'paste'
          ? await createQuizFromText({ text, ...opts })
          : await createQuizFromFile(file, opts);
      onQuizCreated(quiz);
    } catch (err) {
      const status = err?.status;
      let message = err?.message || 'Something went wrong. Please try again.';
      if (status === 422) {
        message =
          err?.message ||
          'This material needs more content to generate a quiz. Please add more.';
      } else if (status === 400) {
        message =
          err?.message ||
          'That file could not be used. Accepted: PDF or .txt.';
      }
      setError({ message, retryable: Boolean(err?.retryable) });
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    generate();
  }

  return (
    <div className="create-quiz-page">
      <header className="page-header">
        <h1>Create a Quiz</h1>
        <p className="subtitle">
          Turn your notes or a document into a quiz — choose the type and length.
        </p>
      </header>

      <form className="card create-form" onSubmit={handleSubmit}>
        {/* 1. Question type */}
        <div className="form-section">
          <div className="section-label">Question type</div>
          <div className="type-grid" role="tablist" aria-label="Question type">
            {QUESTION_TYPES.map((qt) => (
              <button
                key={qt.value}
                type="button"
                role="tab"
                aria-label={qt.label}
                aria-selected={questionType === qt.value}
                className={`type-card${questionType === qt.value ? ' active' : ''}`}
                onClick={() => setQuestionType(qt.value)}
              >
                <span className="type-title">{qt.label}</span>
                <span className="type-desc">{qt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Number of questions */}
        <div className="form-section">
          <div className="section-label">Number of questions</div>
          <div className="num-questions">
            <div className="mode-toggle" role="group" aria-label="Number of questions presets">
              {COUNT_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={numQuestions === n}
                  className={numQuestions === n ? 'active' : ''}
                  onClick={() => setNumQuestions(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <input
              type="number"
              className="num-input"
              min={MIN_QUESTIONS}
              max={MAX_QUESTIONS}
              value={numQuestions}
              aria-label="Number of questions"
              onChange={(e) => setNumQuestions(e.target.value)}
              onBlur={(e) => setNumQuestions(clampCount(e.target.value))}
            />
          </div>
          {questionType === 'matching' && (
            <p className="hint">Matching quizzes use 3–10 pairs, so the count is capped to that range.</p>
          )}
        </div>

        {/* 3. Study material */}
        <div className="form-section">
          <div className="section-label">Study material</div>
          <div className="mode-toggle" role="tablist" aria-label="Material source">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'paste'}
              className={mode === 'paste' ? 'active' : ''}
              onClick={() => setMode('paste')}
            >
              Paste notes
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'upload'}
              className={mode === 'upload' ? 'active' : ''}
              onClick={() => setMode('upload')}
            >
              Upload file
            </button>
          </div>

          <label>
            Title (optional)
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Photosynthesis Basics"
            />
          </label>

          {mode === 'paste' ? (
            <label>
              Study notes
              <textarea
                aria-label="Study notes"
                rows={10}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste or type your study notes here…"
              />
            </label>
          ) : (
            <label>
              Document (PDF or .txt)
              <input
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                aria-label="Study document"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          )}
        </div>

        <button type="submit" className="btn-block" disabled={!canSubmit || busy}>
          {busy ? 'Generating…' : 'Generate Quiz'}
        </button>

        {error && (
          <div className="error" role="alert">
            <p>{error.message}</p>
            {error.retryable && (
              <button type="button" onClick={generate} disabled={busy}>
                Retry
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
