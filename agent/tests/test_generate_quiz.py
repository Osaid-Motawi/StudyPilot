"""Tests for the /generate-quiz handler logic (ASI:One MOCKED).

The ASI:One boundary (`asi_client.generate_quiz`) is monkeypatched so no
network call or real API key is needed. We exercise the pure handler logic
(`agent.generate_quiz_logic`) and the schema-shaped response.
"""

import pytest

import agent
from models import GenerateQuizRequest


def _fake_quiz_payload():
    """A schema-valid ASI:One quiz payload with >=1 MCQ and >=1 short-answer."""
    return {
        "title": "Photosynthesis Basics",
        "questions": [
            {
                "type": "mcq",
                "prompt": "Where does the light reaction occur?",
                "options": ["Thylakoid membrane", "Stroma", "Cytosol", "Nucleus"],
                "correct_option_index": 0,
                "expected_answer": None,
            },
            {
                "type": "short_answer",
                "prompt": "What gas is released during photosynthesis?",
                "options": None,
                "correct_option_index": None,
                "expected_answer": "Oxygen",
            },
        ],
    }


def test_generate_quiz_returns_mixed_valid_quiz(monkeypatch):
    captured = {}

    def fake_generate_quiz(text, num_mcq=5, num_short=3, client=None):
        captured["args"] = (text, num_mcq, num_short)
        return _fake_quiz_payload()

    monkeypatch.setattr(agent.asi_client, "generate_quiz", fake_generate_quiz)

    req = GenerateQuizRequest(text="Photosynthesis converts light energy...", num_mcq=2, num_short=1)
    resp = agent.generate_quiz_logic(req)

    # Passed the request options through to the ASI:One boundary.
    assert captured["args"] == ("Photosynthesis converts light energy...", 2, 1)

    assert resp.title == "Photosynthesis Basics"

    mcqs = [q for q in resp.questions if q.type == "mcq"]
    shorts = [q for q in resp.questions if q.type == "short_answer"]

    # >=1 of each type (FR-010).
    assert len(mcqs) >= 1
    assert len(shorts) >= 1

    # MCQ schema: options + valid correct_option_index.
    mcq = mcqs[0]
    assert 2 <= len(mcq.options) <= 5
    assert 0 <= mcq.correct_option_index < len(mcq.options)

    # Short-answer schema: reference answer present.
    assert shorts[0].expected_answer


def test_generate_quiz_rejects_quiz_missing_a_type(monkeypatch):
    """If ASI:One (somehow) returns only MCQs, the handler rejects it."""

    def fake_generate_quiz(text, num_mcq=5, num_short=3, client=None):
        payload = _fake_quiz_payload()
        payload["questions"] = [payload["questions"][0]]  # MCQ only
        return payload

    monkeypatch.setattr(agent.asi_client, "generate_quiz", fake_generate_quiz)

    with pytest.raises(ValueError):
        agent.generate_quiz_logic(GenerateQuizRequest(text="some material"))


def test_generate_quiz_empty_text_handled():
    """Empty/blank text is rejected before any ASI:One call (contract 400)."""
    with pytest.raises(ValueError):
        agent.generate_quiz_logic(GenerateQuizRequest(text="   "))
