# Contract: Frontend ↔ Backend REST API (002 expansion)

**Feature**: 002-ai-study-companion | **Date**: 2026-07-24

Extends the 001 backend contract. All routes require `Authorization: Bearer
<firebase-id-token>`; all data is scoped to `uid` (other users' resources → `404`).
Error model unchanged: `{ "error": { "code", "message" } }` with statuses
400/401/404/422/502/504. Answer material stays hidden until submission.

**Base URL**: `http://<host>:<BACKEND_PORT>/api`

---

## Part 1 — Quiz Generator (EXTENDED)

### POST /api/quizzes  (EXTENDED)

Text mode (`application/json`) or upload mode (`multipart/form-data`, `file`).

New/changed fields:

| Field | Type | Notes |
|-------|------|-------|
| `questionType` | enum | `mcq` (default) \| `fill_blank` \| `essay` \| `matching` |
| `numQuestions` | int | optional; matching clamped to 3–10 |
| `text` / `file` | as 001 | upload accepts PNG/JPG/JPEG/WebP + PDF + `.txt` |

Behavior: validate material sufficiency (422 if short); PDFs/`.txt` extracted in
backend; **images sent to the agent for OCR**; call agent `/generate-quiz` with
`question_type`; persist; return the **taking view** (answers hidden), now including
type-specific presentation fields (options, or left/right items for matching).
Unsupported file → 400; agent failure → 502.

### GET /api/quizzes/:id  (EXTENDED)

Taking view for the quiz's type (mcq options / matching items shown; all answer
material hidden). `404` if not owned.

### POST /api/quizzes/:id/attempts  (EXTENDED)

Submit answers; grading dispatches by type:
- `mcq`, `matching` → scored deterministically in the backend (`lib/scoring.js`).
- `fill_blank` → agent `/grade-short-answer`; `essay` → agent `/grade-essay`.

Returns the graded result with `scorePercent` and per-question feedback (essay
entries include `questionScore` + `feedback`). Agent failure during grading → 502,
attempt NOT persisted (carried-over resilience). Answer body shapes per
data-model.md.

---

## Part 2 — Profile

### GET /api/profile/overview  (NEW)

`{ averageScorePercent: number, totalQuizzes: number }` over the user's attempts.
Empty state → `{ averageScorePercent: 0, totalQuizzes: 0 }`.

### GET /api/attempts  (REUSED)

Per-quiz list for the Profile: each item `{ id, quizId, quizTitle, questionType,
score, totalQuestions, scorePercent, submittedAt }`.

### GET /api/attempts/:id  (REUSED)

Full read-only review: questions, the user's answers, correct answers, feedback.
`404` if not owned. Historical attempts are immutable (no write routes).

---

## Part 3 — General AI Chat (persisted)

### POST /api/chats  (NEW)

Create a general chat. Body `{ message: string }`. Creates
`users/{uid}/chats/{id}` (kind `general`), calls agent `/chat`, appends the reply,
returns `{ id, title, messages }`.

### POST /api/chats/:id/messages  (NEW)

Append a user message to an existing chat and get the assistant reply. Body
`{ message }`. Backend replays recent history to the agent. `404` if not owned;
agent failure → 502 with the user's message preserved client-side.

### GET /api/chats  (NEW)

List the user's chats `{ chats: [{ id, kind, title, updatedAt }] }`.

### GET /api/chats/:id  (NEW)

Full conversation `{ id, kind, title, messages }`. `404` if not owned.

---

## Part 4 — File/Image Analysis

### POST /api/analysis  (NEW)

`multipart/form-data`:

| Field | Type | Notes |
|-------|------|-------|
| `file` | file | PNG/JPG/JPEG/WebP + PDF + `.txt`; else 400 |
| `mode` | enum | `chat` \| `quiz` |
| `question` | string | required when `mode=chat` (the user's question) |
| `questionType` | enum | when `mode=quiz` (default `mcq`) |

Behavior: validate + extract text (backend for PDF/`.txt`, agent OCR for images;
empty text → 422). Then:
- `mode=chat` → create an `analysis` chat grounded in the content (`contextText`),
  return `{ chatId, reply }`. Follow-ups continue via `POST /api/chats/:id/messages`.
- `mode=quiz` → generate a quiz of `questionType` from the content and return it
  (same shape as `POST /api/quizzes`); it appears in Profile history.

---

## Summary of new/changed endpoints

| Method | Path | Status |
|--------|------|--------|
| POST | /api/quizzes | EXTENDED (questionType, image upload) |
| GET | /api/quizzes/:id | EXTENDED (type-aware taking view) |
| POST | /api/quizzes/:id/attempts | EXTENDED (type-aware grading) |
| GET | /api/profile/overview | NEW |
| GET | /api/attempts, /api/attempts/:id | REUSED (now include questionType) |
| POST | /api/chats | NEW |
| POST | /api/chats/:id/messages | NEW |
| GET | /api/chats, /api/chats/:id | NEW |
| POST | /api/analysis | NEW |
