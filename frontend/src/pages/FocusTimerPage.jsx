import {
  useFocusTimer,
  MODE_ORDER,
  SESSIONS_BEFORE_LONG_BREAK,
  MIN_CUSTOM_MINUTES,
  MAX_CUSTOM_MINUTES,
  formatTime,
} from '../hooks/useFocusTimer.js';

// Pomodoro focus timer. All logic lives in the shared useFocusTimer hook (also
// used by the MUI design); this file is only the Classic presentation.
export default function FocusTimerPage() {
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
