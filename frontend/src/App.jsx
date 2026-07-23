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
import { onAuthChanged, signOut } from './services/authService.js';
import { getQuiz, submitAttempt } from './services/apiClient.js';
import LoginPage from './pages/LoginPage.jsx';
import CreateQuizPage from './pages/CreateQuizPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
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
  return <QuizResults result={result} onBack={() => navigate('/history')} />;
}

function HistoryRoute({ setResult }) {
  const navigate = useNavigate();
  return (
    <HistoryPage
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

function Nav({ user }) {
  if (!user) return null;
  return (
    <nav className="nav">
      <Link to="/">Create</Link>
      <Link to="/history">History</Link>
      <span className="spacer" />
      <span className="user-email">{user.email}</span>
      <button type="button" onClick={() => signOut()}>
        Sign out
      </button>
    </nav>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const unsub = onAuthChanged((u) => {
      setUser(u);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  if (!authReady) return <p>Loading…</p>;

  return (
    <BrowserRouter>
      <Nav user={user} />
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
          <Route
            path="/history"
            element={
              <RequireAuth user={user}>
                <HistoryRoute setResult={setResult} />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
