import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the auth service so App treats us as a logged-in user with no real
// Firebase involved (jsdom, no network).
vi.mock('../src/services/authService.js', () => ({
  onAuthChanged: (cb) => {
    cb({ email: 'test@example.com', uid: 'u1' });
    return () => {};
  },
  signOut: vi.fn(),
  getIdToken: vi.fn().mockResolvedValue('fake-token'),
  currentUser: () => ({ email: 'test@example.com', uid: 'u1' }),
  signInWithEmailPassword: vi.fn(),
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

// Mock the API client — no real backend.
vi.mock('../src/services/apiClient.js', () => {
  const quiz = {
    id: 'qz_1',
    title: 'Photosynthesis Basics',
    sourceType: 'pasted',
    questions: [
      {
        id: 'q1',
        type: 'mcq',
        prompt: 'Where does the light reaction occur?',
        options: ['Thylakoid membrane', 'Stroma', 'Cytosol', 'Nucleus'],
      },
      {
        id: 'q2',
        type: 'short_answer',
        prompt: 'What gas is released during photosynthesis?',
      },
    ],
  };
  const result = {
    id: 'at_1',
    quizId: 'qz_1',
    submittedAt: '2026-07-23T10:05:00Z',
    score: 2,
    totalQuestions: 2,
    scorePercent: 100,
    answers: [
      {
        questionId: 'q1',
        type: 'mcq',
        userAnswer: 0,
        isCorrect: true,
        correctAnswer: 'Thylakoid membrane',
      },
      {
        questionId: 'q2',
        type: 'short_answer',
        userAnswer: 'it gives off O2',
        isCorrect: true,
        correctAnswer: 'Oxygen',
        rationale: 'O2 is oxygen; matches the expected answer.',
      },
    ],
  };
  return {
    ApiError: class ApiError extends Error {},
    createQuizFromText: vi.fn().mockResolvedValue(quiz),
    createQuizFromFile: vi.fn().mockResolvedValue(quiz),
    getQuiz: vi.fn().mockResolvedValue(quiz),
    listQuizzes: vi.fn().mockResolvedValue({ quizzes: [] }),
    submitAttempt: vi.fn().mockResolvedValue(result),
    listAttempts: vi.fn().mockResolvedValue({ attempts: [] }),
    getAttempt: vi.fn().mockResolvedValue(result),
  };
});

import App from '../src/App.jsx';

describe('core flow: create -> take -> results', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('generates a quiz, takes it, and shows score + per-question breakdown', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Create page: paste notes and generate.
    const textarea = await screen.findByLabelText('Study notes');
    await user.type(textarea, 'Photosynthesis converts light energy...');
    await user.click(screen.getByRole('button', { name: /generate quiz/i }));

    // Quiz taker renders both question types.
    await screen.findByText(/Where does the light reaction occur/i);
    expect(
      screen.getByText(/What gas is released during photosynthesis/i)
    ).toBeInTheDocument();

    // Answer the MCQ and the short answer.
    await user.click(screen.getByLabelText('Thylakoid membrane'));
    await user.type(
      screen.getByLabelText('Answer for question 2'),
      'it gives off O2'
    );

    // Submit.
    await user.click(
      screen.getByRole('button', { name: /submit answers/i })
    );

    // Results: score + breakdown render.
    await screen.findByText(/Your Results/i);
    expect(screen.getByText(/Score:/i)).toBeInTheDocument();
    expect(screen.getByText('100%', { exact: false })).toBeInTheDocument();

    // Per-question correctness and correct answers shown.
    const corrects = screen.getAllByText(/Correct/i);
    expect(corrects.length).toBeGreaterThan(0);
    expect(screen.getByText('Thylakoid membrane')).toBeInTheDocument();
    expect(screen.getByText('Oxygen')).toBeInTheDocument();
    expect(
      screen.getByText(/matches the expected answer/i)
    ).toBeInTheDocument();
  });
});
