import { useEffect, useState } from 'react';

// Pomodoro focus timer. Fully client-side (no backend/agent involvement) —
// today's completed-session count lives in localStorage, keyed by date so it
// resets each day.
const BUILTIN_MODES = {
  focus: { label: 'Focus', minutes: 25 },
  short_break: { label: 'Short break', minutes: 5 },
  long_break: { label: 'Long break', minutes: 15 },
};
const MODE_ORDER = ['focus', 'short_break', 'long_break', 'custom'];
const CUSTOM_LABEL = 'Custom';
const SESSIONS_BEFORE_LONG_BREAK = 4;
const STORAGE_KEY = 'studypilot-pomodoro';
const MIN_CUSTOM_MINUTES = 1;
const MAX_CUSTOM_MINUTES = 180;
const DEFAULT_CUSTOM_MINUTES = 20;

function clampCustomMinutes(raw) {
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n)) return DEFAULT_CUSTOM_MINUTES;
  return Math.max(MIN_CUSTOM_MINUTES, Math.min(MAX_CUSTOM_MINUTES, n));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadSessionsToday() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return raw && raw.date === todayKey() ? raw.count : 0;
  } catch {
    return 0;
  }
}

function saveSessionsToday(count) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayKey(), count }));
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Short two-tone chime via the Web Audio API — no audio file needed.
function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [880, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
      osc.start(start);
      osc.stop(start + 0.35);
    });
  } catch {
    // Web Audio unavailable — fail silently, it's a non-essential cue.
  }
}

export default function FocusTimerPage() {
  const [mode, setMode] = useState('focus');
  const [customMinutes, setCustomMinutes] = useState(DEFAULT_CUSTOM_MINUTES);
  const [secondsLeft, setSecondsLeft] = useState(BUILTIN_MODES.focus.minutes * 60);
  const [running, setRunning] = useState(false);
  const [focusSessionsInCycle, setFocusSessionsInCycle] = useState(0);
  const [sessionsToday, setSessionsToday] = useState(loadSessionsToday);

  function minutesFor(m, customValue = customMinutes) {
    return m === 'custom' ? customValue : BUILTIN_MODES[m].minutes;
  }

  function modeLabel(m) {
    return m === 'custom' ? CUSTOM_LABEL : BUILTIN_MODES[m].label;
  }

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (secondsLeft > 0 || !running) return;
    setRunning(false);
    playChime();

    if (mode === 'focus') {
      const nextCount = sessionsToday + 1;
      setSessionsToday(nextCount);
      saveSessionsToday(nextCount);

      const nextInCycle = focusSessionsInCycle + 1;
      if (nextInCycle >= SESSIONS_BEFORE_LONG_BREAK) {
        setFocusSessionsInCycle(0);
        switchMode('long_break');
      } else {
        setFocusSessionsInCycle(nextInCycle);
        switchMode('short_break');
      }
    } else if (mode === 'custom') {
      // Standalone session — stays finished rather than auto-advancing.
    } else {
      switchMode('focus');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, running]);

  function switchMode(nextMode, customValue) {
    setMode(nextMode);
    setSecondsLeft(minutesFor(nextMode, customValue) * 60);
  }

  function toggleRunning() {
    setRunning((r) => !r);
  }

  function reset() {
    setRunning(false);
    setSecondsLeft(minutesFor(mode) * 60);
  }

  function selectMode(nextMode) {
    setRunning(false);
    switchMode(nextMode);
  }

  function changeCustomMinutes(raw) {
    setCustomMinutes(raw);
  }

  function commitCustomMinutes(raw) {
    const clamped = clampCustomMinutes(raw);
    setCustomMinutes(clamped);
    if (mode === 'custom' && !running) {
      setSecondsLeft(clamped * 60);
    }
  }

  const totalSeconds = minutesFor(mode) * 60;
  const pctElapsed = totalSeconds ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

  return (
    <div className="focus-timer-page">
      <header className="page-header">
        <h1>Focus Timer</h1>
        <p className="subtitle">A Pomodoro timer to structure your study sessions.</p>
      </header>

      <div className="card focus-timer-card">
        <div className="mode-toggle" role="tablist" aria-label="Timer mode">
          {MODE_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={mode === key}
              className={mode === key ? 'active' : ''}
              onClick={() => selectMode(key)}
            >
              {modeLabel(key)}
            </button>
          ))}
        </div>

        {mode === 'custom' && (
          <label className="custom-duration-field">
            Minutes
            <input
              type="number"
              min={MIN_CUSTOM_MINUTES}
              max={MAX_CUSTOM_MINUTES}
              value={customMinutes}
              disabled={running}
              onChange={(e) => changeCustomMinutes(e.target.value)}
              onBlur={(e) => commitCustomMinutes(e.target.value)}
            />
          </label>
        )}

        <div className="timer-ring" style={{ '--pct': pctElapsed }}>
          <span className="timer-display">{formatTime(secondsLeft)}</span>
        </div>

        <div className="timer-controls">
          <button type="button" className="btn-block" onClick={toggleRunning}>
            {running ? 'Pause' : 'Start'}
          </button>
          <button type="button" className="btn-ghost" onClick={reset}>
            Reset
          </button>
        </div>

        <p className="muted timer-summary">
          Focus sessions today: <strong>{sessionsToday}</strong> · Cycle:{' '}
          {focusSessionsInCycle}/{SESSIONS_BEFORE_LONG_BREAK}
        </p>
      </div>
    </div>
  );
}
