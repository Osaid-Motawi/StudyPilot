# Feature Specification: AI Study Companion (Four-Part Expansion)

**Feature Branch**: `002-ai-study-companion`

**Created**: 2026-07-24

**Status**: Draft

**Input**: User description: "Expand this product into a broader AI study companion with four distinct parts, accessible from separate pages: Part 1 - Quiz Generator (extended with question-type selection: multiple-choice, fill-in-the-blank, essay/free-response, matching); Part 2 - General AI Chat; Part 3 - File/Image Analysis (chat about content OR generate a quiz from it); Part 4 - Profile Page (performance overview, history, read-only review). All four parts require sign-in and share the same account, history, and design system."

## Clarifications

### Session 2026-07-24

- Q: How are the new question types scored, given the Profile requires a "score
  achieved" for every quiz? → A: Every quiz type produces a numeric score.
  Multiple-choice and matching are graded deterministically; fill-in-the-blank and
  essay/free-response are graded by AI semantic evaluation, with essays receiving a
  numeric score plus written feedback. (Informed default — forced by the Profile's
  requirement that every past quiz shows a score.)
- Q: Which image/file formats does the File/Image Analysis page accept? → A: Images
  (PNG, JPG/JPEG, WebP) plus documents (PDF, .txt). Other formats (e.g., .docx,
  .pptx, .heic, audio, video) are rejected.
- Q: Are general AI Chat conversations persisted or ephemeral? → A: Persisted per
  user — chats are saved to the user's account and reappear on return. They remain
  separate from the Profile, which lists quizzes only.
- Q: What size limit applies to matching-type quizzes? → A: Between 3 and 10 pairs
  per matching quiz (minimum 3, maximum 10).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate a quiz of a chosen question type (Priority: P1)

A signed-in user goes to the Quiz Generator page, provides study material (typed
notes or an uploaded document), and selects which question type they want:
multiple-choice, fill-in-the-blank, essay/free-response, or matching. The system
generates a quiz of that type, the user takes it, submits, and receives an overall
score with per-question feedback.

**Why this priority**: This extends the product's existing core capability and is
the most direct increment of value. It is independently shippable on top of what
already exists and underpins the data shown in the Profile page.

**Independent Test**: Sign in, open the Quiz Generator, paste notes, pick each
question type in turn, generate, take, and submit — verify a quiz of the selected
type is produced, scored, and shows per-question feedback.

**Acceptance Scenarios**:

1. **Given** a signed-in user with study material entered, **When** they select
   "multiple-choice" and generate, **Then** a multiple-choice quiz is produced,
   takeable, and scored deterministically.
2. **Given** study material, **When** the user selects "fill-in-the-blank" and
   generates, **Then** a fill-in-the-blank quiz is produced and graded tolerantly
   (semantically), not by exact string match.
3. **Given** study material, **When** the user selects "essay/free-response" and
   generates, **Then** an open-response quiz is produced and each answer receives a
   numeric score plus written feedback.
4. **Given** study material, **When** the user selects "matching" and generates,
   **Then** a matching quiz (two sets of items to pair) is produced and scored by
   correct pairings.
5. **Given** a generated quiz of any type, **When** the user submits, **Then** an
   overall score and per-question feedback (correct/incorrect or score + comment)
   are shown immediately.
6. **Given** material too short or empty, **When** the user generates, **Then** the
   system asks for more material rather than producing an unusable quiz.

---

### User Story 2 - View performance overview and review past quizzes (Priority: P2)

A signed-in user opens their Profile page and sees a performance overview: summary
statistics (overall average score, total number of quizzes taken) and a detailed
list of every quiz they have taken. Each entry shows the quiz title, question type,
score achieved, and date taken. The user can select any entry to reopen and review
it in full — the questions, their submitted answers, and the correct answers — as
read-only historical data.

**Why this priority**: Progress visibility drives engagement and depends on quiz
data from Part 1 existing. It is the highest-value increment after the core quiz
capability and reuses the same account/history.

