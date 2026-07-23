"""Tests for the /grade-short-answer handler logic (ASI:One MOCKED).

The ASI:One boundary (`asi_client.grade_short_answer`) is monkeypatched so no
network call or real API key is needed.
"""

import agent
from models import GradeRequest


def test_semantic_match_is_correct(monkeypatch):
    captured = {}

    def fake_grade(question, expected, user, client=None):
        captured["args"] = (question, expected, user)
        return {"is_correct": True, "rationale": "O2 is oxygen; matches expected."}

    monkeypatch.setattr(agent.asi_client, "grade_short_answer", fake_grade)

    req = GradeRequest(
        question="What gas is released during photosynthesis?",
        expected_answer="Oxygen",
        user_answer="it gives off O2",
    )
    resp = agent.grade_short_answer_logic(req)

    assert captured["args"] == (
        "What gas is released during photosynthesis?",
        "Oxygen",
        "it gives off O2",
    )
    assert resp.is_correct is True
    assert resp.rationale


def test_contradicting_answer_is_incorrect(monkeypatch):
    def fake_grade(question, expected, user, client=None):
        return {"is_correct": False, "rationale": "Carbon dioxide is not oxygen."}

    monkeypatch.setattr(agent.asi_client, "grade_short_answer", fake_grade)

    resp = agent.grade_short_answer_logic(
        GradeRequest(
            question="What gas is released during photosynthesis?",
            expected_answer="Oxygen",
            user_answer="Carbon dioxide",
        )
    )
    assert resp.is_correct is False
    assert resp.rationale


def test_empty_answer_is_incorrect(monkeypatch):
    """A blank answer is incorrect and must not spend an ASI:One call (FR-017)."""

    def fail_if_called(*args, **kwargs):
        raise AssertionError("ASI:One must not be called for an empty answer")

    monkeypatch.setattr(agent.asi_client, "grade_short_answer", fail_if_called)

    resp = agent.grade_short_answer_logic(
        GradeRequest(
            question="What gas is released during photosynthesis?",
            expected_answer="Oxygen",
            user_answer="   ",
        )
    )
    assert resp.is_correct is False
    assert resp.rationale
