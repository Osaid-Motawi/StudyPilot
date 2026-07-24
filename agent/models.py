"""uAgents request/response Model types for the StudyPilot agent.

These mirror the Backend <-> Agent REST contract (contracts/agent-api.md).
They subclass `uagents.Model` (a pydantic BaseModel) so that the agent's
`on_rest_post` handlers get typed, schema-validated JSON in and out.

Feature 002 makes each quiz a SINGLE selected question type (mcq / fill_blank /
essay / matching) and adds essay grading and chat. Field names stay snake_case;
the backend maps to camelCase and assigns ids.
"""

from typing import List, Optional

from uagents import Model


class Pair(Model):
    """One correct matching pairing: left index -> right index."""

    left: int
    right: int


class Question(Model):
    """A single quiz question. Populated fields depend on `type`:

    * mcq        -> options + correct_option_index
    * fill_blank -> expected_answer (prompt contains the blank)
    * essay      -> reference_answer (+ optional guidance)
    * matching   -> left_items + right_items + correct_pairs (3-10)

    Fields for other types are absent/None.
    """

    type: str  # "mcq" | "fill_blank" | "essay" | "matching"
    prompt: str
    # mcq
    options: Optional[List[str]] = None
    correct_option_index: Optional[int] = None
    # fill_blank
    expected_answer: Optional[str] = None
    # essay
    reference_answer: Optional[str] = None
    guidance: Optional[str] = None
    # matching
    left_items: Optional[List[str]] = None
    right_items: Optional[List[str]] = None
    correct_pairs: Optional[List[Pair]] = None


# --- POST /generate-quiz ---------------------------------------------------


class GenerateQuizRequest(Model):
    """Generate a single-type quiz from study `text`."""

    text: str = ""
    question_type: str = "mcq"  # mcq | fill_blank | essay | matching
    num_questions: int = 5  # for matching = number of pairs (clamped 3-10)


class GenerateQuizResponse(Model):
    title: str
    question_type: str
    questions: List[Question]


# --- POST /grade-short-answer  (reused for fill_blank) --------------------


class GradeRequest(Model):
    question: str
    expected_answer: str
    user_answer: str


class GradeResponse(Model):
    is_correct: bool
    rationale: str


# --- POST /grade-essay -----------------------------------------------------


class GradeEssayRequest(Model):
    question: str
    reference_answer: str = ""
    user_answer: str


class GradeEssayResponse(Model):
    score: int  # 0-100
    feedback: str


# --- POST /chat ------------------------------------------------------------


class ChatMessage(Model):
    role: str  # "user" | "assistant" | "system"
    content: str


class ChatRequest(Model):
    messages: List[ChatMessage]
    context_text: Optional[str] = None  # grounding text for analysis chats


class ChatResponse(Model):
    reply: str