**Independent Test**: After taking at least two quizzes of different types, open
the Profile page and verify the summary stats, the per-quiz list (title, type,
score, date), and that selecting an entry reopens a read-only full review.

**Acceptance Scenarios**:

1. **Given** a user who has taken quizzes, **When** they open the Profile page,
   **Then** they see their overall average score and total number of quizzes taken.
2. **Given** the Profile page, **When** it loads, **Then** every quiz the user has
   taken is listed with its title, question type, score achieved, and date taken.
3. **Given** the quiz list, **When** the user selects an entry, **Then** the full
   quiz reopens showing the questions, the user's submitted answers, and the
   correct answers.
4. **Given** a reopened past quiz, **When** the user views it, **Then** it is
   read-only — nothing about the historical attempt can be edited.
5. **Given** a user who has taken no quizzes yet, **When** they open the Profile
   page, **Then** they see an empty-state overview (zero quizzes, no average) rather
   than an error.

---

### User Story 3 - Ask anything in a general AI chat (Priority: P3)

A signed-in user opens the AI Chat page and asks any question in a free-form
conversational chat, receiving an AI-generated answer. The chat is independent of
any quiz or study material and supports a back-and-forth conversation.

**Why this priority**: A standalone, high-utility capability that does not depend
on quizzes. Valuable but secondary to the graded study loop.

**Independent Test**: Sign in, open the AI Chat page, ask a question, and verify a
relevant AI answer appears; ask a follow-up and verify the conversation continues
in context.

**Acceptance Scenarios**:

1. **Given** a signed-in user on the AI Chat page, **When** they send a question,
   **Then** an AI-generated answer is displayed in the conversation.
2. **Given** an ongoing chat, **When** the user sends a follow-up message, **Then**
   the assistant responds taking the earlier messages into account.
3. **Given** the chat, **When** the AI service fails or times out, **Then** the user
   sees a clear error and can resend without losing their typed message.

---

### User Story 4 - Analyze an uploaded image or file (Priority: P4)

A signed-in user opens the File/Image Analysis page, uploads an image or file, and
chooses one of two modes: (a) chat conversationally about the uploaded content,
asking follow-up questions about it, or (b) generate a quiz/exam directly from the
uploaded content's material.

**Why this priority**: The most complex part — it combines upload handling with
both the chat and quiz-generation capabilities — so it is best built last, reusing
the pieces delivered by the earlier stories.

**Independent Test**: Sign in, open the File/Image Analysis page, upload a supported
image or file, choose "chat" and ask a question about it (verify a content-aware
answer), then choose "generate quiz" and verify a quiz is produced from the
content.

**Acceptance Scenarios**:

1. **Given** a signed-in user on the analysis page, **When** they upload a supported
   image or file and choose "chat", **Then** they can ask questions about the
   content and receive content-aware answers, including follow-ups.
2. **Given** an uploaded file/image, **When** the user chooses "generate quiz",
   **Then** a quiz/exam is generated from the content and can be taken and scored
   like any other quiz (and appears in their Profile history).
3. **Given** an unsupported or unreadable upload, **When** the user submits it,
   **Then** the system rejects it with a clear message and does not attempt
   analysis.
4. **Given** the analysis service fails, **When** the user retries, **Then** they
   can retry without re-uploading from scratch where possible.

---

### Edge Cases

- **Insufficient material**: Notes/upload too short to produce a meaningful quiz →
  the system asks for more content.
- **Unsupported/unreadable upload**: A file or image the system cannot read →
  rejected with a clear, format-specific message.
- **AI failure/timeout**: Generation, grading, chat, or analysis fails → a
  retryable error is shown; the user's input (notes, message, or uploaded content)
  is preserved for retry where possible.
- **Partial quiz submission**: Unanswered questions of any type are scored as
  incorrect / zero and clearly indicated.
- **Essay/fill-in grading consistency**: Free-text answers close in meaning are
  graded consistently by the AI evaluation, with explainable feedback.
- **Mixed-type averaging**: The Profile's overall average combines scores across
  different question types on a common percentage basis.
- **Unauthenticated access**: A signed-out user attempting to reach any of the four
  pages is directed to sign in first.
