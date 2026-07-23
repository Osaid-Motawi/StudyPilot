# Implementation Plan: AI-Powered Study Quiz Generator

**Branch**: `001-ai-quiz-generator` | **Date**: 2026-07-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-ai-quiz-generator/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

StudyPilot turns study material into an auto-generated quiz (mixed multiple-choice
and short-answer), lets users take it in-app, and scores it immediately with a
per-question breakdown, persisting quizzes and attempt history for progress
tracking. The system is split into three layers per the constitution: a **React**
frontend, a **Node.js/Express** backend that owns all Firestore access and
verifies Firebase ID tokens, and a separate **Python uAgents** agent that owns all
AI logic — generating quizzes and semantically grading short-answer responses via
the OpenAI-compatible **ASI:One** API. Multiple-choice questions are scored
deterministically by the backend; the agent is never asked to score them.

## Technical Context

**Language/Version**: Frontend — JavaScript/TypeScript on React 18; Backend —
Node.js 20 LTS + Express 4; Agent — Python 3.11 + uAgents.

**Primary Dependencies**: Frontend — React, Firebase JS SDK (Auth only), a small
router + fetch wrapper. Backend — Express, Firebase Admin SDK (Auth token
verification + Firestore), a PDF text-extraction library, `multer` for uploads.
Agent — `uagents`, `openai` (pointed at ASI:One base URL), `pydantic` (via
uAgents `Model`).

**Storage**: Firebase Firestore only. Collections use per-user subcollections for
isolation: `users/{uid}/quizzes/{quizId}` and `users/{uid}/attempts/{attemptId}`.
No additional databases. Uploaded files are parsed to text in-memory and NOT
stored as blobs.

**Testing**: Backend — Jest + Supertest (Firestore and agent client behind seams
so business logic runs without live services). Agent — pytest (ASI:One client
mocked). Frontend — Vitest + React Testing Library for core flow components.

**Target Platform**: Web application (modern desktop + mobile browsers). Backend
and agent run as two separate server processes.

**Project Type**: Web application — three top-level projects: `frontend/`,
`backend/`, `agent/`.

**Performance Goals**: Quiz generation returns within ~60s for typical notes
(SC-001); score + breakdown shown within ~10s of submission, accounting for AI
grading of short answers (SC-003).

**Constraints**: Minimal stack — no message queues, no extra datastores, no
speculative libraries (Principle IV). Backend never sends short-answer expected
answers or MCQ correct options to the frontend before submission (anti-cheat). All
backend routes require a valid Firebase ID token (FR-001).

**Scale/Scope**: MVP for individual users; single-user private data. Modest
concurrency (tens of simultaneous users). Three user stories (P1–P3), 5 entities,
22 functional requirements.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against StudyPilot Constitution v1.1.0:

| Principle | Assessment | Status |
|-----------|------------|--------|
| I. Layered Separation of Concerns | `frontend/`, `backend/`, `agent/` are separate projects communicating only over REST (frontend→backend, backend→agent). No layer reaches into another's internals. | ✅ PASS |
| II. Agent Responsibility Boundary | Agent does ONLY note analysis, quiz generation, and short-answer semantic grading (via ASI:One). Backend orchestrates, persists, verifies auth, and deterministically scores MCQs. No AI logic outside the agent; no business logic inside it. | ✅ PASS |
| III. Managed Platform for Auth & Data | Firebase Authentication for identity (backend verifies ID tokens on every request); Firestore is the only datastore. No parallel auth or DB. | ✅ PASS |
| IV. Simplicity, Modularity & Testability | Minimal dependencies, no queues/extra DBs. Firestore and the agent are reached behind client seams so backend business logic is unit-testable without live services. | ✅ PASS |
| V. MVP-First Delivery | Plan sequences the P1 slice (paste notes → generate → take → score) as the first shippable end-to-end path; upload (P2) and history (P3) build on it. | ✅ PASS |

**Result**: No violations. No entries required in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-quiz-generator/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── backend-api.md    # Frontend ↔ Backend REST contract
│   └── agent-api.md      # Backend ↔ Agent REST contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
frontend/                     # React web app (Firebase Auth client)
├── src/
│   ├── components/           # Quiz taking, results, upload, history UI
│   ├── pages/                # Login, Create Quiz, Take Quiz, History
│   ├── services/             # apiClient (fetch + ID token), authService
│   └── App.jsx
└── tests/

backend/                      # Node.js/Express REST API (owns Firestore)
├── src/
│   ├── routes/               # quizzes, attempts route handlers
│   ├── services/             # quizService, attemptService, gradingService
│   ├── clients/              # firestoreClient, agentClient (seams)
│   ├── middleware/           # verifyFirebaseToken, error handling, upload
│   ├── lib/                  # pdf/text extraction, MCQ scoring
│   └── app.js / server.js
└── tests/
    ├── integration/          # route-level tests (agent + Firestore mocked)
    └── unit/                 # MCQ scoring, extraction, request validation

agent/                        # Python uAgents process (all AI logic)
├── agent.py                  # uAgent + on_rest_post endpoints
├── asi_client.py             # ASI:One (OpenAI-compatible) wrapper
├── prompts.py                # generation + grading prompts & JSON schemas
├── models.py                 # uAgents Model request/response types
├── requirements.txt
└── tests/                    # pytest (ASI:One mocked)
```

**Structure Decision**: Web-application layout with three independent projects at
the repository root (`frontend/`, `backend/`, `agent/`), directly mirroring the
constitution's three layers (Principle I). The backend is the only layer with
Firestore credentials; the agent is the only layer with ASI:One credentials. The
frontend never talks to the agent or Firestore data directly (it uses Firebase
Auth solely to obtain an ID token it sends to the backend).

## Complexity Tracking

> No Constitution Check violations. No entries required.
