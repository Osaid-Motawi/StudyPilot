"""Thin wrapper around the OpenAI SDK pointed at ASI:One.

ASI:One is OpenAI-Chat-Completions compatible, so we use the `openai` client
with a swapped `base_url`. Generation and grading use strict JSON-schema
structured output; chat returns free-form text.

Testability (Constitution Principle IV): the OpenAI client is created by a
module-level factory `get_client()` and can be overridden three ways so tests
never touch the network or need a real API key:
  * pass `client=<mock>` directly to a wrapper, or
  * call `set_client(<mock>)` to install a process-wide stub, or
  * monkeypatch `get_client` (or the individual wrapper functions).
"""

import json
import os
from typing import Any, Dict, List, Optional

from openai import OpenAI

import prompts

# Cached client instance (created lazily / injectable for tests).
_client: Optional[Any] = None


def set_client(client: Any) -> None:
    """Install a client instance (used by tests to inject a mock)."""
    global _client
    _client = client


def get_client() -> Any:
    """Return the cached ASI:One client, creating it from env on first use."""
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=os.environ.get("ASI_ONE_API_KEY"),
            base_url=os.environ.get("ASI_ONE_BASE_URL", "https://api.asi1.ai/v1"),
        )
    return _client


def _model() -> str:
    return os.environ.get("ASI_ONE_MODEL", "asi1")


def _parse_json_content(response: Any) -> Dict[str, Any]:
    """Extract and JSON-parse the assistant message from a chat completion."""
    content = response.choices[0].message.content
    return json.loads(content)


def generate_quiz(
    text: str,
    question_type: str = "mcq",
    n: int = 5,
    client: Optional[Any] = None,
) -> Dict[str, Any]:
    """Generate a single-type quiz from study material.

    Returns the parsed dict {"title": str, "questions": [...]} where every
    question is of `question_type`. Enforcement (per-type shape, matching pair
    clamping) is handled by the caller (agent handler) so this stays a thin
    ASI:One boundary.
    """
    client = client or get_client()
    response = client.chat.completions.create(
        model=_model(),
        messages=[
            {"role": "system", "content": prompts.QUIZ_GENERATION_SYSTEM},
            {
                "role": "user",
                "content": prompts.build_quiz_generation_user_prompt(
                    text, question_type, n
                ),
            },
        ],
        response_format={
            "type": "json_schema",
            "json_schema": prompts.quiz_schema_for(question_type),
        },
    )
    return _parse_json_content(response)


def grade_short_answer(
    question: str,
    expected: str,
    user: str,
    client: Optional[Any] = None,
) -> Dict[str, Any]:
    """Semantically grade one short-answer / fill-in-the-blank response.

    Returns the parsed dict {"is_correct": bool, "rationale": str}. Uses a low
    temperature for consistent, deterministic verdicts across attempts.
    """
    client = client or get_client()
    response = client.chat.completions.create(
        model=_model(),
        temperature=0,
        messages=[
            {"role": "system", "content": prompts.GRADING_SYSTEM},
            {
                "role": "user",
                "content": prompts.build_grading_user_prompt(
                    question, expected, user
                ),
            },
        ],
        response_format={
            "type": "json_schema",
            "json_schema": prompts.GRADING_SCHEMA,
        },
    )
    return _parse_json_content(response)


def grade_essay(
    question: str,
    reference: str,
    user: str,
    client: Optional[Any] = None,
) -> Dict[str, Any]:
    """Grade one essay / free-response answer.

    Returns the parsed dict {"score": int (0-100), "feedback": str}. Low
    temperature keeps scores deterministic across attempts.
    """
    client = client or get_client()
    response = client.chat.completions.create(
        model=_model(),
        temperature=0,
        messages=[
            {"role": "system", "content": prompts.ESSAY_GRADING_SYSTEM},
            {
                "role": "user",
                "content": prompts.build_essay_grading_user_prompt(
                    question, reference, user
                ),
            },
        ],
        response_format={
            "type": "json_schema",
            "json_schema": prompts.ESSAY_GRADING_SCHEMA,
        },
    )
    return _parse_json_content(response)


def chat(
    messages: List[Dict[str, str]],
    context_text: Optional[str] = None,
    client: Optional[Any] = None,
) -> str:
    """Produce the assistant's next reply for a (stateless) conversation.

    `messages` is the ordered prior turns + new user message ({role, content}).
    `context_text`, when present, grounds the reply in supplied study material
    (analysis chats). Returns the reply text (free-form, no JSON schema).
    """
    client = client or get_client()
    convo: List[Dict[str, str]] = [
        {"role": "system", "content": prompts.CHAT_SYSTEM}
    ]
    if context_text and context_text.strip():
        convo.append(
            {
                "role": "system",
                "content": prompts.build_chat_context_message(context_text),
            }
        )
    convo.extend(messages)
    response = client.chat.completions.create(model=_model(), messages=convo)
    return response.choices[0].message.content or ""