- **Cross-user isolation**: A user never sees another user's quizzes, attempts,
  chats, or uploaded content.
- **Navigation**: A user can move between the four pages at any time without losing
  in-progress work on the page they leave, or is warned before losing it.

## Requirements *(mandatory)*

### Functional Requirements

**Cross-cutting (all four parts)**

- **FR-001**: The product MUST present four distinct, separately navigable pages —
  Quiz Generator, AI Chat, File/Image Analysis, and Profile — reachable from a
  shared navigation.
- **FR-002**: All four pages MUST require the user to be signed in; unauthenticated
  users MUST be directed to sign in.
- **FR-003**: All four parts MUST operate on the same user account and shared
  history, and MUST prevent any user from accessing another user's data.
- **FR-004**: All four parts MUST share a single, consistent visual design system.

**Part 1 — Quiz Generator (extended)**

- **FR-005**: Users MUST be able to provide study material by typing/pasting text
  or uploading a document.
- **FR-006**: Users MUST be able to select the question type to generate: one of
  multiple-choice, fill-in-the-blank, essay/free-response, or matching.
- **FR-007**: The system MUST generate a quiz composed of the user's selected
  question type from the provided material.
- **FR-008**: The system MUST let the user take the generated quiz in the app and
  submit their answers.
- **FR-009**: On submission, the system MUST compute and display an overall score
  and per-question feedback.
- **FR-010**: Multiple-choice questions MUST be scored deterministically against a
  designated correct option.
- **FR-011**: Matching questions MUST be scored deterministically by the number of
  correct pairings. A matching quiz MUST contain between 3 and 10 pairs (inclusive).
- **FR-012**: Fill-in-the-blank answers MUST be graded by tolerant (semantic)
  evaluation rather than exact string match.
- **FR-013**: Essay/free-response answers MUST receive a numeric score plus written
  feedback via AI evaluation.
- **FR-014**: The system MUST validate that provided material is sufficient and
  inform the user when it is not.
- **FR-015**: The system MUST inform the user when quiz generation fails and allow
  retry without re-entering the material.

**Part 2 — Profile**

- **FR-016**: The Profile page MUST display the signed-in user's overall average
  score and total number of quizzes taken.
- **FR-017**: The Profile page MUST list every quiz the user has taken, each entry
  showing title, question type, score achieved, and date taken.
- **FR-018**: Users MUST be able to select any past quiz entry to reopen it and
  review the questions, their submitted answers, and the correct answers in full.
- **FR-019**: Reopened past quizzes MUST be read-only; historical attempts MUST NOT
  be editable.
- **FR-020**: The Profile page MUST show a sensible empty state when the user has
  taken no quizzes.

**Part 3 — General AI Chat**

- **FR-021**: The AI Chat page MUST let users send free-form questions and receive
  AI-generated answers, independent of any quiz or study material.
- **FR-022**: The chat MUST support multi-turn conversation, where the assistant
  responds with awareness of earlier messages in the conversation.
- **FR-023**: The system MUST show a clear, retryable error when a chat response
  fails, preserving the user's typed message.
- **FR-023a**: The system MUST persist each user's general chat conversations to
  their account so that prior conversations are available when they return. Chat
  conversations MUST remain private to the user and MUST NOT appear in the Profile's
  quiz list (the Profile lists quizzes only).

**Part 4 — File/Image Analysis**

- **FR-024**: Users MUST be able to upload an image or a file for analysis.
  Accepted formats MUST be images (PNG, JPG/JPEG, WebP) and documents (PDF, .txt).
- **FR-025**: Users MUST be able to choose one of two modes for an upload: (a) chat
  conversationally about the content with follow-up questions, or (b) generate a
  quiz/exam from the content.
- **FR-026**: In chat mode, the system MUST answer questions about the uploaded
  content, including follow-ups that build on earlier turns.
- **FR-027**: In quiz mode, the system MUST generate a quiz/exam from the uploaded
  content that can be taken, scored, and reviewed like any other quiz — and that
  appears in the user's Profile history.
