"""Tests for the /generate-quiz handler logic (ASI:One MOCKED).

The ASI:One boundary (`asi_client.generate_quiz`) is monkeypatched so no network
call or real API key is needed. Feature 002 makes each quiz a SINGLE type; this
file covers the default (mcq) path and error cases. Per-type coverage lives in
test_generate_types.py.
"""

import pytest

import agent
from models import GenerateQuizRequest


def _fake_mcq_payload():
    return {
        "title": "Photosynthesis Basics",
        "questions": [
            {
                "type": "mcq",
                "prompt": "Where does the light reaction occur?",
                "options": ["Thylakoid membrane", "Stroma", "Cytosol", "Nucleus"],
                "correct_option_index": 0,
            },
        ],
    }


def test_generate_quiz_defaults_to_mcq(monkeypatch):
    captured = {}

    def fake_generate_quiz(text, question_type="mcq", n=5, client=None):
        captured["args"] = (text, question_type, n)
        return _fake_mcq_payload()

    monkeypatch.setattr(agent.asi_client, "generate_quiz", fake_generate_quiz)

    # No question_type => defaults to mcq.
    req = GenerateQuizRequest(text="Photosynthesis converts light energy...", num_questions=1)
    resp = agent.generate_quiz_logic(req)

    assert captured["args"] == ("Photosynthesis converts light energy...", "mcq", 1)
    assert resp.title == "Photosynthesis Basics"
    assert resp.question_type == "mcq"
    assert len(resp.questions) == 1

    mcq = resp.questions[0]
    assert mcq.type == "mcq"
    assert 2 <= len(mcq.options) <= 5
    assert 0 <= mcq.correct_option_index < len(mcq.options)


def test_generate_quiz_empty_text_handled():
    """Empty/blank text is rejected before any ASI:One call (contract 422)."""
    with pytest.raises(ValueError):
        agent.generate_quiz_logic(GenerateQuizRequest(text="   "))


def test_generate_quiz_no_questions_rejected(monkeypatch):
    """An empty questions array => insufficient material error."""

    def fake_generate_quiz(text, question_type="mcq", n=5, client=None):
        return {"title": "Empty", "questions": []}

    monkeypatch.setattr(agent.asi_client, "generate_quiz", fake_generate_quiz)
    with pytest.raises(ValueError):
        agent.generate_quiz_logic(GenerateQuizRequest(text="some material"))
