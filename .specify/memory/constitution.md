<!--
Sync Impact Report
- Version change: 1.0.0 → 1.1.0
- Bump type: MINOR (Principle II scope materially expanded; no removals or
  backward-incompatible redefinitions)
- Modified principles:
  - II. Agent Responsibility Boundary (NON-NEGOTIABLE): expanded the agent's scope
    from "analyzing study notes and generating quiz questions" to also include
    "grading short-answer responses using AI-based semantic evaluation"; clarified
    that the backend still orchestrates, persists, and deterministically scores
    multiple-choice questions.
- Added sections: None
- Removed sections: None
- Templates requiring updates:
  - .specify/templates/plan-template.md ✅ consistent (Constitution Check gate is
    constitution-driven; no hardcoded principles to update)
  - .specify/templates/spec-template.md ✅ consistent (no principle-specific slots)
  - .specify/templates/tasks-template.md ✅ consistent (task categories cover the
    testing / separation discipline)
  - .claude/skills/speckit-*/SKILL.md ✅ consistent (agent-agnostic; hyphen naming)
- Downstream artifacts aligned:
  - specs/001-ai-quiz-generator/spec.md ✅ already consistent (FR-009, FR-017,
    FR-017a and Clarifications match the expanded Principle II)
- Follow-up TODOs: None

Prior report (v1.0.0 initial adoption): all template placeholders resolved; five
core principles, Technology Stack & Constraints, Development Workflow & Quality
Gates, and Governance sections created.
-->

# StudyPilot Constitution

## Core Principles

### I. Layered Separation of Concerns

StudyPilot MUST be structured as three independently reasoned layers: the
**frontend** (user-facing web UI), the **backend** (application/business logic and
API surface), and the **Fetch AI agent** (uAgents + ASI:One). Each layer
communicates with the others only through explicit, documented interfaces
(HTTP/API contracts or agent messages) — never by reaching into another layer's
internals or shared mutable state. A change confined to one layer's
responsibility MUST NOT require edits inside another layer's code.

**Rationale**: Clear boundaries keep the system understandable, let each layer be
developed and tested in isolation, and prevent the AI agent, UI, and business
rules from becoming entangled as the project grows.

### II. Agent Responsibility Boundary (NON-NEGOTIABLE)

The Fetch AI agent (uAgents + ASI:One) is responsible for the project's AI logic,
scoped to exactly three tasks: **analyzing study notes**, **generating quiz
questions (multiple-choice and short-answer)**, and **grading short-answer
responses using AI-based semantic evaluation**. All of this AI logic MUST live in
the agent and MUST NOT be reimplemented elsewhere.

The agent MUST NOT contain application business logic, authentication,
authorization, persistence decisions, or user-workflow orchestration. In
particular, the backend — not the agent — orchestrates requests, stores generated
quizzes and attempt results, and deterministically scores multiple-choice
questions (exact comparison of the selected option to the correct option). The
backend invokes the agent through a defined contract and treats its output as data.

**Rationale**: A single, well-scoped home for AI logic keeps the agent swappable
and testable, and stops AI concerns from leaking into — or being duplicated
across — the rest of the codebase. Short-answer grading requires semantic judgment
of free text, which is inherently an AI task and therefore belongs with the other
AI responsibilities; deterministic multiple-choice scoring is not, so it stays in
the backend.

### III. Managed Platform for Auth & Data

Authentication MUST use **Firebase Authentication**, and persistent application
data MUST be stored in **Firestore**. The project MUST NOT introduce a parallel
custom auth system or an alternate primary datastore without a constitution
amendment. Access to Firestore MUST go through the backend layer (or Firebase
security rules for direct client access that is explicitly reviewed), keeping
data-access rules in one reasoned place.

**Rationale**: Standardizing on Firebase/Firestore removes undifferentiated
infrastructure work, keeps security handled by a vetted platform, and supports
the MVP-first goal by avoiding self-built auth and storage.

### IV. Simplicity, Modularity & Testability

Code MUST favor the simplest design that satisfies the requirement (YAGNI):
no speculative abstraction, no framework or dependency added without a concrete
present need. Each module MUST have a single clear responsibility and a surface
that can be exercised in isolation. Business logic MUST be testable without
requiring a live UI or a running agent — external dependencies (Firestore, the
agent, ASI:One) MUST be reachable behind seams that tests can substitute.

**Rationale**: Simple, modular, testable code is cheaper to change and verify,
which directly protects delivery speed and correctness for a small team.

### V. MVP-First Delivery

A working, end-to-end MVP takes priority over feature completeness. When scope
and time conflict, the team MUST ship the narrowest slice that delivers real user
value end-to-end (note in → quiz out, authenticated and stored) before broadening
features. Enhancements, edge-case coverage, and polish are deferred until the
core path works. Partially built features that break the working path MUST NOT be
merged.

**Rationale**: A running MVP validates the concept and integration points early,
and prevents effort from scattering across unfinished features.

## Technology Stack & Constraints

- **Frontend**: Web application UI; communicates with the backend via defined APIs
  only.
- **Backend**: Owns business logic and API surface; mediates access to Firestore
  and to the Fetch AI agent.
- **AI Agent**: Fetch AI `uAgents` + `ASI:One`, scoped per Principle II.
- **Authentication**: Firebase Authentication (Principle III).
- **Data storage**: Firestore (Principle III).
- Introducing a new external service, datastore, or auth mechanism that overlaps
  the responsibilities above requires an amendment to this constitution.

## Development Workflow & Quality Gates

- **Layer contracts first**: When work crosses layers, the interface (API shape or
  agent message schema) MUST be defined and agreed before implementation.
- **Tests for business logic**: Backend business logic and agent input/output
  handling MUST have automated tests that run without live external services.
- **MVP gate**: A change MUST keep the end-to-end MVP path working; work that
  breaks it is not mergeable until fixed.
- **Boundary review**: Every change MUST be checked against Principles I and II —
  no business logic in the agent, no AI logic outside it, no cross-layer reach-in.
- **Simplicity review**: New dependencies and abstractions MUST be justified by a
  present need; unjustified complexity is rejected or moved to Complexity Tracking
  in the plan.

## Governance

This constitution supersedes other development practices for StudyPilot. When a
practice or proposed change conflicts with a principle here, the constitution
wins unless it is formally amended.

- **Amendments**: Changes to this document MUST be proposed with a rationale,
  reviewed, and, where they affect existing work, accompanied by a migration note.
- **Versioning policy** (semantic versioning):
  - **MAJOR**: Backward-incompatible governance or principle removal/redefinition.
  - **MINOR**: A new principle or section, or materially expanded guidance.
  - **PATCH**: Clarifications, wording, and non-semantic refinements.
- **Compliance review**: Plans and pull requests MUST verify compliance with the
  Core Principles (notably the Constitution Check gate in the plan template).
  Justified exceptions MUST be recorded in the plan's Complexity Tracking section.

**Version**: 1.1.0 | **Ratified**: 2026-07-23 | **Last Amended**: 2026-07-23
