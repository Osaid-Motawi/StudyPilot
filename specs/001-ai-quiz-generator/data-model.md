# Phase 1 Data Model: AI-Powered Study Quiz Generator

**Feature**: 001-ai-quiz-generator | **Date**: 2026-07-23 | **Store**: Firebase Firestore

All persisted data lives in Firestore under per-user subcollections so that
ownership and isolation are structural (FR-002). The backend (Admin SDK) is the
only writer/reader; it always scopes paths to the authenticated `uid`.

```text
users/{uid}
  ├── quizzes/{quizId}
  └── attempts/{attemptId}
```

`{uid}` is the Firebase Authentication user id. There is no separate profile
document required for the MVP; the `users/{uid}` node exists implicitly as a parent
of the subcollections.

## Entity: Quiz

Path: `users/{uid}/quizzes/{quizId}`

| Field | Type | Notes / Validation |
|-------|------|--------------------|
| `id` | string | Firestore doc id (also stored for convenience). |
| `ownerId` | string | Equals `{uid}`. Set server-side; never from client. |
| `title` | string | Derived from material (agent-suggested) or user-provided; 1–200 chars. |
| `sourceType` | enum | `"pasted"` \| `"upload"`. |
| `sourceText` | string | The plain-text study material used for generation. Bounded by the input size cap; retained for review context. |
| `questions` | array<Question> | Embedded, ordered. MUST contain ≥1 multiple-choice AND ≥1 short-answer (FR-010). |
| `createdAt` | timestamp | Server timestamp. |

### Embedded object: Question

| Field | Type | Notes / Validation |
|-------|------|--------------------|
| `id` | string | Stable id unique within the quiz (e.g., `q1`, `q2`). |
| `type` | enum | `"mcq"` \| `"short_answer"`. |
| `prompt` | string | The question text. Non-empty. |
| `options` | array<string> | MCQ only. 2–5 distinct options. Omitted/empty for short-answer. |
| `correctOptionIndex` | integer | MCQ only. 0-based index into `options`. |
| `expectedAnswer` | string | Short-answer only. The reference answer used by the agent for semantic grading. |

**Sensitivity rule**: `correctOptionIndex` and `expectedAnswer` are **answer
material**. They are stored in Firestore but MUST NOT be included in the quiz
representation sent to the client for *taking* a quiz (see backend-api.md). They
are revealed only in attempt results after submission.

## Entity: Quiz Attempt

Path: `users/{uid}/attempts/{attemptId}`

| Field | Type | Notes / Validation |
|-------|------|--------------------|
| `id` | string | Firestore doc id. |
| `ownerId` | string | Equals `{uid}`. Set server-side. |
| `quizId` | string | References `users/{uid}/quizzes/{quizId}`. |
| `submittedAt` | timestamp | Server timestamp of submission. |
| `score` | number | Count of correct answers. |
| `totalQuestions` | integer | Number of questions in the quiz at attempt time. |
| `scorePercent` | number | `round(score / totalQuestions * 100)`. Convenience for history/progress. |
| `answers` | array<AnswerResult> | One entry per question, in quiz order. |

### Embedded object: AnswerResult

| Field | Type | Notes / Validation |
|-------|------|--------------------|
| `questionId` | string | Matches a `Question.id` in the quiz. |
| `type` | enum | `"mcq"` \| `"short_answer"` (copied for convenient rendering). |
| `userAnswer` | string \| integer \| null | MCQ: selected option index; short-answer: text. `null`/empty ⇒ unanswered. |
| `isCorrect` | boolean | MCQ: deterministic backend comparison. Short-answer: agent semantic verdict. Unanswered ⇒ `false` (FR-016). |
| `correctAnswer` | string | The correct option text (MCQ) or the expected answer (short-answer), for review display. |
| `rationale` | string | Optional. Short-answer only — the agent's brief justification for its verdict. |

## Transient (not persisted) types

These cross layer boundaries but are not stored as their own documents:

- **Study Material (input)**: raw pasted text or bytes of an uploaded PDF/text
  file. Uploaded bytes are parsed to text in-memory by the backend and discarded;
  the resulting text is stored as `Quiz.sourceText`.
- **Generation request/response** and **grading request/response**: the
  backend↔agent payloads defined in `contracts/agent-api.md`.

## Relationships

```text
User (Firebase uid)
  1───* Quiz            (users/{uid}/quizzes)
  1───* QuizAttempt     (users/{uid}/attempts)

Quiz 1───* Question     (embedded array)
Quiz 1───* QuizAttempt  (attempt.quizId → quiz.id; multiple attempts per quiz, FR-022)
QuizAttempt 1───* AnswerResult (embedded array, one per Question)
```

## Lifecycle / state

- A **Quiz** is created once (on generation) and is immutable thereafter for the
  MVP (regeneration creates a new quiz).
- A **QuizAttempt** is created on submission and is immutable (results are fixed;
  retaking creates a new attempt — Assumptions "immediate, non-editable results").
- There is no in-progress attempt document in the MVP; answers are held client-side
  until submission (interrupted attempts are simply not saved — see spec Edge
  Cases).

## Validation summary (traceability)

| Rule | Source |
|------|--------|
| Every quiz/attempt has `ownerId == uid`; cross-user access denied | FR-002, SC-004 |
| Quiz has both MCQ and short-answer questions | FR-010 |
| MCQ has options + a designated correct option; short-answer has an expected answer | FR-011 |
| Unanswered questions scored incorrect and flagged | FR-016 |
| MCQ scored deterministically in backend | FR-017a |
| Short-answer scored by agent semantic verdict | FR-017 |
| Multiple attempts on same quiz kept separately with own score + timestamp | FR-019, FR-022 |
