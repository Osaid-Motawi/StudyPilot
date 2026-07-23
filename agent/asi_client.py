"""Thin wrapper around the OpenAI SDK pointed at ASI:One.

ASI:One is OpenAI-Chat-Completions compatible, so we use the `openai` client
with a swapped `base_url`. Both capabilities use strict JSON-schema structured
output, so the parsed responses are always schema-valid.

Testability (Constitution Principle IV): the OpenAI client is created by a
module-level factory `get_client()` and can be overridden three ways so tests
never touch the network or need a real API key:
  * pass `client=<mock>` directly to `generate_quiz` / `grade_short_answer`, or
  * call `set_client(<mock>)` to install a process-wide stub, or
  * monkeypatch `get_client`.
"""

import json
import os
from typing import Any, Dict, Optional

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
    num_mcq: int = 5,
    num_short: int = 3,
    client: Optional[Any] = None,
) -> Dict[str, Any]:
    """Generate a mixed quiz from study material.

    Returns the parsed dict {"title": str, "questions": [...]}. Enforcement of
    the >=1-of-each-type rule is handled by the caller (agent handler) so this
    wrapper stays a thin ASI:One boundary.
    """
    client = client or get_client()
    response = client.chat.completions.create(
        model=_model(),
        messages=[
            {"role": "system", "content": prompts.QUIZ_GENERATION_SYSTEM},
            {
                "role": "user",
                "content": prompts.build_quiz_generation_user_prompt(
                    text, num_mcq, num_short
                ),
            },
        ],
        response_format={
            "type": "json_schema",
            "json_schema": prompts.QUIZ_GENERATION_SCHEMA,
        },
    )
    return _parse_json_content(response)


def grade_short_answer(
    question: str,
    expected: str,
    user: str,
    client: Optional[Any] = None,
) -> Dict[str, Any]:
    """Semantically grade one short-answer response.

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
