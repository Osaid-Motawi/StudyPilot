"""System/user prompts and strict JSON schemas for ASI:One structured output.

Capabilities (feature 002):
  1. Quiz generation, ONE type per quiz -> a per-type strict schema
       (mcq / fill_blank / essay / matching)
  2. Short-answer grading (reused for fill_blank) -> GRADING_SCHEMA
  3. Essay grading -> ESSAY_GRADING_SCHEMA ({score 0-100, feedback})
  4. General / content-grounded chat -> CHAT_SYSTEM (free-form text reply)

Schemas are passed verbatim to ASI:One as
`response_format={"type": "json_schema", "json_schema": {..., "strict": True}}`
so the model can only return schema-valid JSON. `strict` mode requires every
property to be listed in `required` and `additionalProperties: false`; because
each quiz is a single type, each type gets its OWN schema with only its fields
(no nullable cross-type fields).
"""

# --- Quiz generation -------------------------------------------------------

QUIZ_GENERATION_SYSTEM = (
    "You are StudyPilot's quiz-writing assistant. Given plain-text study "
    "material and a single requested question type, you produce a quiz whose "
    "questions are ALL of that type and faithfully test the material. You write "
    "clear, unambiguous questions grounded ONLY in the supplied text; you never "
    "invent facts unsupported by the material. Always suggest a short, "
    "descriptive quiz title derived from the material."
)

# Per-type instructions appended to the user prompt.
_TYPE_INSTRUCTIONS = {
    "mcq": (
        'Produce {n} multiple-choice question(s). For each, set type="mcq", '
        "provide between 2 and 5 distinct, plausible options, and set "
        "correct_option_index to the 0-based index of the single correct option."
    ),
    "fill_blank": (
        'Produce {n} fill-in-the-blank question(s). For each, set '
        'type="fill_blank", write a prompt that contains a blank (use "____"), '
        "and put the concise correct answer in expected_answer."
    ),
    "essay": (
        'Produce {n} essay / free-response question(s). For each, set '
        'type="essay", write an open-ended prompt, put a strong model answer in '
        "reference_answer, and put a one-line grading hint in guidance (use an "
        "empty string if none)."
    ),
    "matching": (
        'Produce ONE matching question with {n} pairs. Set type="matching". '
        "left_items and right_items must each have exactly {n} entries. "
        "correct_pairs lists the {n} correct pairings as 0-based "
        "{{left, right}} index objects, one per left item. Shuffle right_items "
        "so the correct order is not trivial."
    ),
}


def build_quiz_generation_user_prompt(text: str, question_type: str, n: int) -> str:
    instruction = _TYPE_INSTRUCTIONS.get(question_type, _TYPE_INSTRUCTIONS["mcq"])
    return (
        f"Create a quiz from the study material below.\n\n"
        f"{instruction.format(n=n)}\n\n"
        f'STUDY MATERIAL:\n"""\n{text}\n"""'
    )


def _quiz_wrapper(item_schema: dict) -> dict:
    """Wrap a per-type question item schema in the {title, questions} envelope."""
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "title": {"type": "string"},
            "questions": {
                "type": "array",
                "minItems": 1,
                "items": item_schema,
            },
        },
        "required": ["title", "questions"],
    }


_MCQ_ITEM = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "type": {"type": "string", "enum": ["mcq"]},
        "prompt": {"type": "string"},
        "options": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 2,
            "maxItems": 5,
        },
        "correct_option_index": {"type": "integer"},
    },
    "required": ["type", "prompt", "options", "correct_option_index"],
}

_FILL_BLANK_ITEM = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "type": {"type": "string", "enum": ["fill_blank"]},
        "prompt": {"type": "string"},
        "expected_answer": {"type": "string"},
    },
    "required": ["type", "prompt", "expected_answer"],
}

_ESSAY_ITEM = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "type": {"type": "string", "enum": ["essay"]},
        "prompt": {"type": "string"},
        "reference_answer": {"type": "string"},
        "guidance": {"type": "string"},
    },
    "required": ["type", "prompt", "reference_answer", "guidance"],
}

_MATCHING_ITEM = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "type": {"type": "string", "enum": ["matching"]},
        "prompt": {"type": "string"},
        "left_items": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 3,
            "maxItems": 10,
        },
        "right_items": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 3,
            "maxItems": 10,
        },
        "correct_pairs": {
            "type": "array",
            "minItems": 3,
            "maxItems": 10,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "left": {"type": "integer"},
                    "right": {"type": "integer"},
                },
                "required": ["left", "right"],
            },
        },
    },
    "required": ["type", "prompt", "left_items", "right_items", "correct_pairs"],
}

_QUIZ_SCHEMAS = {
    "mcq": {"name": "quiz_mcq", "strict": True, "schema": _quiz_wrapper(_MCQ_ITEM)},
    "fill_blank": {
        "name": "quiz_fill_blank",
        "strict": True,
        "schema": _quiz_wrapper(_FILL_BLANK_ITEM),
    },
    "essay": {
        "name": "quiz_essay",
        "strict": True,
        "schema": _quiz_wrapper(_ESSAY_ITEM),
    },
    "matching": {
        "name": "quiz_matching",
        "strict": True,
        "schema": _quiz_wrapper(_MATCHING_ITEM),
    },
}


def quiz_schema_for(question_type: str) -> dict:
    """Return the strict json_schema for a question type (defaults to mcq)."""
    return _QUIZ_SCHEMAS.get(question_type, _QUIZ_SCHEMAS["mcq"])


# --- Short-answer grading (reused for fill_blank) --------------------------

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


# --- Essay grading ---------------------------------------------------------

ESSAY_GRADING_SYSTEM = (
    "You are StudyPilot's essay grader. Given an essay question, an optional "
    "reference answer or rubric hint, and a student's free-response answer, you "
    "assign an integer score from 0 to 100 and write concise, constructive "
    "feedback. Reward answers that are accurate, relevant, and well-reasoned; "
    "penalize factual errors, omissions, and off-topic content. An empty or "
    "blank answer scores 0. Be consistent and deterministic; score on merit, "
    "not length or wording. Feedback is at most a few sentences."
)


def build_essay_grading_user_prompt(question: str, reference: str, user: str) -> str:
    shown_user = user if user.strip() else "(no answer provided)"
    shown_ref = reference.strip() or "(no reference answer provided)"
    return (
        f"Question: {question}\n"
        f"Reference answer / rubric hint: {shown_ref}\n"
        f"Student's answer: {shown_user}\n\n"
        f"Grade the student's answer from 0 to 100 and provide feedback."
    )


ESSAY_GRADING_SCHEMA = {
    "name": "essay_grade",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "score": {"type": "integer", "minimum": 0, "maximum": 100},
            "feedback": {"type": "string"},
        },
        "required": ["score", "feedback"],
    },
}


# --- General / content-grounded chat ---------------------------------------

CHAT_SYSTEM = (
    "You are StudyPilot's study companion: a helpful, accurate, and encouraging "
    "tutor. Answer the student's questions clearly and concisely, explain "
    "reasoning when useful, and stay focused on learning. If study material is "
    "provided as context, ground your answers in it and say when something is "
    "not covered by that material rather than inventing facts."
)


def build_chat_context_message(context_text: str) -> str:
    """System-level grounding message for analysis (content-grounded) chats."""
    return (
        "The student is asking about the following study material. Ground your "
        f'answers in it:\n"""\n{context_text}\n"""'
    )