- **FR-028**: The system MUST reject unsupported (outside PNG/JPG/JPEG/WebP/PDF/.txt)
  or unreadable uploads with a clear message and not attempt analysis.

### Key Entities *(include if feature involves data)*

- **User**: An authenticated person. Owns all quizzes, attempts, chats, and
  uploaded-content sessions. Basis for the Profile overview.
- **Study Material**: Source content for quiz generation — typed text, an uploaded
  document, or an uploaded image/file (Part 4).
- **Quiz**: A generated set of questions of a single selected type. Has a title,
  question type, creation date, and belongs to one user.
- **Question**: An item within a quiz. Has a type (multiple-choice,
  fill-in-the-blank, essay/free-response, matching), a prompt, the data needed to
  present it (options, blanks, or item sets), and the reference answer(s) used for
  grading.
- **Quiz Attempt**: A record of a user taking a quiz — submitted answers, overall
  score, per-question feedback, and date taken. Read-only once submitted. Source of
  the Profile's list and statistics.
- **Chat Conversation**: An ordered exchange of user and assistant messages,
  persisted per user and retrievable on return. May be a general chat (Part 3) or
  bound to an uploaded item (Part 4 chat mode). Separate from the Profile's quiz
  list.
- **Uploaded Item (Analysis)**: An image or file a user uploads for analysis, and
  the mode chosen (chat or quiz), associated with that user.
- **Profile Overview**: A derived view over the user's attempts — average score and
  total quizzes taken — not separately stored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can generate a quiz of any of the four question types from
  typical study material in under 60 seconds.
- **SC-002**: For every quiz type, at least 90% of generation requests with adequate
  material produce a usable, takeable quiz of the selected type.
- **SC-003**: After submitting a quiz of any type, the user sees an overall score
  and per-question feedback within 10 seconds.
- **SC-004**: The Profile page shows an accurate average and count, and 100% of the
  user's taken quizzes appear in the list, retrievable in a later session; none are
  visible to other users.
- **SC-005**: A user receives a relevant answer to a general chat question within 10
  seconds and can continue the conversation with context retained.
- **SC-006**: For an uploaded image/file, the user can either get a content-aware
  chat answer or generate a quiz from it, with a clear rejection for unsupported
  uploads.
- **SC-007**: At least 85% of first-time users can locate and use all four pages
  (generate a quiz, chat, analyze an upload, view their profile) without external
  help.
- **SC-008**: A user can locate and reopen any specific past quiz from their Profile
  in under 30 seconds.

## Assumptions

- **Builds on the existing product**: This expands the current StudyPilot (existing
  quiz generation, accounts, and history) rather than replacing it; the existing
  multiple-choice and short-answer behavior is subsumed by the extended
  question-type selection.
- **Question type per quiz**: Each generated quiz consists of a single chosen
  question type (the user picks one type per generation), rather than a mix.
- **Essay scoring**: Essays are scored numerically (e.g., a 0–100 scale) with
  written feedback, so they contribute to the Profile average like other types.
- **Averaging basis**: The Profile's overall average is computed on a common
  percentage basis across all quiz types.
- **Chat scope**: General chat (Part 3) and analysis chat (Part 4) are
  conversational and are not part of the graded quiz history shown in the Profile;
  the Profile lists quizzes only. General chats are persisted per user and available
  on return (per Clarifications).
- **Supported uploads**: The File/Image Analysis page accepts images (PNG,
  JPG/JPEG, WebP) and documents (PDF, .txt); other formats are rejected.
  Handwritten/scanned OCR quality is best-effort and not guaranteed.
- **Single-user, private data**: All content is private to the individual user;
  there is no sharing or collaboration in this version.
- **Web application, English content**: Delivered as a web app; study material and
  generated content are assumed to be in English for this version.
- **Managed identity and storage**: User identity and data persistence continue to
  use the project's existing managed authentication and data store.
- **AI-owned intelligence**: All AI work — analysis, generation, grading, chat, and
  image/file understanding — is provided by the autonomous agent layer, consistent
  with the project constitution; other components treat the agent's output as data.
