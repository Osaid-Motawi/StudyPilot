import { getIdToken } from './authService.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Error carrying the HTTP status and backend error code so pages can branch on
// 400 / 422 / 502 / 504 (retryable) etc.
export class ApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryable = status === 502 || status === 504;
  }
}

async function authHeaders(extra = {}) {
  const token = await getIdToken();
  const headers = { ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function parseError(res) {
  let code;
  let message;
  try {
    const body = await res.json();
    code = body?.error?.code;
    message = body?.error?.message;
  } catch {
    // non-JSON body
  }
  return new ApiError(message || `Request failed (${res.status})`, {
    status: res.status,
    code,
  });
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = await authHeaders(
    isForm ? {} : body ? { 'Content-Type': 'application/json' } : {}
  );
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return null;
  return res.json();
}

// POST /api/quizzes (text mode). questionType: mcq | fill_blank | essay | matching.
export function createQuizFromText({
  text,
  title,
  questionType = 'mcq',
  numQuestions,
}) {
  return request('/quizzes', {
    method: 'POST',
    body: { text, title, questionType, numQuestions },
  });
}

// POST /api/quizzes (multipart upload mode).
export function createQuizFromFile(
  file,
  { title, questionType = 'mcq', numQuestions } = {}
) {
  const form = new FormData();
  form.append('file', file);
  if (title != null) form.append('title', title);
  form.append('questionType', questionType);
  if (numQuestions != null) form.append('numQuestions', String(numQuestions));
  return request('/quizzes', { method: 'POST', body: form, isForm: true });
}

// GET /api/quizzes/:id (taking view — answers hidden)
export function getQuiz(quizId) {
  return request(`/quizzes/${quizId}`);
}

// GET /api/quizzes
export function listQuizzes() {
  return request('/quizzes');
}

// POST /api/quizzes/:id/attempts
export function submitAttempt(quizId, answers) {
  return request(`/quizzes/${quizId}/attempts`, {
    method: 'POST',
    body: { answers },
  });
}

// GET /api/attempts (optional quizId filter)
export function listAttempts(quizId) {
  const qs = quizId ? `?quizId=${encodeURIComponent(quizId)}` : '';
  return request(`/attempts${qs}`);
}

// GET /api/attempts/:id
export function getAttempt(attemptId) {
  return request(`/attempts/${attemptId}`);
}

// ---- Profile (Part 2 — used by later phases) ------------------------------

// GET /api/profile/overview -> { averageScorePercent, totalQuizzes }
export function getProfileOverview() {
  return request('/profile/overview');
}

// GET /api/profile -> { photoData }
export function getProfile() {
  return request('/profile');
}

// POST /api/profile/photo -> { photoData }
export function updateProfilePhoto(photoData) {
  return request('/profile/photo', { method: 'POST', body: { photoData } });
}

// ---- General AI Chat (Part 3 — used by later phases) ----------------------

// POST /api/chats -> { id, title, messages }
export function createChat({ message }) {
  return request('/chats', { method: 'POST', body: { message } });
}

// POST /api/chats/:id/messages -> { id, title, messages }
export function sendChatMessage(chatId, { message }) {
  return request(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: { message },
  });
}

// GET /api/chats -> { chats: [{ id, kind, title, updatedAt }] }
export function listChats() {
  return request('/chats');
}

// GET /api/chats/:id -> { id, kind, title, messages }
export function getChat(chatId) {
  return request(`/chats/${chatId}`);
}

// ---- File/Image Analysis (Part 4 — used by later phases) ------------------

// POST /api/analysis (multipart) — chat about an uploaded file/image.
// Returns { chatId, reply }; continue the conversation via sendChatMessage.
// (Quiz generation from a file lives on the Create Quiz page, not here.)
export function analyzeUpload(file, { question } = {}) {
  const form = new FormData();
  form.append('file', file);
  if (question != null) form.append('question', question);
  return request('/analysis', { method: 'POST', body: form, isForm: true });
}
