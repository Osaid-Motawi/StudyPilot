import {
  useCreateQuiz,
  QUESTION_TYPES,
  TYPE_LABELS,
  COUNT_PRESETS,
  MIN_QUESTIONS,
  MAX_QUESTIONS,
  clampCount,
} from '../hooks/useCreateQuiz.js';

// Create a quiz from pasted notes or an uploaded PDF/.txt. Pick a single question
// type + how many questions. Preserves input and offers a retry on failure.
// All form/generate logic lives in the shared useCreateQuiz hook (also used by
// the MUI design); this file is only the Classic presentation.
export default function CreateQuizPage({ onQuizCreated }) {
  const {
    mode, setMode,
    questionType, setQuestionType,
    numQuestions, setNumQuestions,
    text, setText,
    title, setTitle,
    file, setFile,
    busy, error,
    canSubmit, activeType,
    handleSubmit, generate,
  } = useCreateQuiz(onQuizCreated);

  return (
    <div className="create-quiz-page">
      <header className="page-header">
        <h1>Create a Quiz</h1>
        <p className="subtitle">
          Turn your notes or a document into a quiz — choose the type and length.
        </p>
      </header>

      <form className="create-layout" onSubmit={handleSubmit}>
        <div className="create-main">
          {/* 1. Question type */}
          <div className="card form-section">
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
                  <span className="type-icon" aria-hidden="true">
                    {qt.icon}
                  </span>
                  <span className="type-title">{qt.label}</span>
                  <span className="type-desc">{qt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Number of questions */}
          <div className="card form-section">
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
          <div className="card form-section">
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
        </div>

        {/* Sticky summary + generate action */}
        <aside className="create-summary card">
          <div className="section-label">Summary</div>
          <ul className="summary-list">
            <li>
              <span className="summary-icon" aria-hidden="true">
                {activeType.icon}
              </span>
              <span>{TYPE_LABELS[questionType]}</span>
            </li>
            <li>
              <span className="summary-icon" aria-hidden="true">
                #
              </span>
              <span>{clampCount(numQuestions)} questions</span>
            </li>
            <li>
              <span className="summary-icon" aria-hidden="true">
                {mode === 'paste' ? '📋' : '📄'}
              </span>
              <span>{mode === 'paste' ? 'Pasted notes' : file?.name || 'No file chosen'}</span>
            </li>
          </ul>

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
        </aside>
      </form>
    </div>
  );
}
