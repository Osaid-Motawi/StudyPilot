# Feature Specification: AI-Powered Study Quiz Generator

**Feature Branch**: `001-ai-quiz-generator`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Build StudyPilot, an AI-powered study quiz generator. Users log in via Firebase Authentication. Users provide study material either by typing/pasting notes directly or by uploading a document (PDF or text file). On request, the system uses an autonomous agent to analyze the study material and generate a quiz consisting of a mix of multiple-choice questions and short-answer questions. Users take the generated quiz within the app, submit their answers, and immediately see their score along with which questions they got right or wrong. The system saves each generated quiz and the user's quiz attempt history, so users can review past quizzes and track their progress over time."

## Clarifications

### Session 2026-07-23

- Q: How should the system determine whether a short-answer response is correct
  (exact match, keyword matching, or AI semantic grading)? → A: AI-based semantic
  grading — the answer is judged correct when it is semantically equivalent to the
  expected answer, tolerating synonyms and phrasing differences.
- Q: Does the AI agent grade short-answer responses, or only generate the quiz? →
  A: The agent does both — it generates the quiz AND evaluates short-answer
  responses. All AI logic (analysis, generation, and semantic grading) lives in the
  agent; the backend orchestrates, stores results, and deterministically scores
  multiple-choice questions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate and take a quiz from pasted notes (Priority: P1)

A logged-in user pastes or types their study notes into the app and requests a
quiz. The system analyzes the notes and produces a quiz containing a mix of
multiple-choice and short-answer questions. The user answers the questions,
submits, and immediately sees their score and a per-question breakdown of correct
and incorrect answers.

**Why this priority**: This is the core value proposition of StudyPilot — turning
study material into a self-assessment quiz. It is the smallest slice that delivers
the product's central promise end-to-end and is required before any other story
matters.

**Independent Test**: Log in, paste a block of notes, request a quiz, confirm a
mixed-format quiz is generated, answer all questions, submit, and verify a score
and correct/incorrect breakdown appear. Delivers standalone value even without
upload or history features.

**Acceptance Scenarios**:

1. **Given** a logged-in user with notes pasted into the input, **When** they
   request a quiz, **Then** the system generates a quiz containing both
   multiple-choice and short-answer questions derived from the notes.
2. **Given** a generated quiz, **When** the user answers all questions and
   submits, **Then** the system displays an overall score and marks each question
   as correct or incorrect.
3. **Given** a submitted quiz, **When** the user reviews results, **Then** each
   question shows the user's answer alongside the correct answer.
4. **Given** notes that are too short or empty, **When** the user requests a quiz,
   **Then** the system explains that more material is needed rather than producing
   an unusable quiz.

---

### User Story 2 - Generate a quiz from an uploaded document (Priority: P2)

A logged-in user uploads a study document (PDF or text file) instead of typing
notes. The system extracts the material from the document and generates a quiz
the same way it does for pasted notes.

**Why this priority**: Uploading is a major convenience for users who already have
materials in files, but the product is already viable with pasted notes (Story 1),
so this is the next most valuable increment rather than the first.

**Independent Test**: Log in, upload a supported PDF or text file, request a quiz,
and verify a quiz is generated from the document's content and can be taken and
scored just like a pasted-notes quiz.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they upload a supported PDF or text file
   and request a quiz, **Then** the system generates a quiz from the document's
   content.
2. **Given** an unsupported or corrupted file, **When** the user attempts to
   upload it, **Then** the system rejects it with a clear message and does not
   attempt quiz generation.
3. **Given** a document containing little or no extractable text, **When** the user
   requests a quiz, **Then** the system informs the user that usable material could
   not be extracted.

---

### User Story 3 - Review past quizzes and track progress (Priority: P3)

A returning user opens their history to see previously generated quizzes and their
past attempts, including scores over time, so they can revisit material and see
whether their performance is improving.

**Why this priority**: Persistence and progress tracking increase long-term
engagement and retention, but depend on quizzes and attempts existing first
(Stories 1 and 2), making this the third increment.

