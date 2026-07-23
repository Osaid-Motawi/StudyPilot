"""System/user prompts and strict JSON schemas for ASI:One structured output.

Two capabilities:
  1. Quiz generation  -> QUIZ_GENERATION_SCHEMA (>=1 mcq AND >=1 short_answer)
  2. Short-answer grading -> GRADING_SCHEMA ({is_correct, rationale})

The schemas are passed verbatim to ASI:One as
`response_format={"type": "json_schema", "json_schema": {..., "strict": True}}`
so the model can only return schema-valid JSON. `strict` mode requires every
property to be listed in `required` and `additionalProperties: false`, so the
per-type optional fields (options / correct_option_index / expected_answer)
are all declared and nullable — the agent/backend interpret them per `type`.
"""

# --- Quiz generation -------------------------------------------------------

QUIZ_GENERATION_SYSTEM = (
    "You are StudyPilot's quiz-writing assistant. Given plain-text study "
    "material, you produce a mixed quiz that faithfully tests the material. "
    "You write clear, unambiguous questions grounded ONLY in the supplied "
    "text. You never invent facts that are not supported by the material. "
    "Every quiz MUST contain at least one multiple-choice question and at "
    "least one short-answer question. For multiple-choice questions provide "
    "between 2 and 5 distinct plausible options and set correct_option_index "
    "to the 0-based index of the single correct option. For short-answer "
    "questions provide a concise reference answer in expected_answer. Also "
    "suggest a short, descriptive quiz title derived from the material."
)


def build_quiz_generation_user_prompt(text: str, num_mcq: int, num_short: int) -> str:
    return (
        f"Create a quiz from the study material below.\n\n"
        f"Target counts (best effort, but ALWAYS at least 1 of each type): "
        f"{num_mcq} multiple-choice question(s) and {num_short} short-answer "
        f"question(s).\n\n"
        f"For each multiple-choice question set type=\"mcq\", fill options and "
        f"correct_option_index, and leave expected_answer as null.\n"
        f"For each short-answer question set type=\"short_answer\", fill "
        f"expected_answer, and leave options and correct_option_index as null.\n\n"
        f"STUDY MATERIAL:\n\"\"\"\n{text}\n\"\"\""
    )


QUIZ_GENERATION_SCHEMA = {
    "name": "quiz",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "title": {"type": "string"},
            "questions": {
                "type": "array",
                "minItems": 2,
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "type": {
                            "type": "string",
                            "enum": ["mcq", "short_answer"],
                        },
                        "prompt": {"type": "string"},
                        "options": {
                            "type": ["array", "null"],
                            "items": {"type": "string"},
                        },
                        "correct_option_index": {"type": ["integer", "null"]},
                        "expected_answer": {"type": ["string", "null"]},
                    },
                    "required": [
                        "type",
                        "prompt",
                        "options",
                        "correct_option_index",
                        "expected_answer",
                    ],
                },
            },
        },
        "required": ["title", "questions"],
    },
}


# --- Short-answer grading --------------------------------------------------

GRADING_SYSTEM = (
    "You are StudyPilot's short-answer grader. You compare a student's answer "
    "to a reference (expected) answer for a given question and decide whether "
    "the student's answer is SEMANTICALLY EQUIVALENT to the expected answer. "
    "Mark is_correct=true when the student's answer conveys the same key idea "
    "as the expected answer, allowing synonyms, paraphrasing, and differences "
    "in wording or detail. Mark is_correct=false when the answer omits or "
    "contradicts the key idea, is off-topic, or is empty/blank. Judge meaning, "
    "not exact wording. Provide a brief (one sentence) rationale for the "
    "verdict. Be consistent and deterministic."
)


def build_grading_user_prompt(question: str, expected: str, user: str) -> str:
    shown_user = user if user.strip() else "(no answer provided)"
    return (
        f"Question: {question}\n"
        f"Expected answer: {expected}\n"
        f"Student's answer: {shown_user}\n\n"
        f"Decide if the student's answer is semantically equivalent to the "
        f"expected answer, then return the verdict."
    )


GRADING_SCHEMA = {
    "name": "grade",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "is_correct": {"type": "boolean"},
            "rationale": {"type": "string"},
        },
        "required": ["is_correct", "rationale"],
    },
}
