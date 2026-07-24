# Phase 1 Data Model: AI Study Companion (Four-Part Expansion)

**Feature**: 002-ai-study-companion | **Date**: 2026-07-24 | **Store**: Firestore

Extends the 001 model. Existing per-user isolation is preserved; the backend
(Admin SDK) is the only reader/writer and always scopes paths to the authenticated
`uid`.

```text
users/{uid}
  ├── quizzes/{quizId}     (EXTENDED: questionType + type-specific question shapes)
  ├── attempts/{attemptId} (EXTENDED: per-type answer/feedback fields)
  └── chats/{chatId}       (NEW: persisted general + analysis conversations)
```

## Entity: Quiz (extended)

Path: `users/{uid}/quizzes/{quizId}`

| Field | Type | Notes |
|-------|------|-------|
| `id`, `ownerId`, `title`, `createdAt` | as in 001 | unchanged |
| `sourceType` | enum | `"pasted"` \| `"upload"` \| `"image"` (image = OCR'd) |
| `sourceText` | string | extracted/pasted/OCR'd study text |
| `questionType` | enum | **NEW**: `"mcq"` \| `"fill_blank"` \| `"essay"` \| `"matching"` (one type per quiz) |
| `questions` | array<Question> | shape depends on `questionType` |

### Embedded object: Question (by type)

Common: `id` (`q1`…), `type` (= quiz's `questionType`), `prompt`.

| Type | Extra fields | Answer material (hidden pre-submit) |
|------|--------------|-------------------------------------|
| `mcq` | `options: string[]` (2–5) | `correctOptionIndex: int` |
| `fill_blank` | prompt contains the blank | `expectedAnswer: string` |
| `essay` | optional `guidance`/rubric hint | `referenceAnswer: string` (guides grading; `maxScore` = 100) |
| `matching` | `leftItems: string[]`, `rightItems: string[]` (3–10 each) | `correctPairs: {left:int, right:int}[]` |

**Sensitivity rule (carried over)**: `correctOptionIndex`, `expectedAnswer`,
`referenceAnswer`, and `correctPairs` are answer material — omitted from the
taking view, revealed only in attempt results.

## Entity: Quiz Attempt (extended)

Path: `users/{uid}/attempts/{attemptId}`

| Field | Type | Notes |
|-------|------|-------|
| `id`, `ownerId`, `quizId`, `submittedAt` | as in 001 | unchanged |
| `questionType` | enum | **NEW**: copied from the quiz (for Profile list display) |
| `score` | number | correct count (mcq/fill_blank/matching); for essay, the **mean** of per-question `questionScore` (0–100). `scorePercent` is the authoritative cross-type field. |
| `totalQuestions` | int | question count (or pair count for matching) |
| `scorePercent` | number | unified 0–100 across all types (basis for Profile average) |
| `answers` | array<AnswerResult> | per question |

### Embedded object: AnswerResult (by type)

Common: `questionId`, `type`, `isCorrect` (bool; for essay, derived pass flag optional), `correctAnswer` (display), optional `rationale`.

| Type | `userAnswer` | Grading | Extra |
|------|--------------|---------|-------|
| `mcq` | selected index \| null | backend deterministic | — |
| `matching` | `{left:int,right:int}[]` | backend deterministic (count correct) | `correctPairs` echoed for review |
| `fill_blank` | text | agent semantic (correct/incorrect) | `rationale` |
| `essay` | text | agent → `score` (0–100) + `feedback` | `questionScore: int`, `feedback: string` |

**Scoring → `scorePercent`**: mcq/fill_blank = correct/total×100; matching =
correctPairs/totalPairs×100; essay = mean of per-question `questionScore`.
Unanswered → incorrect / 0 (FR carried over).

## Entity: Chat Conversation (NEW)

Path: `users/{uid}/chats/{chatId}`

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Firestore doc id |
| `ownerId` | string | = `uid`; server-set |
| `kind` | enum | `"general"` (Part 3) \| `"analysis"` (Part 4 chat mode) |
| `title` | string | derived from first message / uploaded item |
| `contextText` | string \| null | for `analysis` chats: the OCR/extracted content the chat is grounded in (null for general) |
| `messages` | array<Message> | ordered turns |
| `createdAt`, `updatedAt` | timestamp | server timestamps |

### Embedded object: Message

| Field | Type | Notes |
|-------|------|-------|
| `role` | enum | `"user"` \| `"assistant"` |
| `content` | string | message text |
| `createdAt` | timestamp | order key |

Chats are private to the user and never appear in the Profile's quiz list.

## Transient (not persisted)

- **Uploaded Item (Analysis)**: the raw image/file bytes and chosen `mode`. Parsed
  to text (backend for PDF/`.txt`; agent OCR for images) and then discarded; only
  the resulting text persists (as `Chat.contextText` or `Quiz.sourceText`).
- **Profile Overview**: `{ averageScorePercent, totalQuizzes }` — derived at read
  time from attempts, not stored.
- Backend↔agent request/response payloads (see contracts/agent-api.md).

## Relationships

```text
User (uid)
 ├─1─* Quiz         (users/{uid}/quizzes)      Quiz 1─* Question (embedded, typed)
 ├─1─* QuizAttempt  (users/{uid}/attempts)     Attempt.quizId → Quiz.id; many per quiz
 └─1─* Chat         (users/{uid}/chats)        Chat 1─* Message (embedded)

Profile Overview = aggregate over the user's QuizAttempts (avg scorePercent, count)
```

## Validation summary (traceability)

| Rule | Source |
|------|--------|
| One question type per quiz; selectable | FR-006, FR-007 |
| mcq/matching scored deterministically in backend | FR-010, FR-011 |
| matching has 3–10 pairs | FR-011 (clarified) |
| fill_blank graded semantically; essay → score+feedback | FR-012, FR-013 |
| Answer material hidden until submission | anti-cheat (carried from 001) |
| Chats persisted per user, isolated, not in Profile | FR-023a |
| Profile average + total + list + read-only review | FR-016..FR-020 |
| Uploads limited to PNG/JPG/JPEG/WebP + PDF + .txt | FR-024, FR-028 (clarified) |
| All quizzes (incl. from analysis) appear in Profile | FR-027, FR-017 |
| Cross-user isolation for quizzes, attempts, chats | FR-003 |