**Independent Test**: After completing at least one quiz attempt, open the history
view and verify the past quiz and its attempt (with score and date) are listed and
can be reopened for review.

**Acceptance Scenarios**:

1. **Given** a user who has generated at least one quiz, **When** they open their
   history, **Then** they see a list of their previously generated quizzes.
2. **Given** a user who has completed at least one attempt, **When** they open a
   past quiz, **Then** they can review the questions, their submitted answers, and
   the score for that attempt.
3. **Given** a user with multiple attempts over time, **When** they view their
   history, **Then** they can see their scores across attempts to gauge progress.
4. **Given** a user viewing their history, **When** the same quiz has been
   attempted more than once, **Then** each attempt is listed separately with its
   own score and date.

---

### Edge Cases

- **Empty or trivial input**: Notes or documents with too little content to
  produce a meaningful quiz — the system must decline gracefully and tell the user
  more material is needed.
- **Oversized input**: Material that exceeds the supported size limit — the system
  must inform the user of the limit rather than failing silently.
- **Agent failure or timeout**: The analysis/generation step fails or takes too
  long — the user must see an error and be able to retry without losing their
  input.
- **Partial quiz submission**: The user submits with some questions unanswered —
  unanswered questions must be scored as incorrect and clearly indicated.
- **Short-answer grading ambiguity**: A short-answer response is close but not an
  exact match — the agent's semantic grading must judge it consistently (equivalent
  meaning → correct; missing or contradicting the key idea → incorrect).
- **Grading service failure**: The agent is unavailable or times out while grading
  short answers — the system must not silently drop the attempt; it must surface an
  error and allow the user to resubmit for scoring without re-taking the quiz.
- **Interrupted attempt**: The user navigates away mid-quiz — the system's behavior
  regarding saving or discarding the in-progress attempt must be predictable.
- **Unauthenticated access**: A user who is not logged in attempts to reach quiz
  generation or history — they must be directed to authenticate first.
- **Cross-user isolation**: A user must never see another user's quizzes or
  attempt history.

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & Access**

- **FR-001**: System MUST require users to authenticate before generating,
  taking, or reviewing quizzes.
- **FR-002**: System MUST associate every generated quiz and quiz attempt with the
  user who created it, and MUST prevent any user from accessing another user's
  quizzes or attempts.

**Providing Study Material**

- **FR-003**: Users MUST be able to provide study material by typing or pasting
  text directly into the app.
- **FR-004**: Users MUST be able to provide study material by uploading a PDF or
  plain-text document.
- **FR-005**: System MUST extract the readable text content from an uploaded
  document for use in quiz generation.
- **FR-006**: System MUST reject unsupported file types and clearly communicate
  which formats are accepted.
- **FR-007**: System MUST validate that provided material contains enough content
  to generate a quiz, and MUST inform the user when it does not.

**Quiz Generation**

- **FR-008**: System MUST generate a quiz from the provided study material only
  when the user explicitly requests it.
- **FR-009**: System MUST use an autonomous agent to analyze the study material,
  generate the quiz questions, AND evaluate short-answer responses. Note analysis,
  question generation, and short-answer semantic grading MUST be performed
  exclusively by this agent; no other component may reimplement this AI logic.
- **FR-010**: Generated quizzes MUST contain a mix of multiple-choice questions and
  short-answer questions.
- **FR-011**: Each multiple-choice question MUST include the answer options and a
  designated correct answer; each short-answer question MUST include an expected
  correct answer used for grading.
- **FR-012**: System MUST inform the user when quiz generation fails and allow them
  to retry without re-entering their material.

**Taking & Scoring a Quiz**

- **FR-013**: Users MUST be able to take a generated quiz within the app by
  answering its questions and submitting their responses.
- **FR-014**: System MUST calculate and immediately display an overall score upon
  submission.
- **FR-015**: System MUST show, for each question, whether the user's answer was
  correct or incorrect, along with the correct answer.
- **FR-016**: System MUST score unanswered questions as incorrect and clearly
  indicate them.
