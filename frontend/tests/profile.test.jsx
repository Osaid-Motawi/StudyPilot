import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Auth is mocked so the page reads a fake signed-in user (no real Firebase).
vi.mock('../src/services/authService.js', () => ({
  currentUser: () => ({ displayName: 'Osaid Motawi', email: 'osaid@example.com' }),
  signOut: vi.fn(),
}));

// US2: the Profile page shows the overview stats and a per-quiz list. apiClient
// is mocked — no real backend or Firebase.
vi.mock('../src/services/apiClient.js', () => ({
  getProfileOverview: vi
    .fn()
    .mockResolvedValue({ averageScorePercent: 85, totalQuizzes: 2 }),
  listAttempts: vi.fn().mockResolvedValue({
    attempts: [
      {
        id: 'a1',
        quizId: 'qz1',
        quizTitle: 'Photosynthesis Basics',
        questionType: 'mcq',
        score: 8,
        totalQuestions: 10,
        scorePercent: 80,
        submittedAt: '2026-07-20T10:00:00Z',
      },
      {
        id: 'a2',
        quizId: 'qz2',
        quizTitle: 'Cell Biology',
        questionType: 'essay',
        score: 90,
        totalQuestions: 1,
        scorePercent: 90,
        submittedAt: '2026-07-21T10:00:00Z',
      },
    ],
  }),
  getAttempt: vi.fn(),
  getProfile: vi.fn().mockResolvedValue({ photoData: null }),
}));

import ProfilePage from '../src/pages/ProfilePage.jsx';

describe('profile rendering: overview + list', () => {
  it('shows average score, total quizzes, and every attempt', async () => {
    render(
      <MemoryRouter>
        <ProfilePage onOpenAttempt={vi.fn()} />
      </MemoryRouter>
    );

    // Overview stats.
    await screen.findByText('2');
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText(/Quizzes taken/i)).toBeInTheDocument();
    expect(screen.getByText(/Average score/i)).toBeInTheDocument();

    // Per-quiz list: title + question type for each attempt.
    expect(screen.getByText('Photosynthesis Basics')).toBeInTheDocument();
    expect(screen.getByText('Multiple-choice')).toBeInTheDocument();
    expect(screen.getByText('Cell Biology')).toBeInTheDocument();
    expect(screen.getByText('Essay')).toBeInTheDocument();

    // Reopen-to-review affordance exists per row.
    expect(screen.getAllByRole('button', { name: /review/i })).toHaveLength(2);
  });

  it('shows an empty state when there are no quizzes', async () => {
    const api = await import('../src/services/apiClient.js');
    api.getProfileOverview.mockResolvedValueOnce({
      averageScorePercent: 0,
      totalQuizzes: 0,
    });
    api.listAttempts.mockResolvedValueOnce({ attempts: [] });

    render(
      <MemoryRouter>
        <ProfilePage onOpenAttempt={vi.fn()} />
      </MemoryRouter>
    );

    await screen.findByText(/haven.t taken any quizzes yet/i);
  });
});
