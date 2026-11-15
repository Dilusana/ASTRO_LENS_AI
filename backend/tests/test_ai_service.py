"""
Unit tests for Astro AI Chat Service, Claude AI integration, and Guardrails.
Tests Anthropic SDK calling, system prompt construction, context injection,
conversation history, fallback reasoning, astronomy knowledge grounding,
planet X guardrail, and API schemas.
Run with: python -m pytest tests/test_ai_service.py -v
"""
import sys, os, asyncio
from unittest.mock import AsyncMock, MagicMock, patch
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from app.ai_service import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    generate_fallback_response,
    generate_ai_chat_response,
    _match_target,
    _build_claude_system_prompt,
    _parse_follow_ups,
)


@pytest.fixture
def anyio_backend():
    return "asyncio"


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


def test_parse_follow_ups():
    raw_text = (
        "Betelgeuse is a red supergiant.\n"
        "FOLLOW_UP: Why did it dim in 2019?\n"
        "FOLLOW_UP: When will it go supernova?"
    )
    clean_text, follow_ups = _parse_follow_ups(raw_text)
    assert clean_text == "Betelgeuse is a red supergiant."
    assert len(follow_ups) == 2
    assert "Why did it dim in 2019?" in follow_ups[0]
    assert "When will it go supernova?" in follow_ups[1]


def test_build_claude_system_prompt_with_context():
    target = {
        "name": "Betelgeuse",
        "title": "Alpha Orionis",
        "type": "Red Supergiant",
        "distance": "642.5 light-years",
        "metric_label": "TEMPERATURE",
        "metric_value": "3,600 K",
        "band": "SPHEREx Band 3.5 µm",
    }
    context = {
        "observation_count": 80,
        "bands": "SPHEREx-D1 to D6",
        "earliest_date": "2026-09-12 15:41 UTC",
        "latest_date": "2026-09-15 03:59 UTC",
        "repeat_coverage_found": True,
        "span_days": 2.51,
    }
    prompt = _build_claude_system_prompt(target, context)
    assert "Betelgeuse" in prompt
    assert "642.5 light-years" in prompt
    assert "2026-09-12 15:41 UTC" in prompt
    assert "NEVER invent" in prompt
    assert "Planet Nine" in prompt


@pytest.mark.anyio
async def test_claude_api_mock_integration(monkeypatch):
    """Test full integration with Claude AI via Anthropic Python SDK mock."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test-key-12345")
    monkeypatch.setenv("CLAUDE_MODEL", "claude-3-5-sonnet-latest")

    mock_result = {
        "success": True,
        "text": "Betelgeuse is an enormous red supergiant star in Orion.",
        "model": "claude-3-5-sonnet-latest",
        "follow_ups": [
            "How big is Betelgeuse compared to the Sun?",
            "When will it explode?",
        ],
    }

    import app.ai_service
    monkeypatch.setattr(app.ai_service, "_call_claude_api", AsyncMock(return_value=mock_result))

    req = ChatRequest(
        message="Tell me about Betelgeuse",
        target_id="betelgeuse",
        context={"observation_count": 80},
        history=[
            ChatMessage(role="user", content="Hello Astro!"),
            ChatMessage(role="assistant", content="Hello! What would you like to explore?"),
        ],
    )
    resp = await app.ai_service.generate_ai_chat_response(req)

    assert isinstance(resp, ChatResponse)
    assert "enormous red supergiant" in resp.text
    assert "claude-3-5-sonnet-latest" in resp.source
    assert resp.target_card is not None
    assert resp.target_card.title == "Alpha Orionis"
    assert len(resp.follow_up_questions) == 2
    assert "How big is Betelgeuse" in resp.follow_up_questions[0]


@pytest.mark.anyio
async def test_claude_fallback_on_api_error(monkeypatch):
    """Verify that if Anthropic API throws an exception, it seamlessly falls back to local reasoning."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test-key-invalid")

    import app.ai_service
    timeout_result = {"error_type": "timeout", "error_message": "Anthropic API request timed out (15s limit)."}
    monkeypatch.setattr(app.ai_service, "_call_claude_api", AsyncMock(return_value=timeout_result))

    req = ChatRequest(message="Why is Betelgeuse bright in infrared?", target_id="betelgeuse")
    resp = await app.ai_service.generate_ai_chat_response(req)
    assert isinstance(resp, ChatResponse)
    assert "Betelgeuse" in resp.text
    assert resp.target_card is not None


