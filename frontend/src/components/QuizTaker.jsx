import { useState } from 'react';
import MatchingQuestion from './MatchingQuestion.jsx';

// Renders a quiz for taking (answers hidden). Dispatches on question.type and
// collects a per-type answer, allowing blanks. Submit payload per type:
//   mcq       -> { questionId, mcqOptionIndex: int }
//   fill_blank-> { questionId, text: string }
//   essay     -> { questionId, text: string }
//   matching  -> { questionId, pairs: [{ left:int, right:int }] }
// Unanswered questions are omitted and scored incorrect/zero by the backend.
export default function QuizTaker({ quiz, onSubmit, submitting }) {
  const [answers, setAnswers] = useState({});

  function setAnswer(questionId, answer) {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }

  function setMcq(questionId, optionIndex) {
    setAnswer(questionId, { questionId, mcqOptionIndex: optionIndex });
  }

  function setText(questionId, text) {
    setAnswer(questionId, { questionId, text });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = quiz.questions
      .map((q) => answers[q.id])
      .filter(Boolean);
    onSubmit(payload);
  }

  function renderInput(q, idx) {
    switch (q.type) {
      case 'mcq':
        return (
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
        );
      case 'essay':
        return (
          <textarea
            className="essay-answer"
            rows={6}
            aria-label={`Answer for question ${idx + 1}`}
            value={answers[q.id]?.text || ''}
            onChange={(e) => setText(q.id, e.target.value)}
            placeholder="Write your response…"
          />
        );
      case 'matching':
        return (
          <MatchingQuestion
            question={q}
            value={answers[q.id]}
            onChange={(answer) => setAnswer(q.id, answer)}
          />
        );
      case 'fill_blank':
      default:
        return (
          <input
            type="text"
            className="short-answer"
            aria-label={`Answer for question ${idx + 1}`}
            value={answers[q.id]?.text || ''}
            onChange={(e) => setText(q.id, e.target.value)}
            placeholder="Your answer"
          />
        );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="quiz-taker">
      <header className="page-header">
        <h1>{quiz.title || 'Quiz'}</h1>
        <p className="subtitle">
          Answer the questions below, then submit to see your score.
        </p>
      </header>
      <ol className="questions">
        {quiz.questions.map((q, idx) => (
          <li key={q.id} className="question">
            <p className="prompt">
              <strong>Q{idx + 1}.</strong> {q.prompt}
            </p>
            {renderInput(q, idx)}
          </li>
        ))}
      </ol>

      <button type="submit" className="btn-block" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit Answers'}
      </button>
    </form>
  );
}
