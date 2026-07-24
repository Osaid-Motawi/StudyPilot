---

description: "Task list for AI Study Companion (Four-Part Expansion)"
---

# Tasks: AI Study Companion (Four-Part Expansion)

**Input**: Design documents from `/specs/002-ai-study-companion/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included (Constitution v1.2.0 mandates automated tests for backend
business logic and agent I/O, runnable without live Firestore/ASI:One/Tesseract via
seams). Scoped to that mandate.

**Organization**: Grouped by user story (P1→P4). This EXTENDS the existing
`frontend/`, `backend/`, `agent/` code from feature 001 — additive, not a rewrite.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different files, no dependency on an incomplete task
- **[Story]**: US1 / US2 / US3 / US4 (Setup / Foundational / Polish have no label)
- Paths are relative to the repository root

---

## Phase 1: Setup

- [X] T001 Add `pytesseract` to `agent/requirements.txt` and install it into `agent/venv`; document the Tesseract binary prerequisite (already noted in quickstart.md).
- [X] T002 [P] Verify frontend/back deps cover the expansion (no new npm libs expected); confirm `multer` image mimetypes and add any missing dev-test setup in `frontend/` for the new pages.

**Checkpoint**: Agent can import `pytesseract`; projects still build and test green.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared seams and cross-cutting wiring every story depends on.

**⚠️ CRITICAL**: Complete before starting any user story.

### Agent shared seams

- [X] T003 [P] Add image OCR seam in `agent/ocr.py` (`image_to_text(image_bytes) -> str` via pytesseract; injectable/mockable; returns '' when no text).
- [X] T004 [P] Extend `agent/models.py` with new uAgents `Model` types per contracts/agent-api.md (GenerateQuizRequest with `question_type`/`image_base64`, typed Question variants, GradeEssayRequest/Response, ChatRequest/Response, AnalyzeImageRequest/Response).
- [X] T005 [P] Extend `agent/prompts.py` with strict `json_schema` prompts for per-type generation (mcq/fill_blank/essay/matching), essay grading (`{score,feedback}`), and the chat system prompt.
- [X] T006 Extend `agent/asi_client.py` with helpers: `generate_quiz(text, question_type, n)`, `grade_essay(...)`, `chat(messages, context_text)` — all using ASI:One structured output where applicable and mockable (depends on T005).

### Backend shared seams

- [X] T007 Extend `backend/src/clients/agentClient.js` with `generateQuiz({text,image,questionType,numQuestions})`, `gradeEssay(...)`, `gradeFillBlank(...)` (reuse `/grade-short-answer`), `chat({messages,contextText})`, `analyzeImage(imageBase64)` — mockable per contracts/agent-api.md.
- [X] T008 [P] Add `users/{uid}/chats` access helpers to `backend/src/clients/firestoreClient.js` usage (no new client; document the subcollection path pattern) and confirm per-user scoping utilities are reusable.

### Frontend shared wiring

- [X] T009 Extend the shared nav + routing in `frontend/src/App.jsx` to include four auth-guarded pages: Create Quiz, AI Chat, File/Image Analysis, Profile (FR-001/002/004).
- [X] T010 [P] Extend `frontend/src/services/apiClient.js` with calls for question-type generation, chats (create/message/list/get), analysis (multipart), and profile overview.

**Checkpoint**: Agent seams + prompts exist; backend agentClient exposes all new
calls; the four pages are routable and guarded.

---

## Phase 3: User Story 1 — Quiz of a chosen question type (Priority: P1) 🎯 MVP

**Goal**: Users pick a question type (mcq/fill_blank/essay/matching), generate a
quiz of that type, take it, and get an overall score + per-question feedback.

**Independent Test**: For each type: generate from pasted notes (answers hidden),
take, submit, verify correct scoring/feedback; matching has 3–10 pairs; essay gets
score + written feedback.

### Tests for User Story 1 ⚠️ (write first, ensure they FAIL)

- [X] T011 [P] [US1] Agent test in `agent/tests/test_generate_types.py` (ASI:One mocked: each `question_type` yields a valid typed quiz; matching clamped 3–10).
- [X] T012 [P] [US1] Agent test in `agent/tests/test_grade_essay.py` (ASI:One mocked: returns `{score 0–100, feedback}`; empty answer → 0).
- [X] T013 [P] [US1] Backend unit test in `backend/tests/unit/matchingScoring.test.js` (correct/partial/none correct pairings; unanswered → 0).
- [X] T014 [P] [US1] Backend unit test in `backend/tests/unit/quizViewTypes.test.js` (taking view hides `correctOptionIndex`/`expectedAnswer`/`referenceAnswer`/`correctPairs` for every type).
- [X] T015 [P] [US1] Backend integration test in `backend/tests/integration/quizTypesFlow.test.js` (agent + Firestore mocked: generate→take→submit for mcq, matching, fill_blank, essay; correct `scorePercent` per type).

### Agent implementation for US1

- [X] T016 [US1] Extend `agent/agent.py` `/generate-quiz` handler to honor `question_type` and OCR `image_base64` via `ocr.py` before generation; enforce type-specific schema and matching 3–10 (depends on T003, T005, T006).
- [X] T017 [US1] Add `/grade-essay` `on_rest_post` handler in `agent/agent.py` returning `{score,feedback}` (depends on T005, T006).

### Backend implementation for US1

- [X] T018 [P] [US1] Add deterministic matching scoring in `backend/src/lib/scoring.js` (alongside existing mcq scoring); export both (FR-011).
- [X] T019 [P] [US1] Extend `backend/src/lib/quizModel.js` to normalize/validate all four question types and build type-aware taking views (assign ids; hide answer material).
- [X] T020 [US1] Extend `backend/src/services/quizService.js`: accept `questionType`+`numQuestions`, route images to `agentClient.analyzeImage`/generate, validate (matching 3–10), persist `questionType` (depends on T007, T019).
- [X] T021 [US1] Extend `backend/src/services/attemptService.js`: dispatch grading by type — mcq/matching in backend (`scoring.js`), fill_blank via `gradeFillBlank`, essay via `gradeEssay`; compute unified `scorePercent`; persist (depends on T007, T018).
- [X] T022 [US1] Extend routes in `backend/src/routes/quizzes.js` and `attempts.js` for `questionType` and image uploads (accept PNG/JPG/JPEG/WebP + PDF + .txt) (depends on T020, T021).

### Frontend implementation for US1

- [X] T023 [P] [US1] Add a question-type selector to `frontend/src/pages/CreateQuizPage.jsx` (mcq/fill_blank/essay/matching) and pass it to the API.
- [X] T024 [P] [US1] Add `frontend/src/components/MatchingQuestion.jsx` (pairing UI).
- [X] T025 [US1] Extend `frontend/src/components/QuizTaker.jsx` to render fill_blank inputs, essay textareas, and matching (via MatchingQuestion) (depends on T024).
- [X] T026 [US1] Extend `frontend/src/components/QuizResults.jsx` to show per-type feedback, including essay score + written feedback.

**Checkpoint**: All four question types generate, take, score, and show feedback —
the MVP increment. Deploy/demo.

---

## Phase 4: User Story 2 — Profile: overview + history + review (Priority: P2)

**Goal**: A Profile page showing overall average score, total quizzes taken, a list
of every quiz (title, type, score, date), and read-only full review of any entry.

**Independent Test**: After ≥2 attempts of different types, open Profile → verify
average + total, the list, and read-only review; empty state for a new user.

### Tests for User Story 2 ⚠️

- [X] T027 [P] [US2] Backend integration test in `backend/tests/integration/profile.test.js` (Firestore mocked: overview average + total; list includes questionType; empty state; cross-user isolation returns none/404).

### Implementation for US2

- [X] T028 [P] [US2] Add `backend/src/services/profileService.js` (compute averageScorePercent + totalQuizzes over the user's attempts).
- [X] T029 [US2] Add `GET /api/profile/overview` in `backend/src/routes/profile.js` and mount in `app.js`; ensure `GET /api/attempts` items include `questionType` (depends on T028).
- [X] T030 [P] [US2] Add `frontend/src/pages/ProfilePage.jsx` — overview stats, per-quiz list (title, type, score, date), and reopen-to-review reusing `QuizResults` read-only (FR-016..020).
- [X] T030a [US2] Retire the legacy History page: remove `frontend/src/pages/HistoryPage.jsx` and its route from `frontend/src/App.jsx` (Profile supersedes it), and redirect any `/history` path to `/profile` so no orphaned route remains. Update/replace the existing `frontend/tests/` history references accordingly.

**Checkpoint**: Profile shows accurate stats + reviewable read-only history; the old History page is gone and `/history` redirects to Profile.

---

## Phase 5: User Story 3 — General AI Chat, persisted (Priority: P3)

**Goal**: A chat page where users ask free-form questions and get AI answers,
multi-turn, persisted per user across sessions.

**Independent Test**: Send a question → AI reply; follow-up retains context; sign
out/in → conversation persists; agent-down → retryable error, message preserved.

### Tests for User Story 3 ⚠️

- [X] T031 [P] [US3] Agent test in `agent/tests/test_chat.py` (ASI:One mocked: multi-turn reply uses history; optional context_text honored).
- [X] T032 [P] [US3] Backend integration test in `backend/tests/integration/chats.test.js` (Firestore + agent mocked: create/list/get/post-message; persistence; isolation 404).

### Implementation for US3

- [X] T033 [US3] Add `/chat` `on_rest_post` handler in `agent/agent.py` (stateless; uses supplied messages + optional context_text) (depends on T006).
- [X] T034 [US3] Add `backend/src/services/chatService.js` (create chat, append message, replay recent history to `agentClient.chat`, persist under `users/{uid}/chats`).
- [X] T035 [US3] Add `backend/src/routes/chats.js` (`POST /api/chats`, `POST /api/chats/:id/messages`, `GET /api/chats`, `GET /api/chats/:id`; 404 if not owned) and mount in `app.js` (depends on T034).
- [X] T036 [P] [US3] Add `frontend/src/components/ChatThread.jsx` (message list + composer; retry on failure preserving input) — shared with US4.
- [X] T037 [US3] Add `frontend/src/pages/ChatPage.jsx` (list past chats + open/continue) using ChatThread (depends on T036).

**Checkpoint**: Persisted, multi-turn general chat works end to end.

---

## Phase 6: User Story 4 — File/Image Analysis (Priority: P4)

**Goal**: Upload an image or file and either chat about its content (follow-ups) or
generate a quiz/exam from it. Images are OCR'd by the agent; the resulting quiz
appears in Profile history.

**Independent Test**: Upload image + chat → content-aware answer; upload PDF + quiz
→ quiz generated and in history; unsupported → 400; unreadable image → 422.

### Tests for User Story 4 ⚠️

- [X] T038 [P] [US4] Agent test in `agent/tests/test_analyze_image.py` (OCR seam mocked: `/analyze-image` returns extracted text; empty image → ''; **OCR raising an exception / Tesseract unavailable → handled gracefully (empty or typed error), never an unhandled crash**).
- [X] T039 [P] [US4] Backend integration test in `backend/tests/integration/analysis.test.js` (agent + Firestore mocked: chat mode grounds on content; quiz mode returns a quiz; unsupported → 400; empty text → 422).

### Implementation for US4

- [X] T040 [US4] Add `/analyze-image` `on_rest_post` handler in `agent/agent.py` (OCR image → text) (depends on T003).
- [X] T040a [US4] Make image OCR resilient (mirrors the pdf-parse hardening): `agent/ocr.py` and the `/analyze-image` handler MUST catch OCR/Tesseract failures — including a missing Tesseract binary — and return empty text or a typed error rather than crashing. The backend maps empty extracted text → 422 (`no_extractable_text`) and an OCR/agent failure → 502, so the user always sees a clear, retryable message, never a 500. Verified by the failure case in T038.
- [X] T041 [US4] Extend `backend/src/middleware/upload.js` to accept images (PNG/JPG/JPEG/WebP) in addition to PDF/.txt; reject others with 400.
- [X] T042 [US4] Add `backend/src/routes/analysis.js` (`POST /api/analysis`): extract text (backend for PDF/.txt, `agentClient.analyzeImage` for images; empty → 422); `mode=chat` grounds a chat via chatService; `mode=quiz` generates via quizService; mount in `app.js` (depends on T020, T034, T041).
- [X] T043 [P] [US4] Add `frontend/src/pages/AnalysisPage.jsx` (upload + mode toggle; chat mode reuses ChatThread, quiz mode reuses the take/results flow) (depends on T036, T025).

**Checkpoint**: All four parts function independently; analysis quizzes appear in
Profile.

---

## Phase 7: Polish & Cross-Cutting

- [X] T044 [P] Confirm `firestore.rules` deny-all still covers the new `users/{uid}/chats` subcollection (backend Admin SDK bypasses; no client access) — update + redeploy if needed.
- [X] T045 [P] Add frontend tests in `frontend/tests/` for the question-type selector, chat flow, analysis flow, and profile rendering (apiClient/auth mocked).
- [X] T046 [P] Update `README.md`: four pages, question types, Tesseract prerequisite for image OCR (reference quickstart.md).
- [X] T047 Review error messages + status codes across new routes for the shared error model (no internal leakage).
- [X] T048 Execute quickstart.md Scenarios A–D end-to-end against the running stack; confirm SC-001..SC-008.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (P1)** → **Foundational (P2)** blocks all stories.
- **US1 (P1)** depends only on Foundational — the MVP.
- **US2 (P2)** depends on Foundational + quiz attempts existing (US1) for meaningful data.
- **US3 (P3)** depends on Foundational (chat seams).
- **US4 (P4)** depends on Foundational + reuses US1 quiz pipeline and US3 chat infra (ChatThread, chatService).
- **Polish (P7)** after the desired stories.

### Within Each Story

- Tests first (fail) → agent handlers + backend libs/services → routes → frontend.
- Models/libs before services; services before routes; routes before/with UI.

### Parallel Opportunities

- Setup T002 alongside T001.
- Foundational: agent seams (T003/T004/T005) and frontend (T010) run parallel across layers; T006/T007/T009 join after deps.
- US1: tests T011–T015 parallel; libs T018/T019 and frontend T023/T024 parallel.
- After Foundational, US1/US3 can be staffed in parallel; US2 and US4 layer on after their prerequisites.

---

## Parallel Example: User Story 1

```bash
# Failing tests together:
Task: "Agent test per-type generation in agent/tests/test_generate_types.py"
Task: "Agent test essay grading in agent/tests/test_grade_essay.py"
Task: "Backend unit matching scoring in backend/tests/unit/matchingScoring.test.js"
Task: "Backend unit taking-view hiding in backend/tests/unit/quizViewTypes.test.js"

# Independent libs/UI together:
Task: "Matching scoring in backend/src/lib/scoring.js"
Task: "Type-aware quizModel in backend/src/lib/quizModel.js"
Task: "MatchingQuestion component in frontend/src/components/MatchingQuestion.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Setup → 2. Foundational → 3. US1 (all four question types). **Stop & validate**
Scenario A, deploy/demo.

### Incremental Delivery

Foundation → US1 (types, MVP) → US2 (Profile) → US3 (Chat) → US4 (Analysis). Each
ships without breaking the previous.

### Notes

- `[P]` = different files, no incomplete dependency; `[Story]` maps to spec user stories.
- Tests must pass without live Firestore/ASI:One/Tesseract (seams: firestoreClient,
  agentClient, asi_client, ocr).
- Reuse over rebuild: extend existing files; keep the design system and 001 patterns.
- Commit per task or logical group; stop at any checkpoint to validate a story.