- **FR-017**: System MUST grade short-answer questions by AI semantic evaluation
  (performed by the agent), marking a response correct when it is semantically
  equivalent to the expected answer — tolerating synonyms, paraphrasing, and
  formatting/case differences — rather than requiring an exact or keyword match.
- **FR-017a**: System MUST grade multiple-choice questions deterministically in the
  backend by comparing the selected option to the designated correct option, without
  invoking the agent.

**Persistence & History**

- **FR-018**: System MUST save each generated quiz so it can be reviewed later.
- **FR-019**: System MUST save each quiz attempt, including the user's answers, the
  resulting score, and the date/time of the attempt.
- **FR-020**: Users MUST be able to view a list of their previously generated
  quizzes and reopen them for review.
- **FR-021**: Users MUST be able to view their attempt history, including scores
  across attempts, to track progress over time.
- **FR-022**: System MUST record multiple attempts on the same quiz as separate
  entries, each with its own score and timestamp.

### Key Entities *(include if feature involves data)*

- **User**: An authenticated person using StudyPilot. Owns study material inputs,
  generated quizzes, and attempts. Identified by their authentication identity.
- **Study Material**: The source content a quiz is generated from — either pasted
  text or the text extracted from an uploaded document. Associated with the user
  and the resulting quiz.
- **Quiz**: A generated set of questions derived from study material. Belongs to
  one user; contains an ordered collection of questions of mixed types; has a
  creation timestamp.
- **Question**: An individual item within a quiz. Has a type (multiple-choice or
  short-answer), the prompt text, the correct answer, and (for multiple-choice)
  the selectable options.
- **Quiz Attempt**: A record of a user taking a quiz. Belongs to one user and one
  quiz; contains the submitted answers, the computed score, per-question
  correctness, and the attempt timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can go from providing study material to a generated quiz in
  under 60 seconds for typical study-note lengths.
- **SC-002**: At least 90% of quiz generation requests with adequate material
  produce a usable quiz containing both multiple-choice and short-answer questions.
- **SC-003**: Users see their score and per-question correct/incorrect breakdown
  promptly after submitting a quiz — within 10 seconds, accounting for AI semantic
  grading of short-answer responses.
- **SC-004**: 100% of a user's generated quizzes and attempts are retrievable in
  their history in a later session, and none are visible to other users.
- **SC-005**: At least 85% of first-time users can complete the full core flow —
  provide material, generate a quiz, take it, and view results — without external
  help.
- **SC-006**: Users can locate and reopen a specific past quiz from their history
  in under 30 seconds.

## Assumptions

- **Single-user personal use**: Quizzes and history are private to the individual
  user; there is no sharing, collaboration, or multi-role permission model in this
  version.
- **Web application**: The product is delivered as a web app; dedicated native
  mobile apps are out of scope for this version.
- **Supported upload formats**: "Document upload" means PDF and plain-text files;
  other formats (e.g., Word, images, scanned/handwritten pages) are out of scope
  for this version.
- **Text-based material**: Study material is text-based; extracting content from
  images, diagrams, or scanned documents is out of scope.
- **English-language content**: Study material and generated quizzes are assumed to
  be in English for this version.
- **Reasonable input size**: There is an upper bound on accepted material size
  appropriate to typical study notes; extremely large documents may be rejected or
  truncated with user notification.
- **Agent ownership of AI logic**: All AI logic — note analysis, question
  generation, and short-answer semantic grading — is handled by the autonomous
  agent, and the rest of the system treats the agent's output as data. This is
  consistent with the project constitution (Principle II, v1.1.0), which scopes the
  agent to analysis, generation, and short-answer semantic grading while the backend
  orchestrates, persists, and deterministically scores multiple-choice questions.
- **Firebase-backed identity and storage**: User identity is provided by Firebase
  Authentication and quizzes/attempts are persisted in the project's managed data
  store, consistent with the project constitution.
- **Immediate, non-editable results**: Once a quiz is submitted, its score and
  breakdown are fixed for that attempt; the user retakes the quiz to try again
  rather than editing a submitted attempt.
