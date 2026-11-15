"""
AstroLens X - AI Chat Service
Integrates Claude AI (Anthropic Python SDK) with the NASA SPHEREx astronomy platform.
Reads ANTHROPIC_API_KEY and CLAUDE_MODEL from the backend environment / .env,
injecting verified celestial target coordinates, SPHEREx observation dates,
spectral bands, and comparison telemetry into Claude's system prompt.
Features strict scientific guardrails, visual inspection boundaries, quiz assistance,
and a robust local astronomical reasoning engine fallback.
"""
from __future__ import annotations

import os
import re
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

# Load backend/.env if present
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path, override=True)
    else:
        load_dotenv()
except Exception:
    pass

logger = logging.getLogger("astrolens.ai")

try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$", description="Role of the sender")
    content: str = Field(..., min_length=1, description="Message content")


class TargetCard(BaseModel):
    title: str
    subtitle: str
    image_url: Optional[str] = None
    metric_label: Optional[str] = None
    metric_value: Optional[str] = None


class Suggestion(BaseModel):
    label: str
    action: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    target_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    history: Optional[List[ChatMessage]] = None


class ChatResponse(BaseModel):
    text: str
    band: str = "SPHEREx Calibration Level 2"
    source: str = "Astro AI • SPHEREx Synchronized"
    target_card: Optional[TargetCard] = None
    suggestions: List[Suggestion] = []
    follow_up_questions: List[str] = []
    model: Optional[str] = None
    notice: Optional[str] = None


# ── Curated Astronomical Knowledge Base & Verification Reference ─────────────────

