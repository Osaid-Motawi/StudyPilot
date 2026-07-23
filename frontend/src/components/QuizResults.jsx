// Renders a graded attempt: overall score plus a per-question breakdown with the
// user's answer, the correct answer, and (for short answers) the rationale.
export default function QuizResults({ result, onBack }) {
  if (!result) return <p>No results to display.</p>;

  const { score, totalQuestions, scorePercent, answers = [] } = result;

  function renderUserAnswer(a) {
    if (a.type === 'mcq') {
      return a.userAnswer === null || a.userAnswer === undefined
        ? '(no answer)'
        : String(a.userAnswer);
    }
    return a.userAnswer ? a.userAnswer : '(no answer)';
  }

  return (
    <div className="quiz-results">
      <h2>Your Results</h2>
      <p className="score">
        Score: <strong>{score}</strong> / {totalQuestions}
        {scorePercent != null && <span> ({scorePercent}%)</span>}
      </p>

      <ol className="breakdown">
        {answers.map((a, idx) => (
          <li
            key={a.questionId}
            className={a.isCorrect ? 'correct' : 'incorrect'}
          >
            <p className="verdict">
              <strong>Q{idx + 1}.</strong>{' '}
              {a.isCorrect ? '✓ Correct' : '✗ Incorrect'}
            </p>
            <p>
              Your answer: <span className="user-answer">{renderUserAnswer(a)}</span>
            </p>
            <p>
              Correct answer:{' '}
              <span className="correct-answer">{a.correctAnswer}</span>
            </p>
            {a.rationale && (
              <p className="rationale">
                <em>{a.rationale}</em>
              </p>
            )}
          </li>
        ))}
      </ol>

      {onBack && (
        <button type="button" onClick={onBack}>
          Back
        </button>
      )}
    </div>
  );
}
