import {
  Card,
  CardContent,
  Tabs,
  Tab,
  TextField,
  Button,
  CircularProgress,
  Box,
  Typography,
  Stack,
} from '@mui/material';
import {
  useFocusTimer,
  MODE_ORDER,
  SESSIONS_BEFORE_LONG_BREAK,
  MIN_CUSTOM_MINUTES,
  MAX_CUSTOM_MINUTES,
  formatTime,
} from '../hooks/useFocusTimer.js';

// Pomodoro focus timer, Material UI presentation. All logic lives in the shared
// useFocusTimer hook (also used by the Classic design); this file is only the
// MUI-styled twin of FocusTimerPage.
export default function MuiFocusTimerPage() {
  const {
    mode,
    customMinutes,
    secondsLeft,
    running,
    focusSessionsInCycle,
    sessionsToday,
    pctElapsed,
    modeLabel,
    toggleRunning,
    reset,
    selectMode,
    changeCustomMinutes,
    commitCustomMinutes,
  } = useFocusTimer();

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h1">Focus Timer</Typography>
        <Typography color="text.secondary">
          A Pomodoro timer to structure your study sessions.
        </Typography>
      </Box>

      <Card elevation={3}>
        <CardContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <Tabs
            value={mode}
            onChange={(e, v) => selectMode(v)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Timer mode"
          >
            {MODE_ORDER.map((key) => (
              <Tab key={key} value={key} label={modeLabel(key)} />
            ))}
          </Tabs>

          {mode === 'custom' && (
            <TextField
              type="number"
              label="Minutes"
              value={customMinutes}
              disabled={running}
              onChange={(e) => changeCustomMinutes(e.target.value)}
              onBlur={(e) => commitCustomMinutes(e.target.value)}
              inputProps={{ min: MIN_CUSTOM_MINUTES, max: MAX_CUSTOM_MINUTES }}
            />
          )}

          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            {/* Faint full-circle track so the ring is visible at 0% progress */}
            <CircularProgress
              variant="determinate"
              value={100}
              size={220}
              thickness={3}
              sx={{ color: 'divider', position: 'absolute', left: 0 }}
            />
            <CircularProgress
              variant="determinate"
              value={pctElapsed}
              size={220}
              thickness={3}
            />
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                variant="h2"
                sx={{ fontVariantNumeric: 'tabular-nums', fontSize: '2.6rem', fontWeight: 800 }}
              >
                {formatTime(secondsLeft)}
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
            <Button variant="contained" onClick={toggleRunning} sx={{ flex: 1 }}>
              {running ? 'Pause' : 'Start'}
            </Button>
            <Button variant="outlined" onClick={reset} sx={{ flex: 1 }}>
              Reset
            </Button>
          </Stack>

          <Typography color="text.secondary">
            Focus sessions today: <strong>{sessionsToday}</strong> · Cycle:{' '}
            {focusSessionsInCycle}/{SESSIONS_BEFORE_LONG_BREAK}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
