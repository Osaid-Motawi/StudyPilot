# Contract: Backend ↔ Agent REST API (002 expansion)

**Feature**: 002-ai-study-companion | **Date**: 2026-07-24

Extends the 001 agent contract. The Python uAgents agent exposes typed
`on_rest_post` endpoints; only the backend calls them. The agent holds ASI:One
credentials, now also performs image **OCR** (vision), and holds no business
logic/auth/persistence. All endpoints are pure functions input → structured JSON.

**Base URL**: `http://<agent-host>:<AGENT_PORT>` · **Content-Type**: `application/json`

Images are passed as base64 (`image_base64`); the agent OCRs them to text before
reasoning (ASI:One has no vision input — see research.md).

---

## POST /generate-quiz  (EXTENDED)

Generate a quiz of a chosen type from text or an image.

### Request `GenerateQuizRequest`

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| `text` | string | one of text/image | study text (pasted, or backend-extracted PDF/.txt) |
| `image_base64` | string | one of text/image | image bytes; agent OCRs to text first |
| `question_type` | string | yes | `mcq` \| `fill_blank` \| `essay` \| `matching` |
| `num_questions` | int | no | default 5; for `matching` = number of pairs (clamped 3–10) |

### Response `GenerateQuizResponse`

`{ title: string, question_type: string, questions: Question[] }` where Question
matches the type (snake_case; backend maps to camelCase + assigns ids):

- mcq: `{ type, prompt, options[], correct_option_index }`
- fill_blank: `{ type, prompt, expected_answer }`
- essay: `{ type, prompt, reference_answer, guidance? }`
- matching: `{ type, prompt, left_items[], right_items[], correct_pairs:[{left,right}] }` (3–10)

Enforced via ASI:One strict `json_schema` (one schema per type). Insufficient
material or empty OCR → error signal (backend maps to 422). 

---

## POST /grade-short-answer  (REUSED for fill_blank)

Unchanged from 001. `{ question, expected_answer, user_answer } → { is_correct, rationale }`.

---

## POST /grade-essay  (NEW)

Grade a free-response answer with a numeric score and feedback.

### Request `GradeEssayRequest`

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| `question` | string | yes | the prompt |
| `reference_answer` | string | no | model/reference answer or rubric hint |
| `user_answer` | string | yes | the student's essay (may be empty → score 0) |

### Response `GradeEssayResponse`

`{ score: int (0–100), feedback: string }` — deterministic prompt, low temperature,
strict `json_schema`.

---

## POST /chat  (NEW)

General or content-grounded multi-turn chat. The backend supplies conversation
history; the agent is stateless.

### Request `ChatRequest`

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| `messages` | `{role,content}[]` | yes | prior turns + the new user message, in order |
| `context_text` | string | no | for analysis chats: the OCR/extracted content to ground answers |

### Response `ChatResponse`

`{ reply: string }` — the assistant's next message. Upstream failure → error
(backend maps to 502/504).

---

## POST /analyze-image  (NEW, optional helper)

Convert an uploaded image to text (OCR) so the backend can ground a chat or feed
quiz generation. May be folded into `/generate-quiz` and `/chat` via `image_base64`
instead; exposed separately for the analysis chat-grounding step.

### Request `AnalyzeImageRequest`

`{ image_base64: string }`

### Response `AnalyzeImageResponse`

`{ text: string }` — extracted text (`''` if none; backend treats empty as 422).

---

## Scope notes (Constitution v1.2.0, Principle II)

- The agent performs generation (all four types), fill-in-blank + essay grading,
  chat, and image OCR/analysis. It NEVER scores multiple-choice or matching, never
  persists, and never authenticates.
- All endpoints remain pure and mockable (ASI:One client and OCR behind seams) so
  they are testable without network, API keys, or the Tesseract binary.
