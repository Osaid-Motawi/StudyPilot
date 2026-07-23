# Contract: Frontend ↔ Backend REST API

**Feature**: 001-ai-quiz-generator | **Date**: 2026-07-23

The backend is a Node.js/Express REST API. It owns all Firestore access, verifies
Firebase ID tokens, orchestrates calls to the agent, extracts text from uploads,
and scores multiple-choice questions deterministically.

**Base URL**: `http://<backend-host>:<BACKEND_PORT>/api` (e.g., `http://localhost:8080/api`)

## Authentication (all endpoints)

Every request MUST include a Firebase ID token:

```
Authorization: Bearer <firebase-id-token>
```

Middleware verifies the token (Firebase Admin SDK) and derives `uid`. Missing or
invalid token ⇒ `401 Unauthorized`. All data operations are scoped to `uid`; a
resource owned by another user ⇒ `404 Not Found` (never leak existence — FR-002).

**Answer-hiding rule**: Quiz representations returned for *taking* a quiz OMIT
`correctOptionIndex` and `expectedAnswer`. Those appear only in attempt results.

---

## POST /api/quizzes

Generate and save a quiz from study material. Accepts either pasted text or an
uploaded file.

- **Text mode**: `Content-Type: application/json`

  | Field | Type | Required | Notes |
  |-------|------|----------|-------|
  | `text` | string | yes | Pasted study material. |
  | `title` | string | no | Optional user title. |
  | `numMcq` | integer | no | Default 5. |
  | `numShort` | integer | no | Default 3. |

- **Upload mode**: `Content-Type: multipart/form-data` with a `file` part
  (PDF or `.txt`). Backend extracts text, then proceeds as in text mode.

### Behavior

1. Validate input has enough content; else `422 Unprocessable Entity` with a
   "needs more material" message (FR-007).
2. (Upload) Extract plain text; unsupported/corrupt file ⇒ `400`; no extractable
   text ⇒ `422` (FR-005, FR-006).
3. Call agent `POST /generate-quiz`. On agent failure ⇒ `502` (retryable, FR-012).
4. Persist quiz under `users/{uid}/quizzes/{quizId}`.

### Response `201 Created` (quiz WITH answers omitted)

```json
{
  "id": "qz_abc123",
  "title": "Photosynthesis Basics",
  "sourceType": "pasted",
  "createdAt": "2026-07-23T10:00:00Z",
  "questions": [
    { "id": "q1", "type": "mcq", "prompt": "Where does the light reaction occur?",
      "options": ["Thylakoid membrane", "Stroma", "Cytosol", "Nucleus"] },
    { "id": "q2", "type": "short_answer", "prompt": "What gas is released during photosynthesis?" }
  ]
}
```

---

## GET /api/quizzes

List the authenticated user's quizzes (metadata for the history/list view).

### Response `200 OK`

```json
{
  "quizzes": [
    { "id": "qz_abc123", "title": "Photosynthesis Basics", "sourceType": "pasted",
      "questionCount": 8, "createdAt": "2026-07-23T10:00:00Z" }
  ]
}
```

---

## GET /api/quizzes/{quizId}

Fetch a quiz for taking. Answers omitted. `404` if not owned by `uid`.

### Response `200 OK`

Same shape as the `POST /api/quizzes` response body (answers omitted).

---

## POST /api/quizzes/{quizId}/attempts

Submit answers for a quiz, grade them, persist and return the result.

### Request `application/json`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `answers` | array | yes | One entry per question. |
| `answers[].questionId` | string | yes | Must match a question in the quiz. |
| `answers[].mcqOptionIndex` | integer | mcq | Selected option index. |
| `answers[].text` | string | short_answer | Submitted text. |

Omitted or `null` answers are allowed and scored incorrect (FR-016).

```json
{
  "answers": [
    { "questionId": "q1", "mcqOptionIndex": 0 },
    { "questionId": "q2", "text": "it gives off O2" }
  ]
}
```

### Behavior

1. Load the quiz (server-side, with answers).
2. Score MCQs deterministically in the backend (FR-017a).
3. For each short-answer, call agent `POST /grade-short-answer` (FR-017).
   Agent failure ⇒ `502`; attempt is not persisted; client may resubmit
   (spec Edge Cases).
4. Compute score, persist attempt under `users/{uid}/attempts/{attemptId}`.

### Response `201 Created` (WITH correctness + correct answers for review)

```json
{
  "id": "at_xyz789",
  "quizId": "qz_abc123",
  "submittedAt": "2026-07-23T10:05:00Z",
  "score": 1,
  "totalQuestions": 2,
  "scorePercent": 50,
  "answers": [
    { "questionId": "q1", "type": "mcq", "userAnswer": 0, "isCorrect": true,
      "correctAnswer": "Thylakoid membrane" },
    { "questionId": "q2", "type": "short_answer", "userAnswer": "it gives off O2",
      "isCorrect": true, "correctAnswer": "Oxygen",
      "rationale": "O2 is oxygen; matches the expected answer." }
  ]
}
```

---

## GET /api/attempts

List the user's attempts across all quizzes (history + progress tracking, FR-021).

### Query params

- `quizId` (optional) — filter to one quiz's attempts (FR-020/FR-022).

### Response `200 OK`

```json
{
  "attempts": [
    { "id": "at_xyz789", "quizId": "qz_abc123", "quizTitle": "Photosynthesis Basics",
      "score": 1, "totalQuestions": 2, "scorePercent": 50,
      "submittedAt": "2026-07-23T10:05:00Z" }
  ]
}
```

---

## GET /api/attempts/{attemptId}

Fetch one attempt in full (for reviewing a past attempt — FR-020). `404` if not
owned by `uid`.

### Response `200 OK`

Same shape as the `POST .../attempts` result body.

---

## Error model (all endpoints)

| Status | Meaning |
|--------|---------|
| `400` | Malformed request / unsupported or corrupt file. |
| `401` | Missing/invalid Firebase ID token. |
| `404` | Resource not found or not owned by the caller. |
| `422` | Insufficient study material to generate a quiz. |
| `502` | Agent/ASI:One upstream failure (retryable). |
| `504` | Agent/ASI:One timeout (retryable). |

Error body: `{ "error": { "code": string, "message": string } }` — user-friendly
messages, no internal details leaked.
