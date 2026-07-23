# Quickstart & Validation Guide: AI-Powered Study Quiz Generator

**Feature**: 001-ai-quiz-generator | **Date**: 2026-07-23

This guide brings up the three layers locally and validates the feature end-to-end
against the acceptance scenarios in [spec.md](./spec.md). It references
[contracts/](./contracts/) and [data-model.md](./data-model.md) rather than
duplicating them.

## Prerequisites

- Node.js 20 LTS and npm
- Python 3.11 and pip
- A Firebase project with **Authentication** (Email/Password or Google) and
  **Firestore** enabled
- A Firebase service account key (for the backend Admin SDK)
- An **ASI:One API key** (for the agent)

## Environment configuration

Create the following (values are examples; do not commit secrets):

**`agent/.env`**
```
ASI_ONE_API_KEY=sk-...            # ASI:One key
ASI_ONE_BASE_URL=https://api.asi1.ai/v1
ASI_ONE_MODEL=asi1                # or asi1-mini
AGENT_PORT=8001
```

**`backend/.env`**
```
BACKEND_PORT=8080
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json   # Firebase Admin key
FIREBASE_PROJECT_ID=studypilot-xxxx
AGENT_BASE_URL=http://localhost:8001
```

**`frontend/.env`** (Firebase Web app config — client-side, Auth only)
```
VITE_API_BASE_URL=http://localhost:8080/api
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=studypilot-xxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=studypilot-xxxx
```

## Install & run (three processes)

```bash
# 1. Agent (Python uAgents)
cd agent && pip install -r requirements.txt && python agent.py       # serves :8001

# 2. Backend (Express)
cd backend && npm install && npm run dev                             # serves :8080

# 3. Frontend (React)
cd frontend && npm install && npm run dev                            # serves :5173
```

## Smoke-test the agent directly (no auth required)

```bash
# Generate a quiz
curl -X POST http://localhost:8001/generate-quiz \
  -H "Content-Type: application/json" \
  -d '{"text":"Photosynthesis converts light energy into chemical energy...","num_mcq":3,"num_short":2}'

# Grade a short answer
curl -X POST http://localhost:8001/grade-short-answer \
  -H "Content-Type: application/json" \
  -d '{"question":"What gas is released?","expected_answer":"Oxygen","user_answer":"it gives off O2"}'
```

Expected: schema-valid JSON matching [contracts/agent-api.md](./contracts/agent-api.md)
(a quiz with both question types; `{"is_correct": true, ...}` for the grading call).

## End-to-end validation (maps to spec acceptance scenarios)

Obtain a Firebase ID token by logging in through the frontend (or the Firebase
Auth REST API) and use it as `Authorization: Bearer <token>` for backend calls.

### Scenario A — User Story 1 (P1): paste notes → quiz → score

1. Sign in via the frontend login page. *(FR-001)*
2. Paste a few paragraphs of notes and click "Generate Quiz".
   - Verify a quiz appears with BOTH multiple-choice and short-answer questions.
     *(FR-010; spec US1 scenario 1)*
   - Verify the quiz-taking payload contains NO correct answers (inspect the
     network response — answers are hidden). *(anti-cheat; backend-api.md)*
3. Answer all questions and submit.
   - Verify an overall score and a per-question correct/incorrect breakdown appear
     within ~10s, each showing your answer and the correct answer.
     *(FR-014, FR-015, SC-003; US1 scenarios 2–3)*
4. Leave one question blank and submit again.
   - Verify the blank question is marked incorrect. *(FR-016)*
5. Submit near-empty notes.
   - Verify a "needs more material" message and no quiz is generated (HTTP 422).
     *(FR-007; US1 scenario 4)*

### Scenario B — User Story 2 (P2): upload a document

1. Upload a PDF or `.txt` study document and generate a quiz.
   - Verify a quiz is generated from the document's content. *(FR-004/FR-005; US2 scenario 1)*
2. Upload an unsupported file type (e.g., `.docx`).
   - Verify it is rejected with a clear message (HTTP 400), no generation attempted.
     *(FR-006; US2 scenario 2)*
3. Upload a PDF with no extractable text.
   - Verify a "couldn't extract usable material" message (HTTP 422). *(US2 scenario 3)*

### Scenario C — User Story 3 (P3): history & progress

1. Complete at least two attempts (retake the same quiz).
   - Open History: verify previously generated quizzes are listed. *(FR-020; US3 scenario 1)*
   - Open a past quiz/attempt: verify questions, your answers, and the score are
     shown. *(FR-020; US3 scenario 2)*
   - Verify each attempt on the same quiz is a separate entry with its own score and
     timestamp. *(FR-022; US3 scenario 4)*
   - Verify scores across attempts are visible to gauge progress. *(FR-021; US3 scenario 3)*
2. Sign in as a different user.
   - Verify none of the first user's quizzes or attempts are visible. *(FR-002, SC-004)*

### Scenario D — resilience

1. Stop the agent process, then submit a quiz with a short-answer question.
   - Verify the backend returns a retryable error (HTTP 502/504) and the attempt is
     NOT saved; resubmitting after restarting the agent succeeds without re-taking.
     *(FR-012; spec Edge Cases)*

## Automated tests

```bash
cd backend && npm test     # unit: MCQ scoring, extraction, validation; integration: routes (agent + Firestore mocked)
cd agent && pytest         # generation + grading handlers (ASI:One mocked)
cd frontend && npm test    # core flow components
```

Business logic tests MUST pass without any live Firestore or ASI:One connection
(Constitution Principle IV) — both are reached behind seams that tests substitute.

## Done / success signals

- Scenarios A–D pass as described.
- Success criteria SC-001..SC-006 in [spec.md](./spec.md) are observable.
- No answer material is exposed in quiz-taking responses.
