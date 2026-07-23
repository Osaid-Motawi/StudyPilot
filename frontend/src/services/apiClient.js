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

// POST /api/quizzes (text mode)
export function createQuizFromText({ text, title, numMcq, numShort }) {
  return request('/quizzes', {
    method: 'POST',
    body: { text, title, numMcq, numShort },
  });
}

// POST /api/quizzes (multipart upload mode)
export function createQuizFromFile(file, { title, numMcq, numShort } = {}) {
  const form = new FormData();
  form.append('file', file);
  if (title != null) form.append('title', title);
  if (numMcq != null) form.append('numMcq', String(numMcq));
  if (numShort != null) form.append('numShort', String(numShort));
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
