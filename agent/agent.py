"""StudyPilot Fetch AI agent.

A uAgents process exposing two REST endpoints that the backend calls:
  * POST /generate-quiz       -> analyze study text, generate a mixed quiz
  * POST /grade-short-answer  -> semantically grade one short-answer response

All AI logic lives here (Constitution Principle II). The agent NEVER persists
data, never touches Firestore, and never scores multiple-choice questions — it
is a pure function of its input to structured JSON.

The request->response work is implemented as plain functions
(`generate_quiz_logic`, `grade_short_answer_logic`) so it is unit-testable
without binding the agent to a port or hitting ASI:One; the `on_rest_post`
handlers are thin async wrappers over them.
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from uagents import Agent, Context

import asi_client
from models import (
    GenerateQuizRequest,
    GenerateQuizResponse,
    GradeRequest,
    GradeResponse,
    Question,
)

# Load agent/.env (ASI_ONE_API_KEY, ASI_ONE_BASE_URL, ASI_ONE_MODEL, AGENT_PORT).
load_dotenv(Path(__file__).parent / ".env")

AGENT_PORT = int(os.environ.get("AGENT_PORT", "8001"))

agent = Agent(
    name="studypilot-agent",
    seed=os.environ.get("AGENT_SEED", "studypilot-agent-seed-phrase"),
    port=AGENT_PORT,
    endpoint=[f"http://localhost:{AGENT_PORT}/submit"],
)


# --- Pure handler logic (testable; ASI:One mocked at the asi_client seam) ---


def generate_quiz_logic(req: GenerateQuizRequest) -> GenerateQuizResponse:
    """Generate a mixed quiz; enforce >=1 MCQ and >=1 short-answer."""
    text = (req.text or "").strip()
    if not text:
        raise ValueError("Study material text is empty; cannot generate a quiz.")

    data = asi_client.generate_quiz(text, req.num_mcq, req.num_short)

    questions = [Question(**q) for q in data.get("questions", [])]
    has_mcq = any(q.type == "mcq" for q in questions)
    has_short = any(q.type == "short_answer" for q in questions)
    if not has_mcq or not has_short:
        raise ValueError(
            "Generated quiz must contain at least one multiple-choice and one "
            "short-answer question."
        )

    return GenerateQuizResponse(title=data.get("title", ""), questions=questions)


def grade_short_answer_logic(req: GradeRequest) -> GradeResponse:
    """Semantically grade one short-answer (FR-017).

    An empty/blank answer is deterministically incorrect and never spends an
    ASI:One call; otherwise the semantic verdict comes from the model.
    """
    if not (req.user_answer or "").strip():
        return GradeResponse(is_correct=False, rationale="No answer was provided.")

    data = asi_client.grade_short_answer(
        req.question, req.expected_answer, req.user_answer
    )
    return GradeResponse(
        is_correct=bool(data["is_correct"]),
        rationale=data.get("rationale", ""),
    )


# --- REST endpoints ---------------------------------------------------------


@agent.on_rest_post("/generate-quiz", GenerateQuizRequest, GenerateQuizResponse)
async def handle_generate_quiz(
    ctx: Context, req: GenerateQuizRequest
) -> GenerateQuizResponse:
    ctx.logger.info(
        f"generate-quiz: {len(req.text or '')} chars, "
        f"num_mcq={req.num_mcq}, num_short={req.num_short}"
    )
    return generate_quiz_logic(req)


@agent.on_rest_post("/grade-short-answer", GradeRequest, GradeResponse)
async def handle_grade_short_answer(
    ctx: Context, req: GradeRequest
) -> GradeResponse:
    ctx.logger.info("grade-short-answer request received")
    return grade_short_answer_logic(req)


if __name__ == "__main__":
    agent.run()
