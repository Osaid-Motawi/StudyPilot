# Phase 0 Research: AI-Powered Study Quiz Generator

**Feature**: 001-ai-quiz-generator | **Date**: 2026-07-23

This document resolves the technical unknowns behind the plan. Library-specific
details (uAgents REST, ASI:One API) were verified against current documentation.

## 1. Agent REST interface (uAgents)

**Decision**: Expose the agent's capabilities as HTTP endpoints using uAgents'
built-in REST support: `@agent.on_rest_post("/generate-quiz", GenerateRequest,
GenerateResponse)` and `@agent.on_rest_post("/grade-short-answer", GradeRequest,
GradeResponse)`. Request/response bodies are declared as `uagents.Model`
subclasses. The agent runs on a fixed port; the backend calls it over HTTP.

**Rationale**: The backend needs synchronous request/response calls, which map
cleanly to REST. uAgents natively supports custom REST endpoints at the agent
level via `on_rest_get`/`on_rest_post` with typed `Model` request/response, so no
extra web framework is needed inside the agent (honors Principle IV — minimal
stack). Typed models give us structured JSON in and out for free.

**Alternatives considered**:
- *uAgents message protocol (agent-to-agent messaging)*: rejected — the backend is
  a plain HTTP client, not another uAgent; REST is the simpler, synchronous fit.
- *Wrapping the agent in FastAPI/Flask*: rejected — adds a dependency uAgents
  already covers, violating the minimal-stack constraint. Note: REST endpoints are
  only available at the agent level, not on protocols — acceptable here.

## 2. ASI:One integration for generation and grading

**Decision**: The agent calls ASI:One via the OpenAI Python SDK pointed at
`base_url="https://api.asi1.ai/v1"` with the API key as a bearer token, using
model `asi1` (default; `asi1-mini` as a cheaper/faster fallback). Both quiz
generation and short-answer grading use **structured JSON output** via
`response_format = {"type": "json_schema", "json_schema": {..., "strict": True}}`
so the agent always receives schema-valid JSON.

**Rationale**: ASI:One is fully OpenAI-Chat-Completions compatible, so the mature
`openai` client works by only swapping the base URL — minimal new surface area.
Strict JSON-schema output removes brittle free-text parsing and guarantees the
agent returns well-formed structured data to the backend (Principle II: agent
returns data; Principle IV: testable, deterministic contract shape).

**Alternatives considered**:
- *Raw `requests` POST to `/v1/chat/completions`*: viable and dependency-light, but
  the `openai` SDK gives typed calls and easy structured-output handling; either is
  acceptable and both are documented. SDK chosen for ergonomics.
- *Free-text prompting + regex/JSON.parse*: rejected — fragile; strict schema mode
  is available and eliminates a whole class of parsing failures.

**Grading approach**: For each short-answer question the agent is sent
`(question, expected_answer, user_answer)` and returns
`{ "is_correct": bool, "rationale": string }`. The prompt instructs the model to
mark correct when the user's answer is semantically equivalent to the expected
answer (synonyms/paraphrase OK), incorrect when it misses or contradicts the key
idea (FR-017).

## 3. Firebase Authentication verification in the backend

**Decision**: The frontend authenticates with the Firebase JS SDK and sends the
resulting **ID token** as `Authorization: Bearer <token>` on every backend call.
Express middleware verifies the token with the Firebase Admin SDK
(`admin.auth().verifyIdToken`) and attaches `uid` to the request; unauthenticated
requests get `401`.

**Rationale**: Matches Principle III (Firebase Auth) and FR-001/FR-002. Verifying
on every request keeps authorization decisions in the backend (not the agent) and
lets the backend scope all Firestore reads/writes to the authenticated `uid`,
guaranteeing cross-user isolation.

**Alternatives considered**:
- *Firestore security rules with direct client access*: rejected for data access —
  the design routes all data through the backend, so Admin-SDK access plus
  server-side `uid` scoping is the single source of truth. (Rules will still be set
  to deny direct client access as defense-in-depth.)
- *Session cookies*: rejected — ID token bearer headers are the standard,
  stateless fit for a REST API and avoid extra session storage.

## 4. Document upload and text extraction

**Decision**: Accept PDF and plain-text uploads via `multipart/form-data` (handled
by `multer`, in-memory). The backend extracts plain text — a PDF text-extraction
library for PDFs, direct decode for text files — validates that enough text was
extracted, then sends the plain text to the agent. Uploaded bytes are not
persisted.

**Rationale**: Keeps extraction in the backend (Principle I/II — the agent only
ever sees clean text, never files) and avoids introducing blob storage (minimal
stack). In-memory handling suits MVP-scale documents and the stated size bound.

**Alternatives considered**:
- *Sending files to the agent*: rejected — would push non-AI parsing logic into the
  agent, violating Principle II.
- *Cloud Storage for uploads*: rejected — adds infrastructure beyond Firestore with
  no MVP benefit; extracted text is what matters.
- *OCR / scanned PDFs*: out of scope per spec assumptions (text-based material
  only).

## 5. Anti-cheat: withholding answers before submission

**Decision**: `GET` of a quiz for taking returns questions and (for MCQ) options
but omits correct options and short-answer expected answers. Grading happens
server-side on `POST` of an attempt; the response then includes correctness and
correct answers for review.

**Rationale**: Prevents users from reading answers out of network responses before
submitting, preserving the integrity of the score (supports SC-002/SC-003 being
meaningful). Backend-side grading also keeps scoring logic (MCQ) and orchestration
(short-answer via agent) in the backend per Principle II.

**Alternatives considered**:
- *Client-side grading*: rejected — exposes answers and moves scoring logic out of
  the backend.

## 6. Multiple-choice scoring location

**Decision**: The backend scores MCQs deterministically by comparing the submitted
option index/value to the stored correct option. Only short-answer grading calls
the agent.

**Rationale**: Explicit constitutional requirement (Principle II v1.1.0) and
FR-017a. Deterministic scoring is trivially unit-testable without any external
service (Principle IV).

**Alternatives considered**: *Agent scores everything*: rejected — violates the
constitution and needlessly spends AI calls on deterministic comparisons.

## Resolved unknowns

All Technical Context items are resolved; no `NEEDS CLARIFICATION` markers remain.
Model tier (`asi1` vs `asi1-mini`) and exact question counts are configurable
defaults, not blockers.
