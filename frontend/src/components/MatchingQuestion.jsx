// Matching pairing UI (T024). Each left item gets a dropdown to pick the right
// item it matches. Controlled component: it reports the current answer via
// onChange as { questionId, pairs: [{ left, right }] } where `left` and `right`
// are indices into question.leftItems / question.rightItems (per data-model.md,
// AnswerResult.userAnswer for matching is { left:int, right:int }[]).
export default function MatchingQuestion({ question, value, onChange }) {
  const leftItems = question.leftItems || [];
  const rightItems = question.rightItems || [];

  // Map left index -> selected right index (or '' when unset), derived from the
  // current answer value so the control stays controlled.
  const selected = {};
  (value?.pairs || []).forEach((p) => {
    selected[p.left] = p.right;
  });

  function setPair(leftIndex, rightValue) {
    const next = { ...selected };
    if (rightValue === '') {
      delete next[leftIndex];
    } else {
      next[leftIndex] = Number(rightValue);
    }
    const pairs = Object.keys(next)
      .map((k) => ({ left: Number(k), right: next[k] }))
      .sort((a, b) => a.left - b.left);
    onChange({ questionId: question.id, pairs });
  }

  return (
    <ul className="matching">
      {leftItems.map((left, li) => (
        <li key={li} className="matching-row">
          <span className="matching-left">{left}</span>
          <span className="matching-arrow" aria-hidden="true">
            &rarr;
          </span>
          <select
            className="matching-select"
            aria-label={`Match for "${left}"`}
            value={selected[li] ?? ''}
            onChange={(e) => setPair(li, e.target.value)}
          >
            <option value="">Select a match…</option>
            {rightItems.map((right, ri) => (
              <option key={ri} value={ri}>
                {right}
              </option>
            ))}
          </select>
        </li>
      ))}
    </ul>
  );
}
