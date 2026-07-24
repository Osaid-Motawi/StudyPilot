import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { onAuthChanged } from './services/authService.js';
import { getQuiz, submitAttempt, getProfile } from './services/apiClient.js';
import LoginPage from './pages/LoginPage.jsx';
import CreateQuizPage from './pages/CreateQuizPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import EditProfilePage from './pages/EditProfilePage.jsx';
import FocusTimerPage from './pages/FocusTimerPage.jsx';
import ToolsPage from './pages/ToolsPage.jsx';
import QuizTaker from './components/QuizTaker.jsx';
import QuizResults from './components/QuizResults.jsx';

// ---- Route wrappers (bridge shared in-memory state <-> router) ------------

function CreateRoute({ setQuiz }) {
  const navigate = useNavigate();
  return (
    <CreateQuizPage
      onQuizCreated={(quiz) => {
        setQuiz(quiz);
        navigate(`/quiz/${quiz.id}`);
      }}
    />
  );
}

function TakeRoute({ quiz, setQuiz, setResult }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!quiz || quiz.id !== id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!quiz || quiz.id !== id) {
      setLoading(true);
      getQuiz(id)
        .then((q) => active && (setQuiz(q), setLoading(false)))
        .catch((err) => {
          if (active) {
            setError(err?.message || 'Could not load quiz.');
            setLoading(false);
          }
        });
    } else {
      setLoading(false);
    }
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSubmit(answers) {
    setSubmitting(true);
    setError('');
    try {
      const result = await submitAttempt(id, answers);
      setResult(result);
      navigate('/results');
    } catch (err) {
      setError(err?.message || 'Could not submit your answers. Please retry.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p>Loading quiz…</p>;
  if (error) return <p className="error" role="alert">{error}</p>;
  if (!quiz) return <p>Quiz not found.</p>;

  return (
    <QuizTaker quiz={quiz} onSubmit={handleSubmit} submitting={submitting} />
  );
}

function ResultsRoute({ result }) {
  const navigate = useNavigate();
  if (!result) return <Navigate to="/" replace />;
  return <QuizResults result={result} onBack={() => navigate('/profile')} />;
}

function ProfileRoute({ setResult }) {
  const navigate = useNavigate();
  return (
    <ProfilePage
      onOpenAttempt={(r) => {
        setResult(r);
        navigate('/results');
      }}
    />
  );
}

// ---- Auth guard -----------------------------------------------------------

function RequireAuth({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function ThemeToggle({ theme, onToggle, floating }) {
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      className={floating ? 'theme-toggle theme-toggle-floating' : 'theme-toggle'}
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}

const PALETTES = ['violet', 'teal', 'rose', 'emerald'];
const PALETTE_LABELS = {
  violet: 'Violet & Amber',
  teal: 'Teal & Blue',
  rose: 'Rose & Gold',
  emerald: 'Emerald & Sky',
};

function PaletteToggle({ palette, onToggle }) {
  const nextPalette = PALETTES[(PALETTES.indexOf(palette) + 1) % PALETTES.length];
  return (
    <button
      type="button"
      className="palette-toggle"
      onClick={onToggle}
      aria-label={`Color theme: ${PALETTE_LABELS[palette]}. Click to try ${PALETTE_LABELS[nextPalette]}.`}
      title={`Color theme: ${PALETTE_LABELS[palette]} (click to try another)`}
    >
      🎨
    </button>
  );
}

function Nav({ user, theme, onToggleTheme, palette, onTogglePalette, photoData }) {
  const [menuOpen, setMenuOpen] = useState(false);
  if (!user) return null;
  const initials = (user.displayName || user.email || '?').trim().charAt(0).toUpperCase();
  const closeMenu = () => setMenuOpen(false);
  return (
    <nav className="nav">
      <Link to="/" className="brand brand-sm" onClick={closeMenu}>
        <span className="brand-mark" aria-hidden="true">
          SP
        </span>
        <span className="brand-name">StudyPilot</span>
      </Link>
      <PaletteToggle palette={palette} onToggle={onTogglePalette} />
      <button
        type="button"
        className="nav-menu-toggle"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
      >
        {menuOpen ? '✕' : '☰'}
      </button>
      <span className="spacer" />
      <span className={menuOpen ? 'nav-links open' : 'nav-links'}>
        <Link to="/" onClick={closeMenu}>
          Create Quiz
        </Link>
        <Link to="/chat" onClick={closeMenu}>
          AI Chat
        </Link>
        <Link to="/focus" onClick={closeMenu}>
          Focus Timer
        </Link>
        <Link to="/tools" onClick={closeMenu}>
          Tools
        </Link>
      </span>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      <Link
        to="/profile"
        className="nav-avatar"
        title={user.displayName || user.email}
        aria-label="Profile"
        onClick={closeMenu}
      >
        {photoData ? <img src={photoData} alt="" /> : initials}
      </Link>
    </nav>
  );
}

function getInitialPalette() {
  const stored = localStorage.getItem('studypilot-palette');
  return PALETTES.includes(stored) ? stored : PALETTES[0];
}

function getInitialTheme() {
  const stored = localStorage.getItem('studypilot-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [result, setResult] = useState(null);
  const [theme, setTheme] = useState(getInitialTheme);
  const [palette, setPalette] = useState(getInitialPalette);
  const [navPhotoData, setNavPhotoData] = useState(null);

  useEffect(() => {
    const unsub = onAuthChanged((u) => {
      setUser(u);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) {
      setNavPhotoData(null);
      return;
    }
    let active = true;
    getProfile()
      .then((p) => active && setNavPhotoData(p?.photoData || null))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('studypilot-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    localStorage.setItem('studypilot-palette', palette);
  }, [palette]);

  function togglePalette() {
    setPalette((p) => PALETTES[(PALETTES.indexOf(p) + 1) % PALETTES.length]);
  }

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  if (!authReady) return <p>Loading…</p>;

  return (
    <BrowserRouter>
      <Nav
        user={user}
        theme={theme}
        onToggleTheme={toggleTheme}
        palette={palette}
        onTogglePalette={togglePalette}
        photoData={navPhotoData}
      />
      {!user && (
        <span className="appearance-toggles appearance-toggles-floating">
          <PaletteToggle palette={palette} onToggle={togglePalette} />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </span>
      )}
      <main className="container">
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/" replace /> : <LoginPage />}
          />
          <Route
            path="/"
            element={
              <RequireAuth user={user}>
                <CreateRoute setQuiz={setQuiz} />
              </RequireAuth>
            }
          />
          <Route
            path="/quiz/:id"
            element={
              <RequireAuth user={user}>
                <TakeRoute quiz={quiz} setQuiz={setQuiz} setResult={setResult} />
              </RequireAuth>
            }
          />
          <Route
            path="/results"
            element={
              <RequireAuth user={user}>
                <ResultsRoute result={result} />
              </RequireAuth>
            }
          />
          {/* Legacy History page retired — redirect to the Profile page. */}
          <Route path="/history" element={<Navigate to="/profile" replace />} />
          <Route
            path="/focus"
            element={
              <RequireAuth user={user}>
                <FocusTimerPage />
              </RequireAuth>
            }
          />
          <Route
            path="/tools"
            element={
              <RequireAuth user={user}>
                <ToolsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/chat"
            element={
              <RequireAuth user={user}>
                <ChatPage />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth user={user}>
                <ProfileRoute setResult={setResult} />
              </RequireAuth>
            }
          />
          <Route
            path="/profile/edit"
            element={
              <RequireAuth user={user}>
                <EditProfilePage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
