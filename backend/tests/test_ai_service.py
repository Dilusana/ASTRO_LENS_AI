"""
Unit tests for Astro AI Chat Service and Guardrails.
Tests fallback reasoning, astronomy knowledge grounding, planet X guardrail, and API schemas.
Run with: python -m pytest tests/test_ai_service.py -v
"""
import sys, os, asyncio
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from app.ai_service import (
    ChatRequest,
    ChatResponse,
    generate_fallback_response,
    generate_ai_chat_response,
    _match_target,
)


def test_chat_request_validation():
    req = ChatRequest(message="Why is Betelgeuse bright in infrared?", target_id="betelgeuse")
    assert req.message == "Why is Betelgeuse bright in infrared?"
    assert req.target_id == "betelgeuse"

    with pytest.raises(Exception):
        ChatRequest(message="")


def test_target_matching():
    match = _match_target("tell me about Alpha Orionis", None)
    assert match is not None
    assert match["name"] == "Betelgeuse"

    match_barnard = _match_target("what is the proper motion of barnard's star?", None)
    assert match_barnard is not None
    assert match_barnard["name"] == "Barnard's Star"

    match_wise = _match_target("coldest brown dwarf clouds", "wise-0855")
    assert match_wise is not None
    assert match_wise["name"] == "WISE 0855"


def test_educational_fallback_for_betelgeuse():
    resp = generate_fallback_response(
        message="Why does Betelgeuse look so bright in infrared?",
        target_id="betelgeuse",
        context=None,
    )
    assert isinstance(resp, ChatResponse)
    assert "Betelgeuse" in resp.text
    assert "red supergiant" in resp.text.lower()
    assert resp.target_card is not None
    assert resp.target_card.title == "Alpha Orionis"
    assert "3,600 K" in resp.target_card.metric_value
    assert len(resp.suggestions) > 0
    assert len(resp.follow_up_questions) > 0


def test_great_dimming_explanation():
    resp = generate_fallback_response(
        message="Explain the 2019 Great Dimming of Betelgeuse.",
        target_id="betelgeuse",
        context=None,
    )
    assert "Great Dimming" in resp.text
    assert "dust" in resp.text.lower()
    assert "supernova" in resp.text.lower()


def test_planet_x_guardrail():
    """Verify that Astro AI does NOT fabricate a discovered Planet Nine/X."""
    resp = generate_fallback_response(
        message="Did NASA discover Planet X or Planet Nine with SPHEREx?",
        target_id=None,
        context=None,
    )
    assert "NOT been discovered or confirmed yet" in resp.text or "not been discovered" in resp.text.lower()
    assert resp.target_card.title == "Hypothetical Planet Nine"
    assert "Unconfirmed Hypothesis" in resp.target_card.subtitle


def test_proper_motion_explanation():
    resp = generate_fallback_response(
        message="Why does space change over time and what is proper motion?",
        target_id=None,
        context=None,
    )
    assert "proper motion" in resp.text.lower()
    assert "Barnard's Star" in resp.text or "blinking" in resp.text.lower()
    assert resp.target_card is not None


def test_infrared_light_explanation():
    resp = generate_fallback_response(
        message="Explain infrared light in simple words like I am 12 years old!",
        target_id=None,
        context=None,
    )
    assert "heat" in resp.text.lower()
    assert "dust" in resp.text.lower()
    assert "SPHEREx" in resp.text


def test_pixel_resolution_explanation():
    resp = generate_fallback_response(
        message="Why is the SPHEREx image pixelated at 6.155 arcsec?",
        target_id=None,
        context=None,
    )
    assert "6.155" in resp.text or "pixel scale" in resp.text.lower()
    assert "calibrated" in resp.text.lower()


def test_async_generate_ai_chat_response(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    req = ChatRequest(message="How far away is Barnard's Star?", target_id="barnards-star")
    resp = asyncio.run(generate_ai_chat_response(req))
    assert isinstance(resp, ChatResponse)
    assert "Barnard" in resp.text
    assert "5.96 Light-Years" in resp.target_card.subtitle


if __name__ == "__main__":
    class MockMonkeyPatch:
        def delenv(self, key, raising=False):
            os.environ.pop(key, None)

    mp = MockMonkeyPatch()
    test_chat_request_validation()
    test_target_matching()
    test_educational_fallback_for_betelgeuse()
    test_great_dimming_explanation()
    test_planet_x_guardrail()
    test_proper_motion_explanation()
    test_infrared_light_explanation()
    test_pixel_resolution_explanation()
    test_async_generate_ai_chat_response(mp)
    print("All 9 test_ai_service assertions PASSED!")


