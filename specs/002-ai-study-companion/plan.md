# Implementation Plan: AI Study Companion (Four-Part Expansion)

**Branch**: `002-ai-study-companion` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-ai-study-companion/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Extend the existing StudyPilot app (feature 001) into a four-part AI Study
Companion **without restarting** — reusing the Firebase auth wiring, Firestore
model, existing quiz/attempt code, the design system, and the child-process PDF
extractor. The three-layer split is preserved: **React** frontend (add AI Chat,
File/Image Analysis, and Profile pages + a question-type selector on Create Quiz),
**Node/Express** backend (owns Firestore, auth, orchestration, and deterministic
scoring of multiple-choice **and** matching), and the **Python uAgents** agent
(all AI logic via ASI:One: multi-type generation, fill-in-blank + essay grading,
general chat, and image/file analysis).

**Key research outcome**: current ASI:One documentation exposes text chat
completions and an image-*generation* endpoint, but **no image *input* (vision)**.
So the agent performs **OCR on uploaded images** (Tesseract via `pytesseract`) to
produce text, keeping the entire downstream pipeline text-based. PDFs/`.txt`
continue to be extracted by the backend; images are OCR'd by the agent.

## Technical Context

**Language/Version**: Frontend — React 18 + Vite (JS). Backend — Node.js 20+ +
Express 4 (CommonJS). Agent — Python 3.11 + uAgents.

**Primary Dependencies**: (existing) React, firebase (Auth), react-router-dom;
Express, firebase-admin, multer, pdf-parse; uagents, openai. **New**: `pytesseract`
(+ the Tesseract OCR binary) in the agent for image → text. No other new libraries.

**Storage**: Firestore only. Existing: `users/{uid}/quizzes`,
`users/{uid}/attempts`. **New**: `users/{uid}/chats/{chatId}` (persisted general +
analysis chats). Uploaded image/file bytes are NOT persisted — only extracted text
(carried into a quiz's `sourceText` or a chat's grounding context).

**Testing**: Backend — Jest + Supertest (Firestore + agent mocked). Agent — pytest
(ASI:One client and OCR mocked). Frontend — Vitest + RTL for the new pages/flows.

**Target Platform**: Web app; backend + agent run as two server processes.

**Project Type**: Web application — existing `frontend/`, `backend/`, `agent/`.

**Performance Goals**: Quiz of any type generated in <60s (SC-001); score +
feedback within ~10s of submission (SC-003); chat/analysis reply within ~10s
(SC-005).

**Constraints**: Minimal stack — no new datastore, no queues, no libraries beyond
OCR. Backend never exposes answer material before submission (anti-cheat, carried
over). All routes require a Firebase ID token; all data scoped to `uid`. Matching
quizzes carry 3–10 pairs. Accepted uploads: PNG/JPG/JPEG/WebP + PDF + `.txt`.

**Scale/Scope**: Single-user private data; modest concurrency. 4 user stories
(P1–P4), 8 entities, ~30 functional requirements, 4 question types.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against StudyPilot Constitution **v1.2.0**:

| Principle | Assessment | Status |
|-----------|------------|--------|
| I. Layered Separation | Same three projects; frontend↔backend↔agent only over REST; frontend never touches Firestore/agent directly. | ✅ PASS |
| II. Agent Responsibility Boundary | Agent does ALL AI work: multi-type generation, fill-in-blank + essay grading, general chat, image analysis (OCR + reasoning). Backend scores multiple-choice + matching deterministically, persists (incl. chats), and enforces auth. Matches v1.2.0 exactly. | ✅ PASS |
| III. Managed Platform | Firebase Auth + Firestore only; new `chats` subcollection follows the same per-user isolation. No new datastore. | ✅ PASS |
| IV. Simplicity, Modularity & Testability | Reuses existing seams; only new dependency is OCR (required for images). Firestore/agent/ASI:One/OCR all behind mockable seams. | ✅ PASS |
| V. MVP-First Delivery | Sequenced P1→P4; the extended Quiz Generator (P1) ships first, reusing the working 001 loop; Profile/Chat/Analysis layer on top. | ✅ PASS |

**Result**: No violations. See Complexity Tracking for the one justified new
dependency (OCR).

## Project Structure

### Documentation (this feature)

```text
specs/002-ai-study-companion/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── backend-api.md    # Frontend ↔ Backend REST (new + extended endpoints)
│   └── agent-api.md      # Backend ↔ Agent REST (new + extended endpoints)
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root) — additions marked (NEW)

```text
frontend/src/
├── pages/
│   ├── CreateQuizPage.jsx      # EXTEND: question-type selector (mcq/fill_blank/essay/matching)
│   ├── ChatPage.jsx            # NEW (Part 3): general AI chat, persisted
│   ├── AnalysisPage.jsx        # NEW (Part 4): upload image/file → chat OR quiz
│   ├── ProfilePage.jsx         # NEW (Part 2): overview + history + review
│   └── HistoryPage.jsx         # (existing; Profile supersedes/absorbs it)
├── components/
│   ├── QuizTaker.jsx           # EXTEND: render fill_blank / essay / matching inputs
│   ├── QuizResults.jsx         # EXTEND: per-type feedback (essay score+comment)
│   ├── ChatThread.jsx          # NEW: message list + composer (shared by Chat + Analysis)
│   └── MatchingQuestion.jsx    # NEW: pairing UI
└── services/apiClient.js       # EXTEND: chats, analysis, profile, question-type calls

backend/src/
├── routes/
│   ├── quizzes.js              # EXTEND: questionType; image uploads
│   ├── attempts.js             # EXTEND: matching + essay/fill_blank grading routing
│   ├── chats.js                # NEW: create/list/get chat, post message
│   ├── analysis.js             # NEW: upload + mode (chat|quiz)
│   └── profile.js              # NEW: overview aggregates
├── services/
│   ├── quizService.js          # EXTEND: per-type generation + validation (matching 3–10)
│   ├── attemptService.js       # EXTEND: scoring dispatch by type
│   ├── chatService.js          # NEW: persist + continue conversations
│   └── profileService.js       # NEW: average score, totals, list
├── lib/
│   ├── scoring.js              # NEW/EXTEND: mcqScoring + matchingScoring (deterministic)
│   └── extractText.js          # reuse (PDF/.txt); images go to the agent
└── clients/agentClient.js      # EXTEND: generateQuiz(type,image?), gradeEssay, gradeFillBlank, chat, analyze

agent/
├── agent.py                    # EXTEND: new on_rest_post endpoints
├── asi_client.py               # EXTEND: essay grading, chat, per-type generation
├── ocr.py                      # NEW: image bytes → text (pytesseract), mockable
├── prompts.py                  # EXTEND: per-type generation + essay-grading + chat prompts/schemas
├── models.py                   # EXTEND: new request/response Models
└── requirements.txt            # ADD: pytesseract
```

**Structure Decision**: Continue the existing web-application layout. All new work
is additive within the three existing projects. Backend remains the sole holder of
Firestore credentials; the agent remains the sole holder of ASI:One credentials
and now also owns image OCR (vision), consistent with Principle II.

## Complexity Tracking

| Violation / Addition | Why Needed | Simpler Alternative Rejected Because |
|----------------------|------------|--------------------------------------|
| New dependency: OCR (`pytesseract` + Tesseract) in the agent | Image analysis + image→quiz (FR-024..027) require turning images into text, and ASI:One has no vision input | Native ASI:One vision would be simpler but is not available per current docs; sending raw images downstream is impossible without a vision model. `easyocr` rejected as heavier (pulls PyTorch). |
