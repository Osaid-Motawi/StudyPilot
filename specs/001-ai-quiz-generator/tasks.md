---

description: "Task list for AI-Powered Study Quiz Generator"
---

# Tasks: AI-Powered Study Quiz Generator

**Input**: Design documents from `/specs/001-ai-quiz-generator/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. The StudyPilot Constitution (v1.1.0) *Development Workflow &
Quality Gates* mandates automated tests for backend business logic and agent
input/output handling, runnable without live Firestore or ASI:One (Principle IV).
Test tasks below are scoped to that mandate.

**Organization**: Tasks are grouped by user story (P1→P3) so each story is an
independently implementable and testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 / US3 (setup, foundational, and polish tasks have no story label)
- File paths are relative to the repository root

## Path Conventions

Web app with three projects at the repo root: `frontend/`, `backend/`, `agent/`
(per plan.md Structure Decision).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Repository layout and per-project initialization

- [X] T001 Create the three top-level project directories `frontend/`, `backend/`, `agent/` and a root `.gitignore` (ignore `node_modules/`, `.env`, `serviceAccount.json`, `__pycache__/`, `venv/`)
- [X] T002 [P] Initialize the backend Node.js project in `backend/` with Express, Firebase Admin SDK, and `multer`; add `dev`/`start`/`test` scripts in `backend/package.json`
- [X] T003 [P] Initialize the frontend React project in `frontend/` (Vite) with the Firebase JS SDK; add `dev`/`build`/`test` scripts in `frontend/package.json`
- [X] T004 [P] Initialize the agent Python project in `agent/` with `agent/requirements.txt` (`uagents`, `openai`) and a `venv`
- [X] T005 [P] Configure linting/formatting: ESLint+Prettier for `backend/` and `frontend/`, Ruff/Black for `agent/`
- [X] T006 [P] Add `.env.example` files for each layer (`backend/.env.example`, `frontend/.env.example`, `agent/.env.example`) matching the variables in quickstart.md

**Checkpoint**: All three projects install and run an empty "hello" process.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Cross-cutting infrastructure every user story depends on — auth,
Firestore access, the agent process skeleton, the ASI:One client, and the
frontend app shell with login. Story FR-001 (must be authenticated) means login is
foundational.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Backend foundation

- [X] T007 [P] Implement the Firestore client seam in `backend/src/clients/firestoreClient.js` (initialize Firebase Admin from `GOOGLE_APPLICATION_CREDENTIALS`, export a `db` handle; injectable/mockable for tests)
- [X] T008 [P] Implement the agent client seam in `backend/src/clients/agentClient.js` (`generateQuiz(text, opts)` and `gradeShortAnswer({question, expectedAnswer, userAnswer})` calling `AGENT_BASE_URL`; injectable/mockable per contracts/agent-api.md)
- [X] T009 Implement Firebase ID token verification middleware in `backend/src/middleware/verifyFirebaseToken.js` (verify `Authorization: Bearer`, attach `req.uid`, return 401 on missing/invalid) (depends on T007)
- [X] T010 [P] Implement the centralized error handler + error model in `backend/src/middleware/errorHandler.js` returning `{ "error": { "code", "message" } }` with the status map in contracts/backend-api.md (400/401/404/422/502/504)
- [X] T011 Create the Express app + server bootstrap in `backend/src/app.js` and `backend/src/server.js` (mount `verifyFirebaseToken` on `/api`, mount error handler, health route) (depends on T009, T010)

### Agent foundation

- [X] T012 [P] Define the uAgents request/response `Model` types in `agent/models.py` (`GenerateQuizRequest/Response`, `GradeRequest/GradeResponse`) per contracts/agent-api.md
- [X] T013 [P] Implement the ASI:One client wrapper in `agent/asi_client.py` (OpenAI SDK with `base_url=ASI_ONE_BASE_URL`, bearer key, `chat.completions.create` with strict `json_schema` `response_format`; injectable/mockable)
- [X] T014 Create the uAgent bootstrap in `agent/agent.py` (instantiate `Agent` on `AGENT_PORT`, wire empty `on_rest_post` handlers to be filled per story) (depends on T012, T013)

### Frontend foundation

- [X] T015 [P] Implement the Firebase Auth service in `frontend/src/services/authService.js` (sign-in/sign-out, current-user, `getIdToken()`)
- [X] T016 [P] Implement the API client in `frontend/src/services/apiClient.js` (attach `Authorization: Bearer <idToken>` from authService to every request against `VITE_API_BASE_URL`)
- [X] T017 Implement the app shell + routing + auth guard in `frontend/src/App.jsx` and a `frontend/src/pages/LoginPage.jsx` (redirect unauthenticated users to login) (depends on T015)

**Checkpoint**: A user can log in; authenticated requests reach the backend and are
verified; the agent process starts and the ASI:One client is callable.

---

## Phase 3: User Story 1 - Generate and take a quiz from pasted notes (Priority: P1) 🎯 MVP

**Goal**: A logged-in user pastes notes, generates a mixed MCQ + short-answer quiz,
takes it, submits, and immediately sees a score with a per-question
correct/incorrect breakdown.

**Independent Test**: Log in, paste notes, generate a quiz (verify both question
types present and answers hidden in the taking payload), answer and submit, verify
score + per-question breakdown with correct answers; verify blank answers score
incorrect and too-short notes are rejected (422).

### Tests for User Story 1 ⚠️ (write first, ensure they FAIL)

- [X] T018 [P] [US1] Agent test for `POST /generate-quiz` in `agent/tests/test_generate_quiz.py` (ASI:One mocked: returns ≥1 MCQ and ≥1 short-answer, valid schema; empty text → 400)
- [X] T019 [P] [US1] Agent test for `POST /grade-short-answer` in `agent/tests/test_grade.py` (ASI:One mocked: semantic match → `is_correct=true`; empty user answer → `false`)
- [X] T020 [P] [US1] Backend unit test for deterministic MCQ scoring in `backend/tests/unit/mcqScoring.test.js` (correct/incorrect/unanswered → incorrect)
- [X] T021 [P] [US1] Backend unit test for quiz payload answer-hiding in `backend/tests/unit/quizView.test.js` (taking view omits `correctOptionIndex` and `expectedAnswer`)
- [X] T022 [P] [US1] Backend integration test for generate + take flow in `backend/tests/integration/quizFlow.test.js` (agent + Firestore mocked: POST /api/quizzes → GET /api/quizzes/:id hides answers → POST /api/quizzes/:id/attempts returns score + breakdown; blank answer scored incorrect)

### Agent implementation for User Story 1

- [X] T023 [P] [US1] Add generation + grading prompts and strict JSON schemas in `agent/prompts.py` (quiz-generation schema per contracts/agent-api.md; grading schema `{is_correct, rationale}`)
- [X] T024 [US1] Implement the `on_rest_post("/generate-quiz", ...)` handler in `agent/agent.py` (call ASI:One via `asi_client`, enforce ≥1 of each type, return `GenerateQuizResponse`) (depends on T023, T014)
- [X] T025 [US1] Implement the `on_rest_post("/grade-short-answer", ...)` handler in `agent/agent.py` (semantic verdict per FR-017, return `GradeResponse`) (depends on T023, T014)

### Backend implementation for User Story 1

- [X] T026 [P] [US1] Implement Quiz model + validation and camelCase mapping in `backend/src/lib/quizModel.js` (shape per data-model.md; assign stable `Question.id`s; build the answers-hidden "taking view")
- [X] T027 [P] [US1] Implement deterministic MCQ scoring in `backend/src/lib/mcqScoring.js` (compare submitted option index to `correctOptionIndex`; unanswered → incorrect) (FR-017a, FR-016)
- [X] T028 [US1] Implement `quizService` in `backend/src/services/quizService.js` (validate material sufficiency → call `agentClient.generateQuiz` → persist under `users/{uid}/quizzes/{quizId}`; get-for-taking returns hidden view) (depends on T007, T008, T026)
- [X] T029 [US1] Implement `attemptService` in `backend/src/services/attemptService.js` (score MCQs via `mcqScoring`, grade short-answers via `agentClient.gradeShortAnswer`, compute score/scorePercent, persist under `users/{uid}/attempts/{attemptId}`; on agent failure do NOT persist and surface retryable error) (depends on T008, T027)
- [X] T030 [US1] Implement quiz routes in `backend/src/routes/quizzes.js` — `POST /api/quizzes` (text mode), `GET /api/quizzes/:id` (hidden view, 404 if not owned) — and mount in `app.js` (depends on T028, T011)
- [X] T031 [US1] Implement attempt submission route `POST /api/quizzes/:id/attempts` in `backend/src/routes/attempts.js` (returns graded result with correct answers) and mount in `app.js` (depends on T029, T011)

### Frontend implementation for User Story 1

- [X] T032 [P] [US1] Implement the Create Quiz page (paste mode) in `frontend/src/pages/CreateQuizPage.jsx` (textarea + "Generate Quiz" → `apiClient` POST /quizzes; show 422 "needs more material" message)
- [X] T033 [P] [US1] Implement the Take Quiz component in `frontend/src/components/QuizTaker.jsx` (render MCQ options + short-answer inputs, allow blanks, submit answers)
- [X] T034 [US1] Implement the Results component in `frontend/src/components/QuizResults.jsx` (show score, and per-question correct/incorrect with user answer + correct answer + rationale) (depends on T033)
- [X] T035 [US1] Wire the Create→Take→Results flow with routes/state in `frontend/src/App.jsx` (depends on T032, T033, T034, T017)

**Checkpoint**: User Story 1 is fully functional end-to-end — the MVP. Deploy/demo.

---

## Phase 4: User Story 2 - Generate a quiz from an uploaded document (Priority: P2)

**Goal**: A logged-in user uploads a PDF or text file; the backend extracts text
and generates a quiz the same way as pasted notes.

**Independent Test**: Upload a supported PDF/`.txt` → quiz generated and takeable;
unsupported file → clear rejection (400); PDF with no extractable text → 422.

### Tests for User Story 2 ⚠️ (write first, ensure they FAIL)

- [X] T036 [P] [US2] Backend unit test for text extraction in `backend/tests/unit/extractText.test.js` (valid PDF and `.txt` → text; unsupported type → error; empty/no-text → error)
- [X] T037 [P] [US2] Backend integration test for upload mode in `backend/tests/integration/upload.test.js` (agent + Firestore mocked: multipart PDF → 201 quiz; `.docx` → 400; no-text PDF → 422)

### Implementation for User Story 2

- [X] T038 [P] [US2] Implement upload middleware in `backend/src/middleware/upload.js` (multer in-memory, accept only PDF and `.txt`, size cap; reject others with 400)
- [X] T039 [P] [US2] Implement text extraction in `backend/src/lib/extractText.js` (PDF via a text-extraction library; `.txt` direct decode; throw a typed error when no usable text) (FR-005/FR-006)
- [X] T040 [US2] Extend `POST /api/quizzes` in `backend/src/routes/quizzes.js` to accept `multipart/form-data` (run upload middleware + `extractText`, then reuse `quizService`; set `sourceType="upload"`) (depends on T038, T039, T030)
- [X] T041 [US2] Add document upload UI to `frontend/src/pages/CreateQuizPage.jsx` (file picker with paste/upload toggle; surface 400/422 messages) (depends on T032)

**Checkpoint**: User Stories 1 AND 2 both work independently (paste or upload).

---

## Phase 5: User Story 3 - Review past quizzes and track progress (Priority: P3)

**Goal**: A returning user lists previously generated quizzes and past attempts
(scores over time), and reopens any attempt for review; data is private per user.

**Independent Test**: After ≥2 attempts, open History → see quizzes and separate
per-attempt entries with scores/timestamps; reopen an attempt to review; sign in as
another user and confirm none of the first user's data is visible.

### Tests for User Story 3 ⚠️ (write first, ensure they FAIL)

- [X] T042 [P] [US3] Backend integration test for listing in `backend/tests/integration/history.test.js` (Firestore mocked: GET /api/quizzes, GET /api/attempts with `quizId` filter, GET /api/attempts/:id; multiple attempts listed separately)
- [X] T043 [P] [US3] Backend integration test for cross-user isolation in `backend/tests/integration/isolation.test.js` (user B gets 404 for user A's quiz and attempt) (FR-002, SC-004)

### Implementation for User Story 3

- [X] T044 [US3] Add list/read methods for quizzes and attempts to `backend/src/services/quizService.js` and `backend/src/services/attemptService.js` (list quizzes metadata; list attempts with optional `quizId`; get one attempt; all scoped to `req.uid`) (depends on T028, T029)
- [X] T045 [US3] Implement `GET /api/quizzes` (list) in `backend/src/routes/quizzes.js` and `GET /api/attempts` + `GET /api/attempts/:id` in `backend/src/routes/attempts.js` (404 if not owned) (depends on T044)
- [X] T046 [P] [US3] Implement the History page in `frontend/src/pages/HistoryPage.jsx` (quizzes list, attempts list with scores + dates, progress view across attempts, reopen an attempt into QuizResults) (depends on T034, T016)
- [X] T047 [US3] Add the History route + navigation entry in `frontend/src/App.jsx` (depends on T046, T017)

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Hardening and validation across all stories

- [X] T048 [P] Add Firestore security rules in `firestore.rules` denying direct client reads/writes (all data access goes through the backend Admin SDK — defense-in-depth per research.md)
- [X] T049 [P] Add frontend tests for the core flow in `frontend/tests/coreFlow.test.jsx` (Vitest + React Testing Library: create → take → results renders score/breakdown)
- [X] T050 [P] Write `README.md` run instructions for all three layers (reference quickstart.md; do not duplicate)
- [X] T051 Review error messages across backend routes for user-friendliness and no internal-detail leakage (align with contracts/backend-api.md error model)
- [X] T052 Execute the quickstart.md validation (Scenarios A–D) end-to-end against running frontend + backend + agent and confirm SC-001..SC-006 (Scenario A + C validated live against real ASI:One + Firestore: generate→take→score→history + cross-user isolation; Scenario B upload and D resilience covered by backend integration tests)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phase 3–5)**: All depend on Foundational. US1 is the MVP; US2 and
  US3 build on US1's routes/components but each remains independently testable.
- **Polish (Phase 6)**: Depends on the desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Only depends on Foundational. Self-contained MVP.
- **US2 (P2)**: Depends on Foundational; extends US1's `POST /api/quizzes` and Create
  Quiz page. Testable on its own (upload → quiz → score).
- **US3 (P3)**: Depends on Foundational; reads quizzes/attempts produced by US1/US2
  and reuses the Results component. Testable on its own via seeded data.

### Within Each User Story

- Tests written first and failing → then implementation.
- Agent handlers and backend libs (models, scoring, extraction) before services.
- Services before routes; routes before/with frontend wiring.

### Parallel Opportunities

- Setup: T002–T006 run in parallel after T001.
- Foundational: backend (T007, T008, T010), agent (T012, T013), and frontend (T015,
  T016) `[P]` tasks run in parallel across layers; T009/T011/T014/T017 join after
  their deps.
- US1 tests T018–T022 run in parallel; libs T026/T027 and frontend T032/T033 run in
  parallel.
- Across stories: once Foundational is done, US1/US2/US3 can be staffed to different
  developers (mind the noted extension points).

---

## Parallel Example: User Story 1

```bash
# Write the failing tests together:
Task: "Agent test for /generate-quiz in agent/tests/test_generate_quiz.py"
Task: "Agent test for /grade-short-answer in agent/tests/test_grade.py"
Task: "Backend unit test for MCQ scoring in backend/tests/unit/mcqScoring.test.js"
Task: "Backend unit test for answer-hiding in backend/tests/unit/quizView.test.js"

# Then build independent libs in parallel:
Task: "Quiz model + hidden view in backend/src/lib/quizModel.js"
Task: "Deterministic MCQ scoring in backend/src/lib/mcqScoring.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup → 2. Phase 2: Foundational (CRITICAL) → 3. Phase 3: User Story 1.
4. **STOP and VALIDATE**: run Scenario A from quickstart.md. 5. Deploy/demo the MVP.

### Incremental Delivery

Foundation → US1 (MVP, paste→quiz→score) → US2 (upload) → US3 (history/progress).
Each story ships independently without breaking the previous ones.

### Parallel Team Strategy

After Foundational: Developer A → US1, Developer B → US2 (upload path), Developer
C → US3 (history), coordinating on the shared `POST /api/quizzes` route and the
Results component.

---

## Notes

- `[P]` = different files, no dependency on an incomplete task.
- `[Story]` label maps each task to a user story for traceability (Setup /
  Foundational / Polish have no label).
- Tests satisfy the constitution's mandate and MUST pass without live Firestore or
  ASI:One (seams: `firestoreClient`, `agentClient`, `asi_client`).
- Commit after each task or logical group; stop at any checkpoint to validate.
