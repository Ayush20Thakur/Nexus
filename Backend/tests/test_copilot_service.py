from __future__ import annotations

from app.services.copilot_service import classify_copilot_intent


def test_copilot_classifies_short_greeting() -> None:
    assert classify_copilot_intent("hi") == "greeting"
    assert classify_copilot_intent("hello nexus") == "greeting"


def test_copilot_classifies_operational_intents() -> None:
    assert classify_copilot_intent("show low stock skus") == "inventory"
    assert classify_copilot_intent("what approvals are pending?") == "approval"
    assert classify_copilot_intent("explain REQ-2094-A") == "request_detail"
    assert classify_copilot_intent("create an executive risk brief with next actions") == "summary"
