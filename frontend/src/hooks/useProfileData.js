import { useEffect, useState } from 'react';
import {
  getProfileOverview,
  listAttempts,
  getAttempt,
  getProfile,
} from '../services/apiClient.js';
import { currentUser } from '../services/authService.js';

// Shared profile logic for BOTH designs: account identity, performance
// overview, and quiz history. `openAttempt(id)` fetches a full graded attempt
// and returns it (or null on failure, setting `error`); the page decides how to
// present it (navigate to a results view), keeping navigation out of the hook.
// Content vocabulary (question-type emoji) is shared so both designs match.

export const TYPE_LABELS = {
  mcq: 'Multiple-choice',
  fill_blank: 'Fill-in-the-blank',
  essay: 'Essay',
  matching: 'Matching',
};

export const TYPE_ICONS = {
  mcq: '🔘',
  fill_blank: '✏️',
  essay: '📝',
  matching: '🔗',
};

export function useProfileData() {
  const [overview, setOverview] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [photoData, setPhotoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const user = currentUser();
  const displayName = user?.displayName || '';
  const email = user?.email || '';

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [ov, at, profile] = await Promise.all([
          getProfileOverview(),
          listAttempts(),
          getProfile().catch(() => null),
        ]);
        if (!active) return;
        setOverview(ov || { averageScorePercent: 0, totalQuizzes: 0 });
        setAttempts(at?.attempts || []);
        setPhotoData(profile?.photoData || null);
      } catch (err) {
        if (active) setError(err?.message || 'Could not load your profile.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function openAttempt(attemptId) {
    setError('');
    try {
      return await getAttempt(attemptId);
    } catch (err) {
      setError(err?.message || 'Could not open that quiz for review.');
      return null;
    }
  }

  return {
    overview,
    attempts,
    photoData,
    loading,
    error,
    displayName,
    email,
    openAttempt,
  };
}