TARGET_FACTS: Dict[str, Dict[str, Any]] = {
    "betelgeuse": {
        "title": "Alpha Orionis",
        "name": "Betelgeuse",
        "type": "Red Supergiant Star (M1-M2 Ia-ab)",
        "distance": "~550–642.5 Light-Years",
        "temp_k": "3,600 K",
        "metric_label": "THERMAL HEAT PEAK",
        "metric_value": "3,600 K",
        "band": "SPHEREx Band 3.5 µm",
        "image_url": "https://images-assets.nasa.gov/image/PIA23646/PIA23646~thumb.jpg",
        "core_explanation": (
            "Betelgeuse is a massive red supergiant star in the constellation Orion, nearing the end of its stellar lifecycle. "
            "Because its surface temperature is relatively cool (~3,600 K), its peak thermal energy radiates primarily in the "
            "infrared part of the spectrum. Telescopes like NASA’s SPHEREx penetrate surrounding circumstellar dust envelopes "
            "to observe warm gas and dust shed during violent stellar mass-loss episodes."
        ),
        "dimming_fact": (
            "During the famous 2019–2020 'Great Dimming', Betelgeuse ejected a huge convective bubble of surface gas into space. "
            "As this expelled gas cooled, it condensed into opaque dust grains that temporarily blocked its visible light from Earth. "
            "In infrared, however, that cooling dust continued to glow brightly as thermal radiation!"
        ),
        "quiz_question": (
            "🌟 Astronomy Quiz: Betelgeuse\n\n"
            "During the 2019 'Great Dimming', why did Betelgeuse look dim in visible light but stay bright in infrared?\n\n"
            "A) It cooled down to absolute zero\n"
            "B) Expelled gas cooled into dust that blocked visible light while radiating heat in infrared\n"
            "C) A giant black hole passed in front of it\n\n"
            "Reply with your guess (A, B, or C)!"
        ),
    },
    "barnards-star": {
        "title": "GJ 699",
        "name": "Barnard's Star",
        "type": "Red Dwarf Star (M4.0V)",
        "distance": "5.96 Light-Years",
        "temp_k": "3,130 K",
        "metric_label": "PROPER MOTION VELOCITY",
        "metric_value": "10.36″ / Year",
        "band": "SPHEREx Band 1.6 µm",
        "image_url": "https://images-assets.nasa.gov/image/PIA22334/PIA22334~thumb.jpg",
        "core_explanation": (
            "Barnard's Star is the fourth closest known individual star to the Sun and holds the record for the highest proper motion "
            "of any star in Earth's sky (10.36 arcseconds per year). Over a human lifetime, it traverses about half the angular "
            "diameter of the full Moon! When comparing NASA observations taken just a few years apart, its shift across the background "
            "stars is unmistakably visible."
        ),
        "quiz_question": (
            "🌟 Astronomy Quiz: Barnard's Star\n\n"
            "Why is Barnard's Star famous in multi-epoch astronomical surveys?\n\n"
            "A) It is the brightest star in the night sky\n"
            "B) It has the fastest known proper motion across our night sky (10.36″/year)\n"
            "C) It is currently colliding with the Sun\n\n"
            "What's your answer: A, B, or C?"
        ),
    },
    "wise-0855": {
        "title": "WISE J085510.83-071442.5",
        "name": "WISE 0855",
        "type": "Sub-Stellar Brown Dwarf (Y4 Class)",
        "distance": "7.2 Light-Years",
        "temp_k": "250 K (−23°C)",
        "metric_label": "SURFACE TEMPERATURE",
        "metric_value": "250 K (−23°C)",
        "band": "SPHEREx Band 4.5 µm",
        "image_url": "https://images-assets.nasa.gov/image/PIA18008/PIA18008~thumb.jpg",
        "core_explanation": (
            "WISE 0855 is the coldest known brown dwarf outside our solar system, sitting just 7.2 light-years from Earth. "
            "With temperatures hovering around −23°C (250 K), it is colder than an Arctic winter! Astronomers have discovered "
            "evidence of atmospheric water ice clouds—the first ever detected beyond our own solar system."
        ),
        "quiz_question": (
            "🌟 Astronomy Quiz: WISE 0855\n\n"
            "What unique atmospheric feature was detected on the sub-stellar brown dwarf WISE 0855?\n\n"
            "A) Liquid methane oceans\n"
            "B) Water ice clouds in its freezing atmosphere\n"
            "C) Molten iron rainstorms\n\n"
            "Which one do you choose?"
        ),
    },
    "m31": {
        "title": "Messier 31",
        "name": "Andromeda Galaxy",
        "type": "Barred Spiral Galaxy (SA(s)b)",
        "distance": "2.537 Million Light-Years",
        "temp_k": "1 Trillion Stars",
        "metric_label": "APPROACH VELOCITY",
        "metric_value": "110 km/s",
        "band": "SPHEREx Survey Matrix",
        "image_url": "https://images-assets.nasa.gov/image/PIA04921/PIA04921~thumb.jpg",
        "core_explanation": (
            "The Andromeda Galaxy is the closest major spiral galaxy to the Milky Way, containing over one trillion stars. "
            "While visible light is absorbed by thick lanes of interstellar dust along its spiral arms, infrared surveys "
            "trace the warm glow of dust heated by newborn stars and reveal the distribution of old red giant populations "
            "throughout the galactic disc."
        ),
        "quiz_question": (
            "🌟 Astronomy Quiz: Andromeda Galaxy\n\n"
            "How many stars are estimated to reside inside our neighboring Andromeda Galaxy?\n\n"
            "A) About 100 million\n"
            "B) About 400 billion\n"
            "C) Over 1 trillion stars\n\n"
            "Select A, B, or C!"
        ),
    },
    "m42": {
        "title": "Messier 42",
        "name": "Orion Nebula",
        "type": "Stellar Nursery (H II Region)",
        "distance": "1,344 Light-Years",
        "temp_k": "10,000 K (Ionized Gas)",
        "metric_label": "STELLAR CLUSTER",
        "metric_value": "Trapezium Stars",
        "band": "SPHEREx Band 3.3 µm (PAH)",
        "image_url": "https://images-assets.nasa.gov/image/PIA08653/PIA08653~thumb.jpg",
        "core_explanation": (
            "The Orion Nebula is the nearest massive star-forming region to Earth. Inside this swirling cosmic nursery, infant stars "
            "sculpt cavities in the gas with fierce ultraviolet radiation. In SPHEREx's 102 infrared channels, polycyclic aromatic "
            "hydrocarbons (complex organic carbon dust molecules) light up like fluorescent lanterns at 3.3 µm!"
        ),
        "quiz_question": (
            "🌟 Astronomy Quiz: Orion Nebula\n\n"
            "What astronomical process is actively occurring right now inside the Orion Nebula?\n\n"
            "A) Star formation: infant stars condensing out of turbulent gas and dust\n"
            "B) A galaxy-wide collision\n"
            "C) The Big Bang\n\n"
            "Which is correct?"
        ),
    },
    "sirius": {
        "title": "Alpha Canis Majoris",
        "name": "Sirius",
        "type": "Binary Star System (A1V + DA2)",
        "distance": "8.6 Light-Years",
        "temp_k": "9,940 K",
        "metric_label": "STELLAR LUMINOSITY",
        "metric_value": "25.4× Solar",
        "band": "SPHEREx Band 1.1 µm",
        "image_url": "https://images-assets.nasa.gov/image/PIA14445/PIA14445~thumb.jpg",
        "core_explanation": (
            "Sirius is the brightest star in the night sky. It is actually a binary star system consisting of Sirius A (a luminous "
            "white main-sequence star) and Sirius B (an Earth-sized white dwarf remnant). In infrared detector arrays, Sirius emits "
            "such intense flux that it serves as an essential photometric calibration benchmark for space missions."
        ),
        "quiz_question": (
            "🌟 Astronomy Quiz: Sirius\n\n"
            "What kind of stellar companion orbits Sirius A?\n\n"
            "A) A neutron star pulsar\n"
            "B) An Earth-sized white dwarf star (Sirius B)\n"
            "C) A hot Jupiter exoplanet\n\n"
            "Guess A, B, or C!"
        ),
    },
    "vega": {
        "title": "Alpha Lyrae",
        "name": "Vega",
        "type": "A0Va Main-Sequence Star",
        "distance": "25.04 Light-Years",
        "temp_k": "9,602 K",
        "metric_label": "CIRCUMSTELLAR DISK",
        "metric_value": "Debris Belt",
        "band": "SPHEREx Band 2.4 µm",
        "image_url": "https://images-assets.nasa.gov/image/PIA17013/PIA17013~thumb.jpg",
        "core_explanation": (
            "Vega is historically one of the most studied stars in astrophysics, historically serving as the zero-point for stellar "
            "magnitudes. In 1983, the IRAS satellite discovered that Vega emits an 'infrared excess'—warm dust grains left behind by "
            "colliding planetesimals, forming a vast circumstellar debris disk similar to our Kuiper Belt."
        ),
        "quiz_question": (
            "🌟 Astronomy Quiz: Vega\n\n"
            "What did infrared space telescopes discover encircling Vega?\n\n"
            "A) A warm debris disk of collided asteroid and planetesimal dust\n"
            "B) A swarm of supermassive black holes\n"
            "C) A Dyson sphere\n\n"
            "What is your answer?"
        ),
    },
    "rw-aurigae": {
        "title": "RW Aurigae",
        "name": "RW Aurigae",
        "type": "Classical T Tauri Binary Variable",
        "distance": "530 Light-Years",
        "temp_k": "Variable Accretion",
        "metric_label": "TIDAL DISRUPTION",
        "metric_value": "Disrupted Disks",
        "band": "SPHEREx Multi-Band",
        "image_url": "https://images-assets.nasa.gov/image/PIA13083/PIA13083~thumb.jpg",
        "core_explanation": (
            "RW Aurigae is a young pre-main-sequence binary star undergoing dramatic tidal disruptions. A close gravitational "
            "encounter between the two infant stars sheared their protoplanetary disks, producing a colossal bridge of gas and dust. "
            "Infrared observations track the shifting warm dust lanes as young planets struggle to form amidst stellar turbulence."
        ),
        "quiz_question": (
            "🌟 Astronomy Quiz: RW Aurigae\n\n"
            "What causes the violent brightness dips observed in the RW Aurigae system?\n\n"
            "A) Gravitational tidal disruption tearing apart protoplanetary planet-forming disks\n"
            "B) Sunspots on the Earth\n"
            "C) Lens flare from telescope mirrors\n\n"
            "What is the cause: A, B, or C?"
        ),
    },
    "r-draconis": {
        "title": "R Dra",
        "name": "R Draconis",
        "type": "Mira-Type Pulsating Red Giant",
        "distance": "1,200 Light-Years",
        "temp_k": "Pulsating ~2,500 K",
        "metric_label": "PULSATION PERIOD",
        "metric_value": "245 Days",
        "band": "SPHEREx Mid-Infrared",
        "image_url": "https://images-assets.nasa.gov/image/PIA13084/PIA13084~thumb.jpg",
        "core_explanation": (
            "R Draconis is an Asymptotic Giant Branch (AGB) red giant that literally pulses in size every 245 days! As it contracts "
            "and expands, shock waves ripple through its upper atmosphere, ejecting carbon and silicate dust grains into the cosmos. "
            "Multi-epoch SPHEREx passes capture this dramatic rhythm of stellar pulsation."
        ),
        "quiz_question": (
            "🌟 Astronomy Quiz: R Draconis\n\n"
            "What is the pulsation period of the Mira variable star R Draconis?\n\n"
            "A) 24 hours\n"
            "B) 245 days\n"
            "C) 100 years\n\n"
            "Can you spot the correct period?"
        ),
    },
}


