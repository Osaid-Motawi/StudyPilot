"""T031: /chat handler logic (ASI:One MOCKED).

Stateless multi-turn chat: the backend supplies the full ordered history and
the agent reasons over it. When `context_text` is present the reply is grounded
in that study material. The ASI:One boundary (`asi_client.chat`) is
monkeypatched so no network call or real API key is needed.
"""

import agent
from models import ChatMessage, ChatRequest


def test_chat_uses_supplied_history(monkeypatch):
    """The full ordered conversation is forwarded to the ASI:One seam."""
    captured = {}

    def fake_chat(messages, context_text=None, client=None):
        captured["messages"] = messages
        captured["context_text"] = context_text
        return "Sure - a mnemonic for the planets is 'My Very Educated Mother'..."

    monkeypatch.setattr(agent.asi_client, "chat", fake_chat)

    req = ChatRequest(
        messages=[
            ChatMessage(role="user", content="Help me memorise the planets."),
            ChatMessage(role="assistant", content="Happy to! What have you tried?"),
            ChatMessage(role="user", content="Give me a mnemonic."),
        ]
    )
    resp = agent.chat_logic(req)

    # History forwarded verbatim, in order, as plain {role, content} dicts.
    assert captured["messages"] == [
        {"role": "user", "content": "Help me memorise the planets."},
        {"role": "assistant", "content": "Happy to! What have you tried?"},
        {"role": "user", "content": "Give me a mnemonic."},
    ]
    assert captured["context_text"] is None
    assert resp.reply.startswith("Sure")


def test_chat_honors_context_text(monkeypatch):
    """A grounded (analysis) chat passes context_text through to the seam."""
    captured = {}

    def fake_chat(messages, context_text=None, client=None):
        captured["context_text"] = context_text
        return "According to the material, mitochondria produce ATP."

    monkeypatch.setattr(agent.asi_client, "chat", fake_chat)

    req = ChatRequest(
        messages=[ChatMessage(role="user", content="What do mitochondria do?")],
        context_text="Mitochondria are the powerhouse of the cell; they make ATP.",
    )
    resp = agent.chat_logic(req)

    assert captured["context_text"] == (
        "Mitochondria are the powerhouse of the cell; they make ATP."
    )
    assert "ATP" in resp.reply
