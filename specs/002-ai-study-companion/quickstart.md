# Quickstart & Validation Guide: AI Study Companion (Four-Part Expansion)

**Feature**: 002-ai-study-companion | **Date**: 2026-07-24

Extends the 001 quickstart. Same three processes and env files; this feature adds
one prerequisite (Tesseract OCR for images) and new endpoints/pages. References
[contracts/](./contracts/) and [data-model.md](./data-model.md).

## Additional prerequisites (beyond 001)

- **Tesseract OCR** installed on the agent host (for image analysis):
  - Windows: install the Tesseract binary and ensure it's on `PATH`.
  - Agent dependency: add `pytesseract` to `agent/requirements.txt`.
- Everything else from 001 still applies (Node 20+, Python 3.11, Firebase project
  `studypilot-osaid` with deployed rules, `backend/serviceAccount.json`, ASI:One
  key in `agent/.env`).

## Run (unchanged from 001)

```bash
cd agent && python agent.py            # :8001
cd backend && npm run dev              # :8080
cd frontend && npm run dev             # :5173
```

## Automated tests

```bash
cd backend && npm test    # + new: matching scoring, chat routes, analysis routing, profile aggregates
cd agent && python -m pytest   # + new: essay grading, chat, per-type generation, OCR (mocked)
cd frontend && npm test   # + new: question-type selector, chat, analysis, profile flows
```

All business-logic tests MUST pass without live Firestore, ASI:One, or the
Tesseract binary (mock the `firestoreClient`, `agentClient`, `asi_client`, and OCR
seams) — Constitution Principle IV.

## End-to-end validation (maps to spec user stories)

Obtain a Firebase ID token by signing in (or via the Auth REST API) and send it as
`Authorization: Bearer <token>`.

### Scenario A — US1: quiz of each question type (P1)

For each `questionType` in `mcq`, `fill_blank`, `essay`, `matching`:
1. `POST /api/quizzes` with pasted notes + `questionType`.
   - Verify a quiz of that type is returned with answers hidden. *(FR-006/007)*
   - Matching: verify 3–10 pairs. *(FR-011)*
2. Take it, then `POST /api/quizzes/:id/attempts`.
   - mcq/matching: verify deterministic score. *(FR-010/011)*
   - fill_blank: verify tolerant semantic grading. *(FR-012)*
   - essay: verify each answer gets a numeric score + written feedback. *(FR-013)*
   - Verify overall score + per-question feedback within ~10s. *(FR-009, SC-003)*

### Scenario B — US2: Profile (P2)

1. After taking ≥2 quizzes of different types, open the Profile page /
   `GET /api/profile/overview`.
   - Verify average score + total quizzes. *(FR-016)*
2. Verify every taken quiz is listed with title, question type, score, date.
   *(FR-017)*
3. Select an entry → verify full read-only review (questions, your answers, correct
   answers, feedback); confirm nothing is editable. *(FR-018/019)*
4. New user with no quizzes → empty-state overview, no error. *(FR-020)*

### Scenario C — US3: general chat, persisted (P3)

1. `POST /api/chats` with a question → verify an AI reply. *(FR-021)*
2. `POST /api/chats/:id/messages` follow-up → verify context retained. *(FR-022)*
3. Sign out/in (or `GET /api/chats`) → verify the conversation persists. *(FR-023a)*
4. Stop the agent, send a message → verify retryable error, message preserved.

### Scenario D — US4: file/image analysis (P4)

1. `POST /api/analysis` with an image, `mode=chat`, a question → verify a
   content-aware answer (OCR path). Continue via `/api/chats/:id/messages`.
   *(FR-025/026)*
2. `POST /api/analysis` with a PDF, `mode=quiz`, `questionType=mcq` → verify a quiz
   is generated from the content and appears in Profile history. *(FR-027)*
3. Upload an unsupported type (e.g., `.docx`) → verify 400 rejection. *(FR-028)*
4. Upload an image with no readable text → verify 422 (empty OCR).

### Cross-cutting

- All four pages reachable from shared nav; unauthenticated → redirected to sign
  in. *(FR-001/002/004)*
- A second user sees none of the first user's quizzes, attempts, or chats.
  *(FR-003)*

## Done / success signals

- Scenarios A–D pass; SC-001..SC-008 observable.
- No answer material exposed in taking views; historical attempts read-only.
- Image analysis works via OCR without any ASI:One vision dependency.
