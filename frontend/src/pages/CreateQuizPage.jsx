import { useState } from 'react';
import {
  createQuizFromText,
  createQuizFromFile,
} from '../services/apiClient.js';

// US1 (paste notes) + US2 (upload PDF/.txt). Preserves the user's input and
// offers a retry on retryable failures (502/504, FR-012); shows a
// "needs more material" message on 422 and a clear rejection on 400.
export default function CreateQuizPage({ onQuizCreated }) {
  const [mode, setMode] = useState('paste'); // 'paste' | 'upload'
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null); // { message, retryable }

  const canSubmit =
    mode === 'paste' ? text.trim().length > 0 : Boolean(file);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const opts = title.trim() ? { title: title.trim() } : {};
      const quiz =
        mode === 'paste'
          ? await createQuizFromText({ text, ...opts })
          : await createQuizFromFile(file, opts);
      onQuizCreated(quiz);
    } catch (err) {
      // Input (text/file state) is intentionally preserved so the user can retry.
      const status = err?.status;
      let message = err?.message || 'Something went wrong. Please try again.';
      if (status === 422) {
        message =
          err?.message ||
          'This material needs more content to generate a quiz. Please add more.';
      } else if (status === 400) {
        message =
          err?.message ||
          'That file could not be used. Accepted formats are PDF and .txt.';
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
      <h1>Create a Quiz</h1>

      <div className="mode-toggle" role="tablist">
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

      <form onSubmit={handleSubmit}>
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
              rows={12}
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

        <button type="submit" disabled={!canSubmit || busy}>
          {busy ? 'Generating…' : 'Generate Quiz'}
        </button>
      </form>

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
    </div>
  );
}
