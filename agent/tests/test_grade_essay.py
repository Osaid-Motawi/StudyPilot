"""T012: /grade-essay handler logic (ASI:One MOCKED).

Returns {score 0-100, feedback}; an empty answer scores 0 without an ASI:One
call. The ASI:One boundary (`asi_client.grade_essay`) is monkeypatched so no
network call or real API key is needed.
"""

import agent
from models import GradeEssayRequest


def test_essay_scored_with_feedback(monkeypatch):
    captured = {}

    def fake_grade_essay(question, reference, user, client=None):
        captured["args"] = (question, reference, user)
        return {"score": 85, "feedback": "Strong answer; covers all key stages."}

    monkeypatch.setattr(agent.asi_client, "grade_essay", fake_grade_essay)

    req = GradeEssayRequest(
        question="Explain the water cycle.",
        reference_answer="Evaporation, condensation, precipitation, collection.",
        user_answer="Water evaporates, condenses into clouds, then rains and collects.",
    )
    resp = agent.grade_essay_logic(req)

    assert captured["args"] == (
        "Explain the water cycle.",
        "Evaporation, condensation, precipitation, collection.",
        "Water evaporates, condenses into clouds, then rains and collects.",
    )
    assert 0 <= resp.score <= 100
    assert resp.score == 85
    assert resp.feedback


def test_essay_empty_answer_scores_zero(monkeypatch):
    """A blank answer scores 0 and must not spend an ASI:One call."""

    def fail_if_called(*args, **kwargs):
        raise AssertionError("ASI:One must not be called for an empty answer")

    monkeypatch.setattr(agent.asi_client, "grade_essay", fail_if_called)

    resp = agent.grade_essay_logic(
        GradeEssayRequest(
            question="Explain the water cycle.",
            reference_answer="",
            user_answer="   ",
        )
    )
    assert resp.score == 0
    assert resp.feedback


def test_essay_score_clamped_into_range(monkeypatch):
    """An out-of-range model score is clamped into 0-100."""

    def fake_grade_essay(question, reference, user, client=None):
        return {"score": 140, "feedback": "ok"}

    monkeypatch.setattr(agent.asi_client, "grade_essay", fake_grade_essay)

    resp = agent.grade_essay_logic(
        GradeEssayRequest(question="Q", user_answer="a real answer")
    )
    assert resp.score == 100
