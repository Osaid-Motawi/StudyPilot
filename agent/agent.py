"""StudyPilot Fetch AI agent.

A uAgents process exposing REST endpoints that the backend calls:
  * POST /generate-quiz       -> single-type quiz from study text
  * POST /grade-short-answer  -> semantic correct/incorrect (also fill_blank)
  * POST /grade-essay         -> numeric score (0-100) + written feedback
  * POST /chat                -> conversational reply (general or grounded)

All AI logic lives here (Constitution Principle II). The agent NEVER persists
data, never touches Firestore, never authenticates, and never scores
multiple-choice or matching questions (those are deterministic in the backend).
It is a pure function of its input to structured JSON.

The request->response work is implemented as plain functions
(`generate_quiz_logic`, `grade_short_answer_logic`, `grade_essay_logic`,
`chat_logic`) so it is unit-testable without binding the agent to a port or
hitting ASI:One; the `on_rest_post` handlers are thin async wrappers over them.
The `asi_client` module is the mockable seam.
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from uagents import Agent, Context

import asi_client
from models import (
    ChatRequest,
    ChatResponse,
    GenerateQuizRequest,
    GenerateQuizResponse,
    GradeEssayRequest,
    GradeEssayResponse,
    GradeRequest,
    GradeResponse,
    Question,
)

# Load agent/.env (ASI_ONE_API_KEY, ASI_ONE_BASE_URL, ASI_ONE_MODEL, AGENT_PORT).
load_dotenv(Path(__file__).parent / ".env")

# Render assigns the listen port dynamically via PORT; AGENT_PORT is the
# local-dev override, and 8001 is the default when neither is set.
AGENT_PORT = int(os.environ.get("PORT", os.environ.get("AGENT_PORT", "8001")))

VALID_QUESTION_TYPES = {"mcq", "fill_blank", "essay", "matching"}
MATCHING_MIN_PAIRS = 3
MATCHING_MAX_PAIRS = 10

agent = Agent(
    name="studypilot-agent",
    seed=os.environ.get("AGENT_SEED", "studypilot-agent-seed-phrase"),
    port=AGENT_PORT,
    endpoint=[f"http://localhost:{AGENT_PORT}/submit"],
)


# --- Pure handler logic (testable; ASI:One + OCR mocked at their seams) ------


def generate_quiz_logic(req: GenerateQuizRequest) -> GenerateQuizResponse:
    """Generate a single-type quiz (mcq / fill_blank / essay / matching)."""
    question_type = req.question_type if req.question_type in VALID_QUESTION_TYPES else "mcq"

    text = (req.text or "").strip()
    if not text:
        raise ValueError("No study material text available; cannot generate a quiz.")

    n = req.num_questions
    if question_type == "matching":
        n = max(MATCHING_MIN_PAIRS, min(MATCHING_MAX_PAIRS, n))

    data = asi_client.generate_quiz(text, question_type, n)

    raw_questions = data.get("questions", [])
    if not raw_questions:
        raise ValueError("Generated quiz contains no questions.")

    questions = [Question(**q) for q in raw_questions]

    # Defensive clamp: a matching question must carry 3-10 correct pairs.
    if question_type == "matching":
        for q in questions:
            if q.correct_pairs and len(q.correct_pairs) > MATCHING_MAX_PAIRS:
                q.correct_pairs = q.correct_pairs[:MATCHING_MAX_PAIRS]
            if not q.correct_pairs or len(q.correct_pairs) < MATCHING_MIN_PAIRS:
                raise ValueError("Matching question must have at least 3 pairs.")

    return GenerateQuizResponse(
        title=data.get("title", ""),
        question_type=question_type,
        questions=questions,
    )


def grade_short_answer_logic(req: GradeRequest) -> GradeResponse:
    """Semantically grade one short-answer / fill_blank (FR-017).

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


def grade_essay_logic(req: GradeEssayRequest) -> GradeEssayResponse:
    """Grade one essay/free-response answer -> {score 0-100, feedback}.

    An empty/blank answer deterministically scores 0 and never spends an
    ASI:One call; otherwise the score + feedback come from the model.
    """
    if not (req.user_answer or "").strip():
        return GradeEssayResponse(score=0, feedback="No answer was provided.")

    data = asi_client.grade_essay(
        req.question, req.reference_answer, req.user_answer
    )
    score = int(data["score"])
    score = max(0, min(100, score))  # clamp defensively into 0-100
    return GradeEssayResponse(score=score, feedback=data.get("feedback", ""))


def chat_logic(req: ChatRequest) -> ChatResponse:
    """Produce the assistant's next reply for a (stateless) conversation (US3).

    The backend supplies the full ordered history + new user message; the agent
    holds no session state. When `context_text` is present the reply is grounded
    in that supplied study material (analysis chats) via the prompt helper inside
    `asi_client.chat`. Reasoning happens entirely at the ASI:One seam.
    """
    messages = [{"role": m.role, "content": m.content} for m in req.messages]
    reply = asi_client.chat(messages, context_text=req.context_text)
    return ChatResponse(reply=reply)


# --- REST endpoints ---------------------------------------------------------


@agent.on_rest_post("/generate-quiz", GenerateQuizRequest, GenerateQuizResponse)
async def handle_generate_quiz(
    ctx: Context, req: GenerateQuizRequest
) -> GenerateQuizResponse:
    ctx.logger.info(
        f"generate-quiz: type={req.question_type}, n={req.num_questions}, "
        f"text={len(req.text or '')} chars"
    )
    return generate_quiz_logic(req)


@agent.on_rest_post("/grade-short-answer", GradeRequest, GradeResponse)
async def handle_grade_short_answer(
    ctx: Context, req: GradeRequest
) -> GradeResponse:
    ctx.logger.info("grade-short-answer request received")
    return grade_short_answer_logic(req)


@agent.on_rest_post("/grade-essay", GradeEssayRequest, GradeEssayResponse)
async def handle_grade_essay(
    ctx: Context, req: GradeEssayRequest
) -> GradeEssayResponse:
    ctx.logger.info("grade-essay request received")
    return grade_essay_logic(req)


@agent.on_rest_post("/chat", ChatRequest, ChatResponse)
async def handle_chat(ctx: Context, req: ChatRequest) -> ChatResponse:
    ctx.logger.info(
        f"chat: {len(req.messages)} message(s), "
        f"context={'yes' if req.context_text else 'no'}"
    )
    return chat_logic(req)


if __name__ == "__main__":
    agent.run()
