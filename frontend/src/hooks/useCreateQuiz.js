import { useState } from 'react';
import { createQuizFromText, createQuizFromFile } from '../services/apiClient.js';

// Shared create-quiz logic used by BOTH the Classic and MUI create pages —
// single source of truth for the form state, validation, and the generate call.
// Content vocabulary (the question-type emoji) lives here so both designs show
// the SAME icons; only UI chrome differs between designs.

export const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple-choice', desc: 'Pick the correct option', icon: '🔘' },
  { value: 'fill_blank', label: 'Fill-in-the-blank', desc: 'Complete the missing word', icon: '✏️' },
  { value: 'essay', label: 'Essay', desc: 'Write a free-response answer', icon: '📝' },
  { value: 'matching', label: 'Matching', desc: 'Match items across two columns', icon: '🔗' },
];

export const TYPE_LABELS = Object.fromEntries(QUESTION_TYPES.map((t) => [t.value, t.label]));

export const COUNT_PRESETS = [5, 10, 20, 50];
export const MIN_QUESTIONS = 1;
export const MAX_QUESTIONS = 100;

export function clampCount(n) {
  const v = Math.trunc(Number(n));
  if (!Number.isFinite(v)) return MIN_QUESTIONS;
  return Math.max(MIN_QUESTIONS, Math.min(MAX_QUESTIONS, v));
}

export function useCreateQuiz(onQuizCreated) {
  const [mode, setMode] = useState('paste'); // 'paste' | 'upload'
  const [questionType, setQuestionType] = useState('mcq');
  const [numQuestions, setNumQuestions] = useState(5);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null); // { message, retryable }

  const canSubmit = mode === 'paste' ? text.trim().length > 0 : Boolean(file);
  const activeType = QUESTION_TYPES.find((qt) => qt.value === questionType);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const opts = { questionType, numQuestions: clampCount(numQuestions) };
      if (title.trim()) opts.title = title.trim();
      const quiz =
        mode === 'paste'
          ? await createQuizFromText({ text, ...opts })
          : await createQuizFromFile(file, opts);
      onQuizCreated(quiz);
    } catch (err) {
      const status = err?.status;
      let message = err?.message || 'Something went wrong. Please try again.';
      if (status === 422) {
        message =
          err?.message ||
          'This material needs more content to generate a quiz. Please add more.';
      } else if (status === 400) {
        message = err?.message || 'That file could not be used. Accepted: PDF or .txt.';
      }
      setError({ message, retryable: Boolean(err?.retryable) });
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    generate();
  }

  return {
    mode, setMode,
    questionType, setQuestionType,
    numQuestions, setNumQuestions,
    text, setText,
    title, setTitle,
    file, setFile,
    busy, error,
    canSubmit, activeType,
    generate, handleSubmit,
  };
}
