import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import {
  useProfileData,
  TYPE_LABELS,
  TYPE_ICONS,
} from '../hooks/useProfileData.js';
import { signOut } from '../services/authService.js';

// Profile (Material design): the MUI-styled twin of the Classic ProfilePage.
// Both share the useProfileData hook as the single source of truth; this file
// is purely the elevated-card presentation (hero, overview ring, history table).
export default function MuiProfilePage({ onOpenAttempt }) {
  const navigate = useNavigate();
  const {
    overview,
    attempts,
    photoData,
    loading,
    error,
    displayName,
    email,
    openAttempt: loadAttempt,
  } = useProfileData();

  async function openAttempt(attemptId) {
    const full = await loadAttempt(attemptId);
    if (full) onOpenAttempt(full);
  }

  function fmt(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? ts : d.toLocaleString();
  }
  const typeLabel = (t) => TYPE_LABELS[t] || t || '—';
  const typeIcon = (t) => TYPE_ICONS[t] || '❓';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const initials = (displayName || email || '?').trim().charAt(0).toUpperCase();
  const avgScore = overview?.totalQuizzes ? overview.averageScorePercent : 0;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="h1">Profile</Typography>
        <Typography variant="body1" color="text.secondary">
          Your account overview and quiz history.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {/* ---- Account hero ---- */}
      <Card>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
          >
            <Avatar src={photoData || undefined} sx={{ width: 72, height: 72, fontSize: '1.75rem', fontWeight: 700 }}>
              {initials}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {displayName || 'No name set'}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {email}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={() => navigate('/profile/edit')}>
                Edit
              </Button>
              <Button variant="outlined" startIcon={<LogoutIcon />} onClick={() => signOut()}>
                Sign out
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* ---- Overview ---- */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Overview
          </Typography>
          <Stack direction="row" spacing={4} alignItems="center" flexWrap="wrap" useFlexGap>
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress
                  variant="determinate"
                  value={100}
                  size={100}
                  thickness={4}
                  sx={{ color: 'divider', position: 'absolute', left: 0 }}
                />
                <CircularProgress variant="determinate" value={avgScore} size={100} thickness={4} />
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                    {overview?.totalQuizzes ? `${avgScore}%` : '—'}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Average score
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" component="div" sx={{ fontWeight: 700 }}>
                {overview?.totalQuizzes ?? 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Quizzes taken
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* ---- History ---- */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Your Quizzes
          </Typography>
          {!attempts.length ? (
            <Typography variant="body2" color="text.secondary">
              You haven&rsquo;t taken any quizzes yet. Create one to start tracking your progress.
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Quiz</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attempts.map((a) => (
                    <TableRow key={a.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span aria-hidden="true">{typeIcon(a.questionType)}</span>
                          <span>{a.quizTitle || a.quizId}</span>
                        </Box>
                      </TableCell>
                      <TableCell>{typeLabel(a.questionType)}</TableCell>
                      <TableCell>
                        <Chip
                          color="primary"
                          variant="outlined"
                          size="small"
                          label={`${a.score}/${a.totalQuestions}${a.scorePercent != null ? ` · ${a.scorePercent}%` : ''}`}
                        />
                      </TableCell>
                      <TableCell>{fmt(a.submittedAt)}</TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={() => openAttempt(a.id)}>
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