def _match_target(text: str, target_id: Optional[str]) -> Optional[Dict[str, Any]]:
    """Identifies and validates the celestial object referenced in the question or context."""
    if target_id and target_id in TARGET_FACTS:
        return TARGET_FACTS[target_id]

    lower = text.lower()
    for tid, info in TARGET_FACTS.items():
        if info["name"].lower() in lower or info["title"].lower() in lower or tid in lower:
            return info
        if tid == "m31" and ("andromeda" in lower or "messier 31" in lower):
            return info
        if tid == "m42" and ("orion nebula" in lower or "messier 42" in lower):
            return info
        if tid == "barnards-star" and ("barnard" in lower or "gj 699" in lower):
            return info
        if tid == "wise-0855" and ("wise" in lower or "brown dwarf" in lower):
            return info
        if tid == "rw-aurigae" and ("rw aur" in lower or "aurigae" in lower):
            return info
        if tid == "r-draconis" and ("r dra" in lower or "draconis" in lower):
            return info

    return None


def _validate_context(target_id: Optional[str], raw_context: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Validates and sanitizes client context against verified astronomy facts.
    Prevents forged or scientifically invalid client assertions from polluting the prompt.
    """
    validated = {}
    matched = _match_target("", target_id)

    if matched:
        validated["name"] = matched["name"]
        validated["designation"] = matched["title"]
        validated["classification"] = matched["type"]
        validated["distance"] = matched["distance"]
        validated["metric"] = f"{matched['metric_label']}: {matched['metric_value']}"
        validated["verified"] = True
    elif raw_context and raw_context.get("name"):
        validated["name"] = str(raw_context["name"])[:60]
        validated["designation"] = str(raw_context.get("designation", ""))[:60]
        validated["distance"] = str(raw_context.get("distance", "Cosmic Distance"))[:40]
        validated["verified"] = False

    if raw_context:
        # Extract telemetry metadata safely
        if "observation_count" in raw_context:
            validated["observation_count"] = int(raw_context["observation_count"])
        elif "count" in raw_context:
            try:
                validated["observation_count"] = int(raw_context["count"])
            except (ValueError, TypeError):
                pass

        if "bands" in raw_context:
            validated["bands"] = str(raw_context["bands"])[:100]

        if "earliest_date" in raw_context:
            validated["earliest_date"] = str(raw_context["earliest_date"])[:50]
        elif "earliest" in raw_context:
            validated["earliest_date"] = str(raw_context["earliest"])[:50]

        if "latest_date" in raw_context:
            validated["latest_date"] = str(raw_context["latest_date"])[:50]
        elif "latest" in raw_context:
            validated["latest_date"] = str(raw_context["latest"])[:50]

        if "repeat_coverage_found" in raw_context:
            validated["repeat_coverage_found"] = bool(raw_context["repeat_coverage_found"])

        if "span_days" in raw_context:
            try:
                validated["span_days"] = float(raw_context["span_days"])
            except (ValueError, TypeError):
                pass

    return validated


def _build_claude_system_prompt(target: Optional[Dict[str, Any]], context: Optional[Dict[str, Any]]) -> str:
    """Builds the astrophysics grounding system prompt for Claude with strict scientific guardrails."""
    target_section = ""
    if target:
        target_section = f"""
VERIFIED CELESTIAL TARGET CONTEXT:
- Object Name: {target.get('name')} ({target.get('title')})
- Astrophysical Classification: {target.get('type')}
- Measured Distance: {target.get('distance')}
- Physical Telemetry: {target.get('metric_label')} = {target.get('metric_value')}
- Primary Infrared Bandpass: {target.get('band')}
"""

    context_section = ""
    if context:
        obs_count = context.get("observation_count")
        bands = context.get("bands")
        earliest = context.get("earliest_date")
        latest = context.get("latest_date")
        repeat = context.get("repeat_coverage_found")
        delta_days = context.get("span_days")

        context_section = f"""
AUTHENTIC NASA SPHEREx MISSION TELEMETRY:
- Total Observations Available: {obs_count or 'Survey Catalog Active'}
- Spectral Bands Coverage: {bands or 'SPHEREx 102 Spectral Channels (0.75 - 5.0 µm)'}
- Baseline Observation Epoch: {earliest or 'Level-2 Calibrated Survey'}
- Repeat Observation Epoch: {latest or 'Calibrated Multi-Pass'}
- Repeat Coverage Status: {'Confirmed Multi-Epoch Coverage' if repeat else 'Single Pass / Standard Survey'}
- Temporal Separation: {f'{delta_days} days' if delta_days else 'Astronomical Time Baseline'}
"""

    return f"""You are Astro AI, an inspiring, enthusiastic astronomy tutor and celestial guide for AstroLens X, an educational web platform built for the NASA Space Apps Challenge and powered by NASA's SPHEREx mission.

{target_section}
{context_section}

CORE TUTOR & LEARNING GUIDELINES:
1. EXPLAIN FOR LEARNERS: Communicate naturally and warmly in plain English suitable for students (Grade 5 to university undergrad) and the curious public. If asked "Can you explain this like I'm 10?", use vivid playful metaphors (space blankets, heat-vision goggles, baking warm cookies).
2. VIVID REAL-WORLD ANALOGIES: Use engaging analogies (e.g. infrared light as thermal heat goggles, cosmic dust like smoke scattering blue light, the blink comparator like a cosmic motion flipbook).
3. QUIZ & ENGAGEMENT: If asked "Can you quiz me about this object?" or "quiz me", create a fun, 3-option multiple choice question (A, B, C) about the current target or astrophysics concept. Await their answer and guide them!
4. STRICT SCIENTIFIC INTEGRITY & GUARDRAILS:
   - VISUAL INSPECTION BOUNDARY: You have access to calibrated telemetry, coordinates, wavelengths, dates, and bandpasses, but you do NOT receive raw image pixel matrices or computer vision tensors in this query. NEVER claim that you can visually see shapes, patterns, or anomalies in the image that are not documented in the verified metadata. Always explain what the user is seeing based on the known astrophysical parameters, detector scale (6.155 arcsec/pixel), and spectral bands.
   - NO FABRICATED MOTION: NEVER invent or claim movement between images unless proper motion is verified by genuine astrometry (e.g. Barnard's Star at 10.36″/year, or fast brown dwarfs like WISE 0855). Explain that pixel brightness differences between same-epoch exposures are detector artifacts, cosmic rays, or PSF sampling, NOT moving planets or aliens.
   - PLANET NINE GUARDRAIL: NEVER claim that Planet Nine or Planet X has been discovered. If asked, explain that Planet Nine is an unconfirmed theoretical hypothesis based on Kuiper Belt clustering, and SPHEREx's all-sky infrared survey will place stringent observational constraints on its existence.
   - SPHEREx DATA TRUTH: SPHEREx Level-2 images are calibrated flux measurements in mega-Janskys per steradian (MJy/sr) at 6.155″/pixel. Do not confuse them with public outreach visible photography.
5. FORMATTING:
   - Keep answers clear and concise (around 2 to 4 short paragraphs). Use bolding for key astronomical terms.
   - At the very end of your response, output exactly 2 or 3 suggested follow-up questions formatted on their own lines starting with `FOLLOW_UP: ` (e.g. `FOLLOW_UP: Why does Betelgeuse look so bright in infrared?`).
"""


def _parse_follow_ups(text: str) -> tuple[str, List[str]]:
    """Extracts FOLLOW_UP: lines from Claude's response."""
    lines = text.split("\n")
    cleaned_lines = []
    follow_ups = []

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("FOLLOW_UP:"):
            question = stripped[len("FOLLOW_UP:"):].strip()
            if question:
                follow_ups.append(question)
        else:
            cleaned_lines.append(line)

    clean_text = "\n".join(cleaned_lines).strip()
    return clean_text, follow_ups[:3]


async def _call_claude_api(
    api_key: str,
    model_name: str,
    message: str,
    target: Optional[Dict[str, Any]],
    context: Optional[Dict[str, Any]],
    history: Optional[List[ChatMessage]],
) -> Dict[str, Any]:
    """
    Invokes the Anthropic Python SDK asynchronously with structured system prompt and history.
    Captures specific Anthropic exceptions (auth, rate-limit, timeout, bad request).
    """
    if not HAS_ANTHROPIC:
        return {"error_type": "no_sdk", "error_message": "Anthropic Python SDK not installed."}

    system_prompt = _build_claude_system_prompt(target, context)

    # Format history into alternating user/assistant turns
    formatted_messages: List[Dict[str, str]] = []
    if history:
        for m in history:
            role = "assistant" if m.role == "assistant" else "user"
            formatted_messages.append({"role": role, "content": m.content})

    # Ensure last message is the current user query
    if not formatted_messages or formatted_messages[-1]["role"] != "user":
        formatted_messages.append({"role": "user", "content": message})
    else:
        formatted_messages[-1]["content"] = message

    # Ensure message sequence starts with 'user'
    while formatted_messages and formatted_messages[0]["role"] != "user":
        formatted_messages.pop(0)

    clean_key = api_key.strip()
    is_user_token = clean_key.startswith("sk-ant-usr-")

    async def _send_request(use_auth_token: bool):
        if use_auth_token:
            cl = anthropic.AsyncAnthropic(auth_token=clean_key, timeout=15.0)
        else:
            cl = anthropic.AsyncAnthropic(api_key=clean_key, timeout=15.0)
        return await cl.messages.create(
            model=model_name,
            max_tokens=700,
            system=system_prompt,
            messages=formatted_messages,
        )

    try:
        try:
            resp = await _send_request(use_auth_token=is_user_token)
        except anthropic.AuthenticationError:
            # If the initial token mode gave AuthenticationError, try alternate auth mode
            logger.info("Retrying with alternate Anthropic auth header mode...")
            resp = await _send_request(use_auth_token=not is_user_token)

        if resp.content and len(resp.content) > 0:
            raw_text = resp.content[0].text
            clean_text, follow_ups = _parse_follow_ups(raw_text)
            return {
                "success": True,
                "text": clean_text,
                "follow_ups": follow_ups,
                "model": resp.model or model_name,
            }
        return {"error_type": "empty_response", "error_message": "Anthropic returned an empty response."}

    except anthropic.AuthenticationError as e:
        logger.warning(f"Anthropic AuthenticationError: {e}")
        return {
            "error_type": "auth",
            "error_message": "Invalid Anthropic API key. To enable live Claude responses, configure a valid key in backend/.env.",
        }
    except anthropic.RateLimitError as e:
        logger.warning(f"Anthropic RateLimitError: {e}")
        return {
            "error_type": "rate_limit",
            "error_message": "Anthropic API rate limit reached. Please wait a moment.",
        }
    except anthropic.BadRequestError as e:
        logger.warning(f"Anthropic BadRequestError: {e}")
        return {
            "error_type": "bad_request",
            "error_message": f"Anthropic request error: {e.message}",
        }
    except anthropic.APITimeoutError as e:
        logger.warning(f"Anthropic APITimeoutError: {e}")
        return {
            "error_type": "timeout",
            "error_message": "Anthropic API request timed out (15s limit).",
        }
    except Exception as e:
        logger.warning(f"Anthropic generic error: {e}")
        return {
            "error_type": "general",
            "error_message": f"Anthropic API connection error: {str(e)}",
        }


def generate_fallback_response(message: str, target_id: Optional[str], context: Optional[Dict[str, Any]]) -> ChatResponse:
    """
    Intelligent astronomical reasoning engine.
    Produces scientifically rigorous, engaging educational responses without needing external keys.
    """
    target = _match_target(message, target_id)
    lower = message.lower()

    # 1. Planet X / Planet Nine / Fake Planet Guardrail
    if "planet x" in lower or "planet 9" in lower or "planet nine" in lower or "nemesis" in lower:
        return ChatResponse(
            text=(
                "Great question! In 2016, astrophysicists noticed that several distant Kuiper Belt objects share similar unusual "
                "elliptical orbits, suggesting a hypothetical Neptune-mass world—often nicknamed 'Planet Nine' or 'Planet X'—might orbit "
                "hundreds of times farther than Earth.\n\n"
                "Importantly: Planet Nine has NOT been discovered or confirmed yet! Because it would be extremely cold and faint, "
                "it would emit faint thermal radiation. NASA's SPHEREx mission is surveying the entire sky across 102 infrared "
                "spectral channels, which will provide the most thorough observational test yet to see if such an object actually exists!"
            ),
            band="SPHEREx Outer Solar System Survey",
            source="Astro AI • Science Guardrail",
            target_card=TargetCard(
                title="Hypothetical Planet Nine",
                subtitle="Status: Unconfirmed Hypothesis",
                image_url="https://images-assets.nasa.gov/image/PIA20325/PIA20325~thumb.jpg",
                metric_label="ESTIMATED DISTANCE",
                metric_value="400–800 AU",
            ),
            suggestions=[
                Suggestion(label="Explore Sky Catalog", action="explore"),
                Suggestion(label="Learn How Space Changes", action="learn"),
                Suggestion(label="Search WISE 0855 Brown Dwarf", action="explore"),
            ],
            follow_up_questions=[
                "Why is Planet Nine so difficult to detect?",
                "How does SPHEREx detect cold moving objects?",
                "What is the Kuiper Belt?",
            ],
            model="astro-knowledge-engine-v2",
        )

    # 2. Quiz Request
    if "quiz" in lower:
        quiz_text = (
            target.get("quiz_question")
            if target and "quiz_question" in target
            else (
                "🌟 Astronomy Quiz: NASA SPHEREx Mission\n\n"
                "How many individual infrared spectral channels does NASA's SPHEREx space telescope use to map the cosmos?\n\n"
                "A) 3 RGB filters\n"
                "B) 102 spectroscopic bands (0.75 to 5.0 µm)\n"
                "C) 1,000,000 microwave channels\n\n"
                "What's your answer: A, B, or C?"
            )
        )
        return ChatResponse(
            text=quiz_text,
            band=target["band"] if target else "SPHEREx Education Matrix",
            source="Astro AI • Space Quiz Lab",
            target_card=TargetCard(
                title=target["title"] if target else "NASA SPHEREx Survey",
                subtitle="Cosmic Quiz Master",
                image_url=target["image_url"] if target else "https://images-assets.nasa.gov/image/PIA23646/PIA23646~thumb.jpg",
                metric_label="DIFFICULTY LEVEL",
                metric_value="Beginner Friendly",
            ),
            suggestions=[
                Suggestion(label="Check Answer", action="quiz_check"),
                Suggestion(label="Explore the Sky", action="explore"),
            ],
            follow_up_questions=[
                "Give me another quiz question!",
                "Why does space change over time?",
                "What is SPHEREx?",
            ],
            model="astro-knowledge-engine-v2",
        )

    # 3. What is SPHEREx?
    if "what is spherex" in lower or "about spherex" in lower:
        return ChatResponse(
            text=(
                "SPHEREx (Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer) "
                "is NASA's pioneering all-sky infrared spectral survey mission!\n\n"
                "Unlike telescopes that take standard color snapshots, SPHEREx captures 102 individual infrared colors "
                "(wavelengths from 0.75 to 5.0 micrometers) for every single point across the entire night sky. "
                "Its science goals are monumental: probing cosmic inflation after the Big Bang, tracing the cosmic origin of "
                "water and biogenic ices in planetary nurseries, and studying the collective light from all galaxies across cosmic time!"
            ),
            band="102 Spectral Channels (0.75–5.0 µm)",
            source="Astro AI • SPHEREx Synchronized",
            target_card=TargetCard(
                title="NASA SPHEREx Observatory",
                subtitle="All-Sky Spectrophotometry",
                image_url="https://images-assets.nasa.gov/image/PIA23646/PIA23646~thumb.jpg",
                metric_label="SPECTRAL BANDS",
                metric_value="102 Channels",
            ),
            suggestions=[
                Suggestion(label="Explore the Sky", action="explore"),
                Suggestion(label="Launch Time Machine", action="timemachine"),
            ],
            follow_up_questions=[
                "Why does SPHEREx use 102 infrared bands?",
                "How does SPHEREx detect water ice?",
                "What is a red supergiant?",
            ],
            model="astro-knowledge-engine-v2",
        )

    # 4. Explain like I'm 10 / Kid friendly
    if "like i'm 10" in lower or "like im 10" in lower or "10 year old" in lower or "kid" in lower or "simple words" in lower:
        name = target["name"] if target else "stars in deep space"
        return ChatResponse(
            text=(
                f"Imagine you are wearing special heat-vision superhero goggles! 👀✨\n\n"
                f"When you look at {name} with normal human eyes, you only see a fraction of its light because thick clouds "
                f"of space dust act like smoky fog. But heat waves slip right through smoke without getting stuck! "
                f"NASA's SPHEREx telescope puts on those heat-vision goggles to spot warm dust glowing like cozy campfires in the deep dark night!"
            ),
            band="SPHEREx Kid-Friendly Astronomy",
            source="Astro AI • Elementary Astronomy",
            target_card=TargetCard(
                title=target["title"] if target else "Cosmic Heat Vision",
                subtitle="Infrared Space Glasses",
                image_url=target["image_url"] if target else "https://images-assets.nasa.gov/image/PIA23646/PIA23646~thumb.jpg",
                metric_label="SUPERPOWER",
                metric_value="Sees Through Dust!",
            ),
            suggestions=[
                Suggestion(label="Show in Sky Explorer", action="explore"),
                Suggestion(label="Play in Space Lab", action="learn"),
            ],
            follow_up_questions=[
                "Can you quiz me about this object?",
                "What is SPHEREx?",
                "Why do stars twinkle?",
            ],
            model="astro-knowledge-engine-v2",
        )

    # 5. What changed between these observations? / Sky Time Machine
    if "what changed" in lower or "change between" in lower or "difference between" in lower:
        return ChatResponse(
            text=(
                "In our Sky Time Machine, you are comparing two authentic NASA SPHEREx observation epochs! "
                "Astronomers look for two key physical phenomena across different dates:\n\n"
                "1. **Proper Motion**: Nearby stars (like Barnard's Star or WISE 0855) physically travel across our field of view. "
                "When you toggle the blink comparator, nearby stars noticeably jump back and forth relative to static distant background stars!\n\n"
                "2. **Stellar Variability**: Pulsating stars (like Betelgeuse or Mira variables) fluctuate in physical radius and surface "
                "temperature, causing their infrared brightness to rise and fall."
            ),
            band="Temporal Multi-Epoch Analysis",
            source="Astro AI • SPHEREx Synchronized",
            target_card=TargetCard(
                title="Astrometric Co-Registration",
                subtitle="Multi-Epoch Comparison",
                image_url="https://images-assets.nasa.gov/image/PIA22334/PIA22334~thumb.jpg",
                metric_label="OBSERVATION DELTA",
                metric_value="Verified Baseline",
            ),
            suggestions=[
                Suggestion(label="Open Sky Time Machine", action="timemachine"),
                Suggestion(label="Inspect Barnard’s Star", action="explore"),
            ],
            follow_up_questions=[
                "How does the blink comparator work?",
                "How fast is Barnard's Star moving?",
                "Can you quiz me about this object?",
            ],
            model="astro-knowledge-engine-v2",
        )

    # 6. Great Dimming of Betelgeuse
    if target and target["name"] == "Betelgeuse" and ("dimming" in lower or "dim" in lower or "supernova" in lower or "explode" in lower):
        return ChatResponse(
            text=(
                f"{target['dimming_fact']}\n\n"
                "Astronomers confirm that Betelgeuse will eventually end its life as a spectacular Type II supernova, "
                "lighting up Earth's night sky as bright as the full Moon! However, astrophysics calculations show this will "
                "likely occur anytime within the next 100,000 years, so there is no immediate danger to Earth."
            ),
            band=target["band"],
            source="Astro AI • SPHEREx Synchronized",
            target_card=TargetCard(
                title=target["title"],
                subtitle=f"Distance: {target['distance']}",
                image_url=target["image_url"],
                metric_label=target["metric_label"],
                metric_value=target["metric_value"],
            ),
            suggestions=[
                Suggestion(label="Show in Sky Explorer", action="explore"),
                Suggestion(label="Compare observations over time", action="timemachine"),
                Suggestion(label="Inspect SPHEREx Infrared Bands", action="explore"),
            ],
            follow_up_questions=[
                "Why does Betelgeuse look so bright in infrared?",
                "What kind of telescope is NASA SPHEREx?",
                "When will Betelgeuse go supernova?",
            ],
            model="astro-knowledge-engine-v2",
        )

    # 7. Target-Specific Inquiries (e.g. "Why does Betelgeuse look so bright in infrared?")
    if target and ("betelgeuse" in lower or target_id == "betelgeuse") and ("bright" in lower or "infrared" in lower or "look" in lower):
        return ChatResponse(
            text=(
                "Great question! Betelgeuse is a cool red supergiant star surrounded by giant clouds of warm cosmic dust. "
                "While our eyes only see some of its visible light, NASA’s infrared telescopes like SPHEREx see the warm dust "
                "glowing brightly like heat from a cozy campfire in the dark!"
            ),
            band=target["band"],
            source="Astro AI • SPHEREx Synchronized",
            target_card=TargetCard(
                title=target["title"],
                subtitle=f"Distance: {target['distance']}",
                image_url=target["image_url"],
                metric_label=target["metric_label"],
                metric_value=target["metric_value"],
            ),
            suggestions=[
                Suggestion(label="Show in Sky Explorer", action="explore"),
                Suggestion(label="Compare observations over time", action="timemachine"),
                Suggestion(label="Explain the 2019 Great Dimming", action="dimming"),
            ],
            follow_up_questions=[
                "Explain the 2019 Great Dimming",
                "When will Betelgeuse go supernova?",
                "Can you quiz me about this object?",
            ],
            model="astro-knowledge-engine-v2",
        )

    # 8. Target distance inquiries
    if target and ("how far" in lower or "distance" in lower or "light-year" in lower):
        return ChatResponse(
            text=(
                f"{target['name']} is located at an estimated distance of {target['distance']} from Earth. "
                f"Light traveling from this celestial object has spent centuries traveling across interstellar space before "
                f"finally arriving at NASA's detector arrays. Astrophysicists measure these baseline distances using trigonometric "
                f"parallax from space astrometry missions like Gaia and infrared standard candles."
            ),
            band=target["band"],
            source="Astro AI • SPHEREx Synchronized",
            target_card=TargetCard(
                title=target["title"],
                subtitle=f"Distance: {target['distance']}",
                image_url=target["image_url"],
                metric_label="PARALLAX DISTANCE",
                metric_value=target["distance"],
            ),
            suggestions=[
                Suggestion(label="Show in Sky Explorer", action="explore"),
                Suggestion(label="Compare observations over time", action="timemachine"),
            ],
            follow_up_questions=[
                f"What is {target['name']} made of?",
                "How does trigonometric parallax work?",
                "Can you quiz me about this object?",
            ],
            model="astro-knowledge-engine-v2",
        )

    # 9. Why does space change / Proper Motion / Blinking
    if "why does space change" in lower or "proper motion" in lower or "motion" in lower or "move" in lower or "blink" in lower:
        return ChatResponse(
            text=(
                "Space may look frozen when we gaze up at night, but celestial bodies are continuously in motion! "
                "Nearby stars possess 'proper motion', meaning their genuine physical travel through the galaxy causes them "
                "to drift across our field of view relative to distant background stars.\n\n"
                "In our Sky Time Machine, astronomers use a technique pioneered by Clyde Tombaugh: 'blinking' between two "
                "observations of the same sky coordinate taken months or years apart. Stationary background stars remain pinned "
                "in place, while nearby high-proper-motion stars (like Barnard's Star or WISE 0855) visibly jump back and forth!"
            ),
            band="Astrometric Co-Registration Engine",
            source="Astro AI • SPHEREx Synchronized",
            target_card=TargetCard(
                title="Barnard's Star (GJ 699)",
                subtitle="Fastest Proper Motion Star",
                image_url="https://images-assets.nasa.gov/image/PIA22334/PIA22334~thumb.jpg",
                metric_label="PROPER MOTION",
                metric_value="10.36″ / Year",
            ),
            suggestions=[
                Suggestion(label="Open Sky Time Machine", action="timemachine"),
                Suggestion(label="Inspect Barnard’s Star", action="explore"),
                Suggestion(label="Test Proper Motion in Learn Lab", action="learn"),
            ],
            follow_up_questions=[
                "How fast does Barnard's Star travel across the sky?",
                "What is the difference between proper motion and parallax?",
                "Can you quiz me about this object?",
            ],
            model="astro-knowledge-engine-v2",
        )

    # 10. Infrared vs Visible Light / What is Infrared?
    if "infrared" in lower or "heat" in lower or "spectrum" in lower:
        return ChatResponse(
            text=(
                "Think of visible light as what your eyes see (like the colors of a rainbow), and infrared light as warm heat "
                "you feel radiating from a cozy campfire or warm asphalt!\n\n"
                "In deep space, colossal clouds of cosmic dust act like thick smoke, blocking visible starlight. But infrared waves "
                "are longer, allowing them to pass right through the dust particles without scattering (governed by Rayleigh scattering, "
                "where scattering drops by wavelength to the fourth power, λ⁻⁴). That is why NASA's SPHEREx telescope wears infrared "
                "glasses—to unveil newborn stars, cold brown dwarfs, and water ice hidden inside cosmic nurseries!"
            ),
            band="Spectroscopy 0.75 – 5.0 µm",
            source="Astro AI • SPHEREx Synchronized",
            target_card=TargetCard(
                title="SPHEREx Mission Payload",
                subtitle="102 Near-Infrared Bands",
                image_url="https://images-assets.nasa.gov/image/PIA08653/PIA08653~thumb.jpg",
                metric_label="SPECTRAL RANGE",
                metric_value="0.75 – 5.0 µm",
            ),
            suggestions=[
                Suggestion(label="Explore the Sky", action="explore"),
                Suggestion(label="Learn Space Discoveries", action="learn"),
                Suggestion(label="Compare Multi-Epoch Images", action="timemachine"),
            ],
            follow_up_questions=[
                "Why can infrared light pass through cosmic dust?",
                "What are the 102 spectral bands of SPHEREx?",
                "Can you quiz me about this object?",
            ],
            model="astro-knowledge-engine-v2",
        )

    # 11. SPHEREx Pixelation / Image Resolution / 6.155 arcsec
    if "pixel" in lower or "blurry" in lower or "resolution" in lower or "arcsec" in lower or "fits" in lower or "wcs" in lower:
        return ChatResponse(
            text=(
                "Great observation! SPHEREx is an all-sky surveyor designed to map the entire celestial sphere four times over, "
                "rather than taking narrow, high-magnification portraits like Hubble or Webb.\n\n"
                "Its wide-field telescope has a 20 cm aperture with a native pixel scale of 6.155 arcseconds per pixel. Each pixel "
                "in our viewer is not an aesthetic graphic, but a calibrated scientific measurement of sky surface brightness in "
                "mega-Janskys per steradian (MJy/sr). In AstroLens X, you can toggle between 'Nearest Neighbor' to inspect raw "
                "science pixels and 'Bilinear' for smooth educational display!"
            ),
            band="WCS Astrometric Projection TAN",
            source="Astro AI • SPHEREx Synchronized",
            target_card=TargetCard(
                title="SPHEREx Pixel Scale",
                subtitle="Calibrated Level-2 Data",
                image_url="https://images-assets.nasa.gov/image/PIA18008/PIA18008~thumb.jpg",
                metric_label="PIXEL SCALE",
                metric_value="6.155″ / pixel",
            ),
            suggestions=[
                Suggestion(label="Toggle Raw vs Smooth Pixels", action="timemachine"),
                Suggestion(label="View Science Mode WCS Metrics", action="timemachine"),
            ],
            follow_up_questions=[
                "What does MJy/sr mean in astronomy?",
                "How does WCS coordinate reprojection work?",
                "Can you quiz me about this object?",
            ],
            model="astro-knowledge-engine-v2",
        )

    # 12. Specific Target Match
    if target:
        name = target["name"]
        return ChatResponse(
            text=(
                f"{target['core_explanation']}\n\n"
                f"In NASA SPHEREx multi-band telemetry, {name} is observed across multiple epochs to quantify infrared spectral "
                f"energy distributions (SEDs). Whether tracking interstellar dust chemistry, stellar pulsation, or proper motion shifts, "
                f"these observations provide astrophysicists with direct empirical constraints on celestial physics."
            ),
            band=target["band"],
            source="Astro AI • SPHEREx Synchronized",
            target_card=TargetCard(
                title=target["title"],
                subtitle=f"Distance: {target['distance']}",
                image_url=target["image_url"],
                metric_label=target["metric_label"],
                metric_value=target["metric_value"],
            ),
            suggestions=[
                Suggestion(label=f"Show {name} in Sky Explorer", action="explore"),
                Suggestion(label="Compare observations over time", action="timemachine"),
                Suggestion(label="Learn Space Discoveries", action="learn"),
            ],
            follow_up_questions=[
                f"How far away is {name} from Earth?",
                f"What does {name} look like in infrared light?",
                "Can you quiz me about this object?",
            ],
            model="astro-knowledge-engine-v2",
        )

    # 13. General Astronomy / Cosmic Explorer Query
    return ChatResponse(
        text=(
            "That's a wonderful question about our cosmos! In observational astronomy, telescopes like NASA's SPHEREx survey "
            "the sky to answer fundamental questions about the birth of the universe, the origins of water in planetary systems, "
            "and the evolution of galaxies.\n\n"
            "By collecting spectroscopic fingerprints across 102 individual infrared wavelength channels, astronomers can determine "
            "an object's chemical composition, surface temperature, distance, and relative motion through space."
        ),
        band="SPHEREx Calibration Level 2",
        source="Astro AI • SPHEREx Synchronized",
        target_card=TargetCard(
            title="NASA SPHEREx Observatory",
            subtitle="Spectro-Photometer for the History of the Universe",
            image_url="https://images-assets.nasa.gov/image/PIA23646/PIA23646~thumb.jpg",
            metric_label="ALL-SKY COVERAGE",
            metric_value="100% Sky",
        ),
        suggestions=[
            Suggestion(label="Explore the Sky", action="explore"),
            Suggestion(label="Open Sky Time Machine", action="timemachine"),
            Suggestion(label="Citizen Science Quiz", action="learn"),
        ],
        follow_up_questions=[
            "What is NASA SPHEREx and what does it measure?",
            "Why do stars blink and move over time?",
            "Can you quiz me about this object?",
        ],
        model="astro-knowledge-engine-v2",
    )


async def generate_ai_chat_response(req: ChatRequest) -> ChatResponse:
    """
    Main entry point for generating AI chat responses.
    Validates celestial context against verified facts, attempts Claude API via Anthropic SDK,
    and falls back cleanly with helpful notifications if credentials/network are constrained.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    claude_model = os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-latest")

    # Validate and sanitize context against backend reference catalog
    validated_context = _validate_context(req.target_id, req.context)
    target = _match_target(req.message, req.target_id)

    if api_key and HAS_ANTHROPIC:
        claude_result = await _call_claude_api(
            api_key=api_key,
            model_name=claude_model,
            message=req.message,
            target=target,
            context=validated_context,
            history=req.history,
        )

        if claude_result.get("success"):
            card = None
            if target:
                card = TargetCard(
                    title=target["title"],
                    subtitle=f"Distance: {target['distance']}",
                    image_url=target["image_url"],
                    metric_label=target["metric_label"],
                    metric_value=target["metric_value"],
                )

            suggestions = [
                Suggestion(label="Show in Sky Explorer", action="explore"),
                Suggestion(label="Compare observations over time", action="timemachine"),
                Suggestion(label="Learn Space Discoveries", action="learn"),
            ]
            if target:
                suggestions.insert(0, Suggestion(label=f"Inspect {target['name']} Telemetry", action="explore"))

            follow_ups = claude_result.get("follow_ups") or [
                "Why does space change over time?",
                "What is infrared light in simple words?",
                "Can you quiz me about this object?",
            ]

            return ChatResponse(
                text=claude_result["text"],
                band=target["band"] if target else "SPHEREx Calibration Level 2",
                source=f"Astro AI • Powered by Claude ({claude_result['model']})",
                target_card=card,
                suggestions=suggestions,
                follow_up_questions=follow_ups,
                model=claude_result["model"],
            )

        # If Anthropic API had an error (e.g. auth, rate limit, timeout), provide fallback with notice
        err_msg = claude_result.get("error_message", "Anthropic API unavailable.")
        fallback = generate_fallback_response(req.message, req.target_id, validated_context)
        fallback.notice = err_msg
        fallback.source = f"Astro AI • Verified Offline Engine ({claude_result.get('error_type', 'offline')})"
        return fallback

    # Seamless fallback to intelligent local reasoning engine
    return generate_fallback_response(req.message, req.target_id, validated_context)
