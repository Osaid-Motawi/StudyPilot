import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormControl,
  InputLabel,
  TextField,
  Select,
  MenuItem,
  Button,
} from '@mui/material';

// MUI-styled twin of the Classic QuizTaker. Renders a quiz for taking (answers
// hidden), dispatches on question.type, and collects a per-type answer keyed by
// question id. Submit payload shapes are byte-for-byte identical to the Classic
// component (the backend depends on them):
//   mcq       -> { questionId, mcqOptionIndex: int }
//   fill_blank-> { questionId, text: string }
//   essay     -> { questionId, text: string }
//   matching  -> { questionId, pairs: [{ left:int, right:int }] }
// Unanswered questions are omitted and scored incorrect/zero by the backend.
export default function MuiQuizTaker({ quiz, onSubmit, submitting }) {
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

  // Matching: mirror MatchingQuestion's answer shape exactly. Derive the
  // left->right selection map from the current answer's pairs, update it, then
  // rebuild a sorted pairs array of { left:Number, right:Number }.
  function setMatch(q, leftIndex, rightValue) {
    const selected = {};
    (answers[q.id]?.pairs || []).forEach((p) => {
      selected[p.left] = p.right;
    });
    if (rightValue === '') {
      delete selected[leftIndex];
    } else {
      selected[leftIndex] = Number(rightValue);
    }
    const pairs = Object.keys(selected)
      .map((k) => ({ left: Number(k), right: selected[k] }))
      .sort((a, b) => a.left - b.left);
    setAnswer(q.id, { questionId: q.id, pairs });
  }

  function renderInput(q, idx) {
    switch (q.type) {
      case 'mcq':
        return (
          <RadioGroup
            name={q.id}
            value={answers[q.id]?.mcqOptionIndex ?? ''}
          >
            {q.options.map((opt, oi) => (
              <FormControlLabel
                key={oi}
                value={oi}
                control={<Radio />}
                label={opt}
                checked={answers[q.id]?.mcqOptionIndex === oi}
                onChange={() => setMcq(q.id, oi)}
              />
            ))}
          </RadioGroup>
        );
      case 'essay':
        return (
          <TextField
            fullWidth
            multiline
            minRows={6}
            aria-label={`Answer for question ${idx + 1}`}
            value={answers[q.id]?.text || ''}
            onChange={(e) => setText(q.id, e.target.value)}
            placeholder="Write your response…"
          />
        );
      case 'matching': {
        const selected = {};
        (answers[q.id]?.pairs || []).forEach((p) => {
          selected[p.left] = p.right;
        });
        const leftItems = q.leftItems || [];
        const rightItems = q.rightItems || [];
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {leftItems.map((left, li) => (
              <Box
                key={li}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
              >
                <Typography sx={{ flex: 1, minWidth: 0 }}>{left}</Typography>
                <Typography aria-hidden="true" color="text.secondary">
                  &rarr;
                </Typography>
                <FormControl sx={{ minWidth: 220 }} size="small">
                  <InputLabel id={`match-label-${q.id}-${li}`}>
                    Match
                  </InputLabel>
                  <Select
                    labelId={`match-label-${q.id}-${li}`}
                    label="Match"
                    aria-label={`Match for "${left}"`}
                    value={selected[li] ?? ''}
                    onChange={(e) => setMatch(q, li, e.target.value)}
                  >
                    <MenuItem value="">Select a match…</MenuItem>
                    {rightItems.map((right, ri) => (
                      <MenuItem key={ri} value={ri}>
                        {right}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            ))}
          </Box>
        );
      }
      case 'fill_blank':
      default:
        return (
          <TextField
            fullWidth
            aria-label={`Answer for question ${idx + 1}`}
            value={answers[q.id]?.text || ''}
            onChange={(e) => setText(q.id, e.target.value)}
            placeholder="Your answer"
          />
        );
    }
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        maxWidth: 820,
        mx: 'auto',
        p: { xs: 2, md: 3 },
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box>
        <Typography variant="h1">{quiz.title || 'Quiz'}</Typography>
        <Typography color="text.secondary">
          Answer the questions below, then submit to see your score.
        </Typography>
      </Box>

      {quiz.questions.map((q, idx) => (
        <Card key={q.id} elevation={3}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography sx={{ fontWeight: 700 }}>
              Q{idx + 1}. {q.prompt}
            </Typography>
            {renderInput(q, idx)}
          </CardContent>
        </Card>
      ))}

      <Button type="submit" variant="contained" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit Answers'}
      </Button>
    </Box>
  );
}
