import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  useCreateQuiz,
  QUESTION_TYPES,
  TYPE_LABELS,
  COUNT_PRESETS,
  MIN_QUESTIONS,
  MAX_QUESTIONS,
  clampCount,
} from '../hooks/useCreateQuiz.js';

// MUI presentation of Create Quiz. Same shared useCreateQuiz hook as the Classic
// page (single source of truth); only the chrome is Material. Question-type
// emoji are content vocabulary and stay identical across both designs.
export default function MuiCreateQuizPage({ onQuizCreated }) {
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
    <Box sx={{ maxWidth: 1080, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h1">Create a Quiz</Typography>
        <Typography color="text.secondary">
          Turn your notes or a document into a quiz — choose the type and length.
        </Typography>
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 19rem' },
          alignItems: 'start',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          {/* 1. Question type */}
          <Card>
            <CardContent>
              <Typography variant="h2">Question type</Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  gap: 1.5,
                  mt: 1,
                }}
              >
                {QUESTION_TYPES.map((qt) => {
                  const active = questionType === qt.value;
                  return (
                    <Card
                      key={qt.value}
                      variant="outlined"
                      sx={{
                        borderColor: active ? 'primary.main' : 'divider',
                        borderWidth: 2,
                        bgcolor: active ? 'action.selected' : 'background.paper',
                      }}
                    >
                      <CardActionArea
                        onClick={() => setQuestionType(qt.value)}
                        aria-label={qt.label}
                        sx={{ p: 1.5 }}
                      >
                        <Typography sx={{ fontSize: '1.3rem' }} aria-hidden="true">
                          {qt.icon}
                        </Typography>
                        <Typography sx={{ fontWeight: 700, color: active ? 'primary.main' : 'text.primary' }}>
                          {qt.label}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {qt.desc}
                        </Typography>
                      </CardActionArea>
                    </Card>
                  );
                })}
              </Box>
            </CardContent>
          </Card>

          {/* 2. Number of questions */}
          <Card>
            <CardContent>
              <Typography variant="h2">Number of questions</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {COUNT_PRESETS.map((n) => (
                  <Button
                    key={n}
                    variant={numQuestions === n ? 'contained' : 'outlined'}
                    onClick={() => setNumQuestions(n)}
                    sx={{ minWidth: 56 }}
                  >
                    {n}
                  </Button>
                ))}
                <TextField
                  type="number"
                  size="small"
                  label="Custom"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(e.target.value)}
                  onBlur={(e) => setNumQuestions(clampCount(e.target.value))}
                  inputProps={{ min: MIN_QUESTIONS, max: MAX_QUESTIONS }}
                  sx={{ width: 110 }}
                />
              </Box>
              {questionType === 'matching' && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Matching quizzes use 3–10 pairs, so the count is capped to that range.
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* 3. Study material */}
          <Card>
            <CardContent>
              <Typography variant="h2">Study material</Typography>
              <Tabs
                value={mode}
                onChange={(e, v) => setMode(v)}
                sx={{ mb: 2 }}
              >
                <Tab value="paste" label="Paste notes" />
                <Tab value="upload" label="Upload file" />
              </Tabs>

              <TextField
                fullWidth
                label="Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Photosynthesis Basics"
                sx={{ mb: 2 }}
              />

              {mode === 'paste' ? (
                <TextField
                  fullWidth
                  multiline
                  minRows={10}
                  label="Study notes"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste or type your study notes here…"
                />
              ) : (
                <Button variant="outlined" component="label" fullWidth sx={{ py: 1.5 }}>
                  {file ? file.name : 'Choose a PDF or .txt file'}
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.txt,application/pdf,text/plain"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </Button>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Sticky summary + generate */}
        <Card sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
          <CardContent>
            <Typography variant="h2">Summary</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, my: 1.5 }}>
              <Chip
                label={TYPE_LABELS[questionType]}
                icon={<span style={{ fontSize: '1rem', marginLeft: 6 }} aria-hidden="true">{activeType.icon}</span>}
                variant="outlined"
                sx={{ justifyContent: 'flex-start' }}
              />
              <Chip label={`${clampCount(numQuestions)} questions`} variant="outlined" sx={{ justifyContent: 'flex-start' }} />
              <Chip
                label={mode === 'paste' ? 'Pasted notes' : file?.name || 'No file chosen'}
                variant="outlined"
                sx={{ justifyContent: 'flex-start' }}
              />
            </Box>

            <Button type="submit" fullWidth disabled={!canSubmit || busy}>
              {busy ? 'Generating…' : 'Generate Quiz'}
            </Button>
          </CardContent>
        </Card>
      </Box>

      <Snackbar
        open={Boolean(error)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="error"
          variant="filled"
          action={
            error?.retryable ? (
              <Button color="inherit" size="small" onClick={generate} disabled={busy}>
                Retry
              </Button>
            ) : null
          }
        >
          {error?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