@pytest.mark.anyio
async def test_async_generate_ai_chat_response_fallback(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    req = ChatRequest(message="How far away is Barnard's Star?", target_id="barnards-star")
    resp = await generate_ai_chat_response(req)
    assert isinstance(resp, ChatResponse)
    assert "Barnard" in resp.text
    assert "5.96 Light-Years" in resp.target_card.subtitle


def test_greeting_intent_does_not_dump_selected_star():
    """Verify that saying 'hiiii' or 'hello' returns a warm short greeting and NEVER dumps Betelgeuse facts."""
    resp = generate_fallback_response("hiiii", "betelgeuse", None)
    assert isinstance(resp, ChatResponse)
    assert "Heyyy" in resp.text or "Astro" in resp.text
    assert "Betelgeuse is a massive red supergiant" not in resp.text
    assert resp.target_card is None


def test_casual_conversation_intent():
    """Verify casual chit-chat returns friendly assistant responses without star dumping."""
    resp_how = generate_fallback_response("how are you", "betelgeuse", None)
    assert "stellar" in resp_how.text.lower() or "astro" in resp_how.text.lower()
    assert "Betelgeuse is a massive red supergiant" not in resp_how.text

    resp_who = generate_fallback_response("who are you", "betelgeuse", None)
    assert "Astro" in resp_who.text
    assert resp_who.target_card is None


def test_tamil_response_intent():
    """Verify requests in Tamil or asking for Tamil return authentic Tamil text."""
    resp_tamil = generate_fallback_response("explain it in Tamil", "betelgeuse", None)
    assert "வணக்கம்" in resp_tamil.text or "அகச்சிவப்பு" in resp_tamil.text


def test_observation_comparison_guardrails():
    """Verify that observation comparison does not fabricate motion for stationary stars."""
    resp = generate_fallback_response(
        message="what changed between these observations?",
        target_id="betelgeuse",
        context={"bands": "3.5 µm", "repeat_coverage_found": True, "span_days": 180.0},
    )
    assert "no confirmed physical displacement" in resp.text.lower() or "no physical displacement" in resp.text.lower()

    # But Barnard's Star reports real verified proper motion
    resp_barnard = generate_fallback_response(
        message="what changed between these observations?",
        target_id="barnards-star",
        context={"bands": "1.6 µm", "repeat_coverage_found": True, "span_days": 1200.0},
    )
    assert "proper motion" in resp_barnard.text.lower()
    assert "Barnard's Star" in resp_barnard.text


def test_user_required_six_queries():
    """
    Test the 6 user-specified evaluation queries:
    1. 'Hi, how are you?' -> natural friendly casual reply, not Betelgeuse facts
    2. 'What is Betelgeuse?' -> accurate Betelgeuse facts + TargetCard
    3. 'Explain black holes in simple words.' -> beginner-friendly black hole explanation (no cookie distraction)
    4. 'Which stars has NASA SPHEREx recently observed?' -> lists Betelgeuse, Barnard's Star, WISE 0855, Sirius, Vega
    5. 'Explain the Andromeda Galaxy in Tamil.' -> fluent Tamil explanation of Andromeda / Messier 31
    6. 'What was my previous question?' -> recalls last user question from history
    """
    # 1. Hi, how are you?
    resp1 = generate_fallback_response("Hi, how are you?", target_id="betelgeuse")
    assert "stellar" in resp1.text.lower() or "astro" in resp1.text.lower()
    assert "massive red supergiant" not in resp1.text.lower()

    # 2. What is Betelgeuse?
    resp2 = generate_fallback_response("What is Betelgeuse?", target_id="betelgeuse")
    assert "betelgeuse" in resp2.text.lower()
    assert "red supergiant" in resp2.text.lower()
    assert resp2.target_card is not None
    assert resp2.target_card.title == "Alpha Orionis"

    # 3. Explain black holes in simple words.
    resp3 = generate_fallback_response("Explain black holes in simple words.", target_id="betelgeuse")
    assert "black hole" in resp3.text.lower()
    assert "gravity" in resp3.text.lower()
    assert "event horizon" in resp3.text.lower()
    assert "cookies" not in resp3.text.lower()  # ensured no warm cookies diversion

    # 4. Which stars has NASA SPHEREx recently observed?
    resp4 = generate_fallback_response("Which stars has NASA SPHEREx recently observed?", target_id=None)
    assert "betelgeuse" in resp4.text.lower()
    assert "barnard" in resp4.text.lower()
    assert "wise 0855" in resp4.text.lower()
    assert resp4.target_card is not None

    # 5. Explain the Andromeda Galaxy in Tamil.
    resp5 = generate_fallback_response("Explain the Andromeda Galaxy in Tamil.", target_id=None)
    assert "வணக்கம்" in resp5.text
    assert "ஆண்ட்ரோமிடா" in resp5.text or "விண்மீன்" in resp5.text
    assert "2.5" in resp5.text  # distance 2.5 million light years

    # 6. What was my previous question?
    hist = [
        ChatMessage(role="user", content="Explain black holes in simple words."),
        ChatMessage(role="assistant", content="A black hole is like a cosmic trapdoor..."),
    ]
    resp6 = generate_fallback_response("What was my previous question?", target_id=None, history=hist)
    assert "Explain black holes in simple words." in resp6.text


def test_spherex_rag_retrieval():
    """Verify official NASA/IPAC RAG citations for SPHEREx spectroscopy questions."""
    from app.spherex_rag import search_spherex_rag
    results = search_spherex_rag("what is SPHEREx 102 spectral bands and spectrophotometry")
    assert len(results) > 0
    assert "https://irsa.ipac.caltech.edu" in results[0]["source_url"]


if __name__ == "__main__":
    class MockMonkeyPatch:
        def __init__(self):
            self.env = {}
        def setenv(self, key, value):
            os.environ[key] = value
        def delenv(self, key, raising=False):
            os.environ.pop(key, None)
        def setattr(self, target, name, value):
            setattr(target, name, value)

    mp = MockMonkeyPatch()
    test_chat_request_validation()
    test_target_matching()
    test_educational_fallback_for_betelgeuse()
    test_great_dimming_explanation()
    test_planet_x_guardrail()
    test_proper_motion_explanation()
    test_infrared_light_explanation()
    test_pixel_resolution_explanation()
    test_parse_follow_ups()
    test_build_claude_system_prompt_with_context()
    test_greeting_intent_does_not_dump_selected_star()
    test_casual_conversation_intent()
    test_tamil_response_intent()
    test_observation_comparison_guardrails()
    test_spherex_rag_retrieval()
    asyncio.run(test_claude_api_mock_integration(mp))
    asyncio.run(test_claude_fallback_on_api_error(mp))
    asyncio.run(test_async_generate_ai_chat_response_fallback(mp))
    print("All 18 test_ai_service assertions PASSED!")
