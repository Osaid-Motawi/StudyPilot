"""T011: per-type quiz generation (ASI:One MOCKED).

Each `question_type` yields a valid typed quiz; matching pairs clamp to 3-10.
The ASI:One boundary is monkeypatched, so no network/key is needed.
"""

import pytest

import agent
from models import GenerateQuizRequest

MATERIAL = "The water cycle: evaporation, condensation, precipitation, collection."


def _capture_and_return(payload, store):
    def fake_generate_quiz(text, question_type="mcq", n=5, client=None):
        store["type"] = question_type
        store["n"] = n
        return payload

    return fake_generate_quiz


def test_mcq_type(monkeypatch):
    store = {}
    payload = {
        "title": "Water Cycle",
        "questions": [
            {
                "type": "mcq",
                "prompt": "Which step forms clouds?",
                "options": ["Evaporation", "Condensation", "Collection"],
                "correct_option_index": 1,
            }
        ],
    }
    monkeypatch.setattr(agent.asi_client, "generate_quiz", _capture_and_return(payload, store))

    resp = agent.generate_quiz_logic(
        GenerateQuizRequest(text=MATERIAL, question_type="mcq", num_questions=1)
    )
    assert resp.question_type == "mcq"
    assert store["type"] == "mcq"
    q = resp.questions[0]
    assert q.type == "mcq"
    assert 2 <= len(q.options) <= 5
    assert 0 <= q.correct_option_index < len(q.options)


def test_fill_blank_type(monkeypatch):
    store = {}
    payload = {
        "title": "Water Cycle",
        "questions": [
            {
                "type": "fill_blank",
                "prompt": "Water turning to vapor is called ____.",
                "expected_answer": "evaporation",
            }
        ],
    }
    monkeypatch.setattr(agent.asi_client, "generate_quiz", _capture_and_return(payload, store))

    resp = agent.generate_quiz_logic(
        GenerateQuizRequest(text=MATERIAL, question_type="fill_blank", num_questions=1)
    )
    assert resp.question_type == "fill_blank"
    assert store["type"] == "fill_blank"
    q = resp.questions[0]
    assert q.type == "fill_blank"
    assert q.expected_answer == "evaporation"


def test_essay_type(monkeypatch):
    store = {}
    payload = {
        "title": "Water Cycle",
        "questions": [
            {
                "type": "essay",
                "prompt": "Explain the water cycle.",
                "reference_answer": "Evaporation, condensation, precipitation, collection.",
                "guidance": "Reward all four stages.",
            }
        ],
    }
    monkeypatch.setattr(agent.asi_client, "generate_quiz", _capture_and_return(payload, store))

    resp = agent.generate_quiz_logic(
        GenerateQuizRequest(text=MATERIAL, question_type="essay", num_questions=1)
    )
    assert resp.question_type == "essay"
    assert store["type"] == "essay"
    q = resp.questions[0]
    assert q.type == "essay"
    assert q.reference_answer
    assert q.guidance == "Reward all four stages."


def _matching_payload(num_pairs):
    left = [f"L{i}" for i in range(num_pairs)]
    right = [f"R{i}" for i in range(num_pairs)]
    pairs = [{"left": i, "right": i} for i in range(num_pairs)]
    return {
        "title": "Water Cycle",
        "questions": [
            {
                "type": "matching",
                "prompt": "Match the terms.",
                "left_items": left,
                "right_items": right,
                "correct_pairs": pairs,
            }
        ],
    }


def test_matching_type_valid(monkeypatch):
    store = {}
    monkeypatch.setattr(
        agent.asi_client, "generate_quiz", _capture_and_return(_matching_payload(5), store)
    )
    resp = agent.generate_quiz_logic(
        GenerateQuizRequest(text=MATERIAL, question_type="matching", num_questions=5)
    )
    assert resp.question_type == "matching"
    q = resp.questions[0]
    assert q.type == "matching"
    assert len(q.left_items) == 5
    assert len(q.right_items) == 5
    assert 3 <= len(q.correct_pairs) <= 10


def test_matching_clamps_num_questions_low(monkeypatch):
    """num_questions below 3 is clamped up to 3 before generation."""
    store = {}
    monkeypatch.setattr(
        agent.asi_client, "generate_quiz", _capture_and_return(_matching_payload(3), store)
    )
    agent.generate_quiz_logic(
        GenerateQuizRequest(text=MATERIAL, question_type="matching", num_questions=1)
    )
    assert store["n"] == 3


def test_matching_clamps_num_questions_high(monkeypatch):
    """num_questions above 10 is clamped down to 10 before generation."""
    store = {}
    monkeypatch.setattr(
        agent.asi_client, "generate_quiz", _capture_and_return(_matching_payload(10), store)
    )
    agent.generate_quiz_logic(
        GenerateQuizRequest(text=MATERIAL, question_type="matching", num_questions=25)
    )
    assert store["n"] == 10


def test_matching_response_pairs_clamped(monkeypatch):
    """A model returning >10 pairs is defensively clamped to 10."""
    store = {}
    monkeypatch.setattr(
        agent.asi_client, "generate_quiz", _capture_and_return(_matching_payload(12), store)
    )
    resp = agent.generate_quiz_logic(
        GenerateQuizRequest(text=MATERIAL, question_type="matching", num_questions=10)
    )
    assert len(resp.questions[0].correct_pairs) == 10


def test_matching_too_few_pairs_rejected(monkeypatch):
    """A matching question with <3 pairs is rejected (insufficient)."""
    store = {}
    monkeypatch.setattr(
        agent.asi_client, "generate_quiz", _capture_and_return(_matching_payload(2), store)
    )
    with pytest.raises(ValueError):
        agent.generate_quiz_logic(
            GenerateQuizRequest(text=MATERIAL, question_type="matching", num_questions=5)
        )
