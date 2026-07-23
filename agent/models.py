"""uAgents request/response Model types for the StudyPilot agent.

These mirror the Backend <-> Agent REST contract (contracts/agent-api.md).
They subclass `uagents.Model` (a pydantic BaseModel) so that the agent's
`on_rest_post` handlers get typed, schema-validated JSON in and out.
"""

from typing import List, Optional

from uagents import Model


class Question(Model):
    """A single quiz question.

    `mcq` items carry `options` + `correct_option_index`; `short_answer`
    items carry `expected_answer`. The optional fields are absent for the
    other type.
    """

    type: str  # "mcq" | "short_answer"
    prompt: str
    options: Optional[List[str]] = None
    correct_option_index: Optional[int] = None
    expected_answer: Optional[str] = None


# --- POST /generate-quiz ---------------------------------------------------


class GenerateQuizRequest(Model):
    text: str
    num_mcq: int = 5
    num_short: int = 3


class GenerateQuizResponse(Model):
    title: str
    questions: List[Question]


# --- POST /grade-short-answer ---------------------------------------------


class GradeRequest(Model):
    question: str
    expected_answer: str
    user_answer: str


class GradeResponse(Model):
    is_correct: bool
    rationale: str
