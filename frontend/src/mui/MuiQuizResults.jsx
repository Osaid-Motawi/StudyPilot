import { Box, Card, CardContent, Typography, Chip, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// MUI-styled twin of the Classic QuizResults: overall score plus a per-question
// breakdown that adapts to the question type. Mirrors Classic's data handling
// exactly; only the presentation is Material.
export default function MuiQuizResults({ result, onBack }) {
  if (!result) return <Typography>No results to display.</Typography>;

  const { score, totalQuestions, scorePercent, answers = [] } = result;

  // Render one pairing list ("Left → Right") from an array of {left,right}
  // indices, using item labels when the answer carries them.
  function renderPairs(pairs, leftItems, rightItems) {
    if (!Array.isArray(pairs) || pairs.length === 0) return '(no answer)';
    return (
      <Box component="ul" sx={{ m: 0, pl: 3 }}>
        {pairs.map((p, i) => {
          const left = leftItems?.[p.left] ?? `Left ${p.left + 1}`;
          const right =
            p.right == null ? '(none)' : rightItems?.[p.right] ?? `Right ${p.right + 1}`;
          return (
            <Box component="li" key={i}>
              {`${left} → ${right}`}
            </Box>
          );
        })}
      </Box>
    );
  }

  function renderUserAnswer(a) {
    if (a.type === 'mcq') {
      if (a.userAnswer === null || a.userAnswer === undefined) return '(no answer)';
      return a.userAnswerText ?? String(a.userAnswer);
    }
    if (a.type === 'matching') {
      return renderPairs(a.userAnswer, a.leftItems, a.rightItems);
    }
    // fill_blank + essay are free text.
    return a.userAnswer ? a.userAnswer : '(no answer)';
  }

  // Correctness rule: essay uses its numeric score (null -> neutral, >=50 ->
  // correct, else incorrect); everything else uses the binary isCorrect.
  function correctness(a) {
    if (a.type === 'essay') {
      if (a.questionScore == null) return 'neutral';
      return a.questionScore >= 50 ? 'correct' : 'incorrect';
    }
    return a.isCorrect ? 'correct' : 'incorrect';
  }

  function verdictChip(a) {
    const state = correctness(a);
    let label;
    if (a.type === 'essay') {
      const s = a.questionScore;
      label = `Score: ${s != null ? `${s} / 100` : 'graded'}`;
    } else {
      label = a.isCorrect ? '✓ Correct' : '✗ Incorrect';
    }
    const color = state === 'correct' ? 'success' : state === 'incorrect' ? 'error' : 'default';
    return <Chip size="small" color={color} label={label} />;
  }

  function accentColor(a) {
    const state = correctness(a);
    if (state === 'correct') return 'success.main';
    if (state === 'incorrect') return 'error.main';
    return 'divider';
  }

  return (
    <Box
      sx={{
        maxWidth: 820,
        mx: 'auto',
        p: { xs: 2, md: 3 },
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Typography variant="h1">Your Results</Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography variant="h5" component="p">
          Score: <strong>{score}</strong> / {totalQuestions}
        </Typography>
        {scorePercent != null && (
          <Chip color="primary" label={`${scorePercent}%`} />
        )}
      </Box>

      {answers.map((a, idx) => (
        <Card
          key={a.questionId}
          elevation={3}
          sx={{ borderLeft: 4, borderColor: accentColor(a) }}
        >
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography component="span" sx={{ fontWeight: 700 }}>
                Q{idx + 1}.
              </Typography>
              {verdictChip(a)}
            </Box>

            <Typography component="div">
              Your answer: {renderUserAnswer(a)}
            </Typography>

            {a.type === 'essay' ? (
              a.feedback && (
                <Typography sx={{ fontStyle: 'italic' }}>{a.feedback}</Typography>
              )
            ) : (
              <>
                <Typography component="div">
                  Correct answer:{' '}
                  {a.type === 'matching'
                    ? renderPairs(a.correctPairs, a.leftItems, a.rightItems)
                    : a.correctAnswer}
                </Typography>
                {a.rationale && (
                  <Typography sx={{ fontStyle: 'italic' }}>{a.rationale}</Typography>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ))}

      {onBack && (
        <Button
          variant="outlined"
          onClick={onBack}
          startIcon={<ArrowBackIcon />}
          sx={{ alignSelf: 'flex-start' }}
        >
          Back to Profile
        </Button>
      )}
    </Box>
  );
}
