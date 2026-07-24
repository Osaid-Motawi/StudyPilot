// Renders a graded attempt: overall score plus a per-question breakdown that
// adapts to the question type (T026):
//   mcq        -> selected vs. correct option, correct/incorrect
//   fill_blank -> user text vs. expected, semantic verdict + rationale
//   essay      -> numeric questionScore (0–100) + written feedback
//   matching   -> the user's pairings vs. the correct pairings
export default function QuizResults({ result, onBack }) {
  if (!result) return <p>No results to display.</p>;

  const { score, totalQuestions, scorePercent, answers = [] } = result;

  // Render one pairing list ("Left → Right") from an array of {left,right}
  // indices, using item labels when the answer carries them.
  function renderPairs(pairs, leftItems, rightItems) {
    if (!Array.isArray(pairs) || pairs.length === 0) return '(no answer)';
    return (
      <ul className="pairs">
        {pairs.map((p, i) => {
          const left = leftItems?.[p.left] ?? `Left ${p.left + 1}`;
          const right =
            p.right == null ? '(none)' : rightItems?.[p.right] ?? `Right ${p.right + 1}`;
          return (
            <li key={i}>
              {left} &rarr; {right}
            </li>
          );
        })}
      </ul>
    );
  }

  function renderUserAnswer(a) {
    if (a.type === 'mcq') {
      if (a.userAnswer === null || a.userAnswer === undefined) return '(no answer)';
      // Prefer a display label if the backend provided one.
      return a.userAnswerText ?? String(a.userAnswer);
    }
    if (a.type === 'matching') {
      return renderPairs(a.userAnswer, a.leftItems, a.rightItems);
    }
    // fill_blank + essay are free text.
    return a.userAnswer ? a.userAnswer : '(no answer)';
  }

  // Essay questions carry a numeric score rather than a binary verdict.
  function verdict(a) {
    if (a.type === 'essay') {
      const s = a.questionScore;
      return (
        <span>
          Score: {s != null ? `${s} / 100` : 'graded'}
        </span>
      );
    }
    return a.isCorrect ? '✓ Correct' : '✗ Incorrect';
  }

  function itemClass(a) {
    if (a.type === 'essay') {
      if (a.questionScore == null) return '';
      return a.questionScore >= 50 ? 'correct' : 'incorrect';
    }
    return a.isCorrect ? 'correct' : 'incorrect';
  }

  return (
    <div className="quiz-results">
      <header className="page-header">
        <h1>Your Results</h1>
      </header>
      <p className="score">
        Score: <strong>{score}</strong> / {totalQuestions}
        {scorePercent != null && <span> ({scorePercent}%)</span>}
      </p>

      <ol className="breakdown">
        {answers.map((a, idx) => (
          <li key={a.questionId} className={itemClass(a)}>
            <p className="verdict">
              <strong>Q{idx + 1}.</strong> {verdict(a)}
            </p>
            <p>
              Your answer:{' '}
              <span className="user-answer">{renderUserAnswer(a)}</span>
            </p>

            {a.type === 'essay' ? (
              a.feedback && (
                <p className="rationale">
                  <em>{a.feedback}</em>
                </p>
              )
            ) : (
              <>
                <p>
                  Correct answer:{' '}
                  <span className="correct-answer">
                    {a.type === 'matching'
                      ? renderPairs(a.correctPairs, a.leftItems, a.rightItems)
                      : a.correctAnswer}
                  </span>
                </p>
                {a.rationale && (
                  <p className="rationale">
                    <em>{a.rationale}</em>
                  </p>
                )}
              </>
            )}
          </li>
        ))}
      </ol>

      {onBack && (
        <button type="button" className="btn-ghost" onClick={onBack}>
          Back to Profile
        </button>
      )}
    </div>
  );
}
