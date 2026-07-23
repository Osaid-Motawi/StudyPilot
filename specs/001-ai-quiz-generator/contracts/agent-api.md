# Contract: Backend ↔ Agent REST API

**Feature**: 001-ai-quiz-generator | **Date**: 2026-07-23

The agent is a Python uAgents process exposing REST endpoints via
`@agent.on_rest_post(...)` with typed `uagents.Model` request/response bodies.
Only the **backend** calls these endpoints (never the frontend). The agent holds
the ASI:One credentials and performs all AI logic; it does not read/write
Firestore and does not score multiple-choice questions.

**Base URL**: `http://<agent-host>:<AGENT_PORT>` (e.g., `http://localhost:8001`)
**Content-Type**: `application/json`

---

## POST /generate-quiz

Analyze study material and generate a mixed quiz.

### Request (Model: `GenerateQuizRequest`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `text` | string | yes | Plain-text study material. |
| `num_mcq` | integer | no | Desired MCQ count. Default 5. |
| `num_short` | integer | no | Desired short-answer count. Default 3. |

```json
{ "text": "Photosynthesis converts light energy...", "num_mcq": 5, "num_short": 3 }
```

### Response (Model: `GenerateQuizResponse`)

| Field | Type | Notes |
|-------|------|-------|
| `title` | string | Suggested quiz title derived from the material. |
| `questions` | array<Question> | Contains both `mcq` and `short_answer` items (≥1 each). |

Question object:

| Field | Type | Present for | Notes |
|-------|------|-------------|-------|
| `type` | string | all | `"mcq"` \| `"short_answer"`. |
| `prompt` | string | all | Question text. |
| `options` | array<string> | mcq | 2–5 options. |
| `correct_option_index` | integer | mcq | 0-based index into `options`. |
| `expected_answer` | string | short_answer | Reference answer for later grading. |

```json
{
  "title": "Photosynthesis Basics",
  "questions": [
    { "type": "mcq", "prompt": "Where does the light reaction occur?",
      "options": ["Thylakoid membrane", "Stroma", "Cytosol", "Nucleus"],
      "correct_option_index": 0 },
    { "type": "short_answer", "prompt": "What gas is released during photosynthesis?",
      "expected_answer": "Oxygen" }
  ]
}
```

Enforced with ASI:One **strict JSON-schema** structured output so the shape is
guaranteed. Backend assigns stable `Question.id`s and maps snake_case →
camelCase before persisting (see data-model.md).

### Errors

- `400` — empty/insufficient `text` (agent could not produce a usable quiz).
- `502/504` — upstream ASI:One failure/timeout. Backend surfaces a retryable error
  to the user (FR-012).

---

## POST /grade-short-answer

Semantically grade one short-answer response.

### Request (Model: `GradeRequest`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `question` | string | yes | The question prompt. |
| `expected_answer` | string | yes | Reference answer. |
| `user_answer` | string | yes | The user's submitted text (may be empty). |

```json
{ "question": "What gas is released during photosynthesis?",
  "expected_answer": "Oxygen", "user_answer": "it gives off O2" }
```

### Response (Model: `GradeResponse`)

| Field | Type | Notes |
|-------|------|-------|
| `is_correct` | boolean | `true` when semantically equivalent to the expected answer (FR-017). |
| `rationale` | string | Brief justification (≤ 1 sentence). |

```json
{ "is_correct": true, "rationale": "O2 is oxygen; matches the expected answer." }
```

### Grading rules

- Correct when the answer conveys the same key idea (synonyms/paraphrase allowed).
- Incorrect when it omits or contradicts the key idea, or is empty.
- Deterministic prompt + low temperature for consistency across attempts.

### Errors

- `502/504` — ASI:One failure/timeout. Backend must not silently drop the attempt;
  it surfaces an error and allows resubmission for scoring (spec Edge Cases).

---

## Notes on scope (Constitution Principle II)

- The agent exposes ONLY these two AI capabilities. It never receives files (only
  extracted text), never persists data, and is never asked to score MCQs.
- Both endpoints are pure functions of their input → structured JSON output,
  making them straightforward to test with the ASI:One client mocked.
