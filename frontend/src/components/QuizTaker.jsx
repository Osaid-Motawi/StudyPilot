import { useState } from 'react';

// Renders a quiz for taking (answers hidden). Collects MCQ selections and
// short-answer text, allows blanks, and calls onSubmit(answers) where each
// answer is { questionId, mcqOptionIndex } or { questionId, text }.
export default function QuizTaker({ quiz, onSubmit, submitting }) {
  const [answers, setAnswers] = useState({});

  function setMcq(questionId, optionIndex) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { questionId, mcqOptionIndex: optionIndex },
    }));
  }

  function setShort(questionId, text) {
    setAnswers((prev) => ({ ...prev, [questionId]: { questionId, text } }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    // Include one entry per question; unanswered questions are omitted here and
    // scored incorrect by the backend (FR-016).
    const payload = quiz.questions
      .map((q) => answers[q.id])
      .filter(Boolean);
    onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="quiz-taker">
      <h2>{quiz.title || 'Quiz'}</h2>
      <ol className="questions">
        {quiz.questions.map((q, idx) => (
          <li key={q.id} className="question">
            <p className="prompt">
              <strong>Q{idx + 1}.</strong> {q.prompt}
            </p>

            {q.type === 'mcq' ? (
              <ul className="options">
                {q.options.map((opt, oi) => (
                  <li key={oi}>
                    <label>
                      <input
                        type="radio"
                        name={q.id}
                        value={oi}
                        checked={answers[q.id]?.mcqOptionIndex === oi}
                        onChange={() => setMcq(q.id, oi)}
                      />
                      {opt}
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <input
                type="text"
                className="short-answer"
                aria-label={`Answer for question ${idx + 1}`}
                value={answers[q.id]?.text || ''}
                onChange={(e) => setShort(q.id, e.target.value)}
                placeholder="Your answer"
              />
            )}
          </li>
        ))}
      </ol>

      <button type="submit" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit Answers'}
      </button>
    </form>
  );
}
