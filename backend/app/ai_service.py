"""
AstroLens X - AI Chat Service
Integrates Claude AI (Anthropic Messages API via HTTPX) with the NASA SPHEREx astronomy platform.
Reads ANTHROPIC_API_KEY and CLAUDE_MODEL from the backend environment / .env,
injecting verified celestial target coordinates, SPHEREx observation dates,
spectral bands, and comparison telemetry into Claude's system prompt.
Features strict scientific guardrails, visual inspection boundaries, quiz assistance,
curated NASA SPHEREx RAG knowledge retrieval, and a robust local astronomical reasoning engine fallback.
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
        load_dotenv(env_path, override=False)
    else:
        load_dotenv()
except Exception:
    pass

logger = logging.getLogger("astrolens.ai")

try:
    import httpx
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False

# RAG Knowledge Base import
try:
    from .spherex_rag import search_spherex_rag
except ImportError:
    try:
        from app.spherex_rag import search_spherex_rag
    except ImportError:
        def search_spherex_rag(q: str, top_k: int = 2):
            return []


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


# ── Intent Detection & Classification ─────────────────────────────────────────

GREETING_REGEX = re.compile(
    r"^(hi+|hey+|heyy+|hello+|howdy|hola|yo|sup|greetings|good\s+(morning|afternoon|evening|day))[\s!.,?~:)]*$",
    re.IGNORECASE,
)

CASUAL_PATTERNS = [
    r"\b(how\s+are\s+you|how's\s+it\s+going|hows\s+it\s+going|how\s+do\s+you\s+do)\b",
    r"\b(who\s+are\s+you|what\s+are\s+you|what\s+is\s+your\s+name|who\s+made\s+you|who\s+created\s+you)\b",
    r"\b(what\s+can\s+you\s+do|tell\s+me\s+about\s+yourself|help\s+me)\b",
    r"\b(thank\s+you|thanks|thx|ty|appreciate\s+it)\b",
    r"\b(bye|goodbye|see\s+ya|see\s+you|good\s+night)\b",
]

TAMIL_CHARS_REGEX = re.compile(r"[\u0B80-\u0BFF]")
TAMIL_REQUEST_REGEX = re.compile(r"\b(in\s+tamil|explain\s+in\s+tamil|speak\s+tamil|tamil\s+please|translate\s+to\s+tamil)\b", re.IGNORECASE)

DEICTIC_TARGET_REGEX = re.compile(
    r"\b(this\s+star|these\s+stars|this\s+object|these\s+objects|this\s+target|this\s+image|these\s+images|this\s+observation|these\s+observations|"
    r"how\s+far\s+away\s+is\s+it|how\s+far\s+is\s+it|why\s+does\s+it\s+look|why\s+is\s+it\s+so\s+bright|"
    r"what\s+am\s+i\s+seeing|quiz\s+me\s+about\s+this|explain\s+this\s+like\s+i'm\s+10|explain\s+this\s+like\s+im\s+10)\b",
    re.IGNORECASE,
)


def _is_greeting(text: str) -> bool:
    """Detects simple conversational greetings like 'hi', 'hiiii', 'hello', 'hey'."""
    return bool(GREETING_REGEX.match(text.strip()))


def _is_casual(text: str) -> bool:
    """Detects friendly casual questions like 'how are you', 'who are you', 'thanks'."""
    cleaned = text.strip().lower()
    return any(re.search(pat, cleaned, re.IGNORECASE) for pat in CASUAL_PATTERNS)


def _is_tamil(text: str) -> bool:
    """Detects Tamil script or explicit requests for Tamil language explanation."""
    return bool(TAMIL_CHARS_REGEX.search(text) or TAMIL_REQUEST_REGEX.search(text))


def _is_comparison(text: str) -> bool:
    """Detects observation comparison and Sky Time Machine questions."""
    lower = text.lower()
    return any(k in lower for k in ["what changed", "change between", "difference between", "are they moving", "did it move", "blink comparator"])


def _match_target(text: str, target_id: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    Identifies if a celestial target is explicitly named in the user query,
    OR if the query uses deictic reference ('this star', 'how far away is it')
    pointing to the active target_id.
    
    If the user is sending a greeting, casual chat, general science question,
    or does not reference the target, this returns None to prevent unwanted target hijacking.
    """
    lower = text.strip().lower()

    # If message is purely a greeting or casual chat, do NOT associate target
    if _is_greeting(lower) or _is_casual(lower):
        return None

    # 1. Direct explicit name match in user message
    for tid, info in TARGET_FACTS.items():
        name_lower = info["name"].lower()
        title_lower = info["title"].lower()
        if re.search(r"\b" + re.escape(name_lower) + r"\b", lower) or re.search(r"\b" + re.escape(title_lower) + r"\b", lower):
            return info
        if tid == "m31" and ("andromeda" in lower or "messier 31" in lower):
            return info
        if tid == "m42" and ("orion nebula" in lower or "messier 42" in lower):
            return info
        if tid == "barnards-star" and ("barnard" in lower or "gj 699" in lower):
            return info
        if tid == "wise-0855" and ("wise 0855" in lower or "wise0855" in lower or "brown dwarf" in lower):
            return info
        if tid == "rw-aurigae" and ("rw aur" in lower or "aurigae" in lower):
            return info
        if tid == "r-draconis" and ("r dra" in lower or "draconis" in lower):
            return info

    # 2. Deictic reference matching ("this star", "how far away is it", "what am I seeing in this NASA image")
    if target_id and target_id in TARGET_FACTS:
        if DEICTIC_TARGET_REGEX.search(lower) or "this celestial" in lower or "this system" in lower:
            return TARGET_FACTS[target_id]

    return None


def _validate_context(target_id: Optional[str], raw_context: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Validates and sanitizes client context against verified astronomy facts.
    Prevents forged or scientifically invalid client assertions from polluting the prompt.
    """
    validated = {}
    if target_id and target_id in TARGET_FACTS:
        matched = TARGET_FACTS[target_id]
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
            try:
                validated["observation_count"] = int(raw_context["observation_count"])
            except (ValueError, TypeError):
                pass
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


def _build_claude_system_prompt(
    message: Any = "",
    target: Optional[Dict[str, Any]] = None,
    context: Optional[Dict[str, Any]] = None,
) -> str:
    """Builds the astrophysics grounding system prompt for Claude with strict scientific guardrails and RAG integration."""
    # Backwards compatibility if called as _build_claude_system_prompt(target, context)
    if isinstance(message, dict) and context is None:
        context = target
        target = message
        message = ""

    target_section = ""
    if target:
        target_section = f"""
CELESTIAL TARGET REFERENCE CONTEXT:
- Object Name: {target.get('name')} ({target.get('title')})
- Astrophysical Classification: {target.get('type')}
- Measured Distance: {target.get('distance')}
- Physical Telemetry: {target.get('metric_label')} = {target.get('metric_value')}
- Primary Infrared Bandpass: {target.get('band')}
[NOTE: The user explicitly referenced this object. Ground your answer in these verified facts.]
"""
    else:
        target_section = """
CELESTIAL TARGET CONTEXT:
[No celestial target is being queried. Do NOT introduce or force unprompted star facts (such as Betelgeuse or Orion) into your response.]
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

    # Retrieve relevant official RAG documentation passages
    rag_passages = search_spherex_rag(str(message), top_k=2) if message else []
    rag_section = ""
    if rag_passages:
        rag_section = "\nVERIFIED RETRIEVED NASA SPHEREx DOCUMENTATION (Official Caltech/IPAC & JPL Missions):\n"
        for r in rag_passages:
            rag_section += f"- Source: {r['title']} ({r['source_url']})\n  Passage: {r['passage']}\n"

    return f"""You are Astro AI, an inspiring, friendly, natural conversational astronomy assistant and celestial guide for AstroLens X, an educational web platform built for the NASA Space Apps Challenge and powered by NASA's SPHEREx mission.

{target_section}
{context_section}
{rag_section}
CORE CONVERSATIONAL & LEARNING GUIDELINES:
1. CONVERSATIONAL ADAPTABILITY & GREETINGS:
   - For greetings (e.g. 'hi', 'hiiii', 'hello', 'hey', 'good morning'), reply with a short, friendly, enthusiastic greeting in 1-2 sentences (e.g. "Hey there! 👋 I'm Astro, your cosmic guide. How's your day going? Want to explore the stars or check out NASA's SPHEREx infrared data?").
   - NEVER dump unprompted astronomy lectures or star facts when the user is just saying hello or asking casual questions.
   - For casual conversation ("how are you", "who are you", "thank you"), be warm, witty, and natural.
   - For astronomy questions, default to 1–3 clear, engaging sentences for simple questions. Provide deeper detail only when the user asks for in-depth analysis.

2. TARGET RELEVANCE:
   - Only discuss the celestial target (e.g. Betelgeuse, Sirius, etc.) IF the user specifically asks about it or refers to "this star" / "this object".
   - If the user asks a general question (e.g. "what is SPHEREx", "how do telescopes work"), do NOT pivot to Betelgeuse.

3. MULTILINGUAL SUPPORT (TAMIL):
   - If the user asks in Tamil (தமிழ்) or requests a Tamil explanation (e.g. "explain in Tamil", "தமிழில் சொல்லுங்கள்"), respond naturally and fluently in authentic Tamil with accurate astronomical terms.

4. EXPLAIN FOR LEARNERS:
   - Use vivid real-world analogies (infrared light as heat-vision goggles, cosmic dust like smoke scattering blue light, the blink comparator like a cosmic motion flipbook).
   - If asked "Can you explain this like I'm 10?", use playful metaphors (space blankets, warm cookies, glowing campfires).
   - If asked "quiz me", provide a fun 3-option multiple choice question (A, B, C) and await their answer.

5. STRICT SCIENTIFIC INTEGRITY & OBSERVATION GUARDRAILS:
   - OBSERVATION COMPARISONS: When the user asks "What changed between these observations?":
     * Consult the verified telemetry above.
     * If the observations are from the same epoch or single pass, or for distant stationary stars: EXPLICITLY state that the two exposures share the same spectral band and show NO confirmed physical movement or physical transformation; slight brightness variations are due to detector sampling, PSF, or calibration noise, not moving objects.
     * Only confirm proper motion if the object is verified high proper motion (like Barnard's Star at 10.36″/year or WISE 0855) across verified multi-epoch dates. NEVER invent moving objects, hypothetical planets, or collision events based on brightness differences alone!
   - NO FABRICATED DISCOVERIES: Planet Nine is an unconfirmed hypothesis. Never claim it has been found.
   - SPHEREx LEVEL-2 REALITY: SPHEREx data are calibrated spectrophotometric flux measurements in mega-Janskys per steradian (MJy/sr) with 6.155″/pixel scale, not public outreach visible-color photos.
   - VISUAL BOUNDARY: You do not have raw pixel computer vision; ground all statements in verified metadata.

6. FORMATTING:
   - Keep answers clear and conversational.
   - If citing official SPHEREx science or data archives, cite the official source (such as NASA/JPL or Caltech/IPAC IRSA).
   - At the very end of your response, output exactly 2 or 3 suggested follow-up questions formatted on their own lines starting with `FOLLOW_UP: ` (e.g. `FOLLOW_UP: What are the 102 spectral bands of SPHEREx?`).
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
    Invokes the Anthropic Messages API asynchronously with structured system prompt and history.
    Captures specific Anthropic exceptions (auth, rate-limit, timeout, bad request).
    """
    if not HAS_ANTHROPIC:
        return {"error_type": "no_sdk", "error_message": "HTTP client not available."}

    system_prompt = _build_claude_system_prompt(message, target, context)

    # Format history into alternating user/assistant turns (bounded to last 8 turns)
    formatted_messages: List[Dict[str, str]] = []
    if history:
        for m in history[-8:]:
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

    headers = {
        "x-api-key": clean_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    if is_user_token:
        headers["authorization"] = f"Bearer {clean_key}"

    payload = {
        "model": model_name,
        "max_tokens": 700,
        "system": system_prompt,
        "messages": formatted_messages,
    }

    logger.info("Calling Claude API endpoint https://api.anthropic.com/v1/messages with model %s", model_name)

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=payload,
            )

            # If initial user token returned 401, retry without Bearer header
            if resp.status_code == 401 and is_user_token:
                logger.info("Retrying with alternate Anthropic auth header mode...")
                headers_alt = {
                    "x-api-key": clean_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                }
                resp = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers=headers_alt,
                    json=payload,
                )

            if resp.status_code == 200:
                data = resp.json()
                content = data.get("content", [])
                if content and len(content) > 0:
                    raw_text = content[0].get("text", "")
                    clean_text, follow_ups = _parse_follow_ups(raw_text)
                    return {
                        "success": True,
                        "text": clean_text,
                        "follow_ups": follow_ups,
                        "model": data.get("model", model_name),
                    }
                return {"error_type": "empty_response", "error_message": "Anthropic returned an empty response."}

            if resp.status_code in (401, 403):
                return {
                    "error_type": "auth",
                    "error_message": "Invalid Anthropic API key. To enable live Claude responses, configure a valid key in backend/.env.",
                }
            if resp.status_code == 429:
                return {
                    "error_type": "rate_limit",
                    "error_message": "Anthropic API rate limit reached. Please wait a moment.",
                }
            if resp.status_code == 400:
                error_detail = resp.text
                try:
                    error_detail = resp.json().get("error", {}).get("message", resp.text)
                except Exception:
                    pass
                return {
                    "error_type": "bad_request",
                    "error_message": f"Anthropic request error: {error_detail}",
                }
            return {
                "error_type": "api_error",
                "error_message": f"Anthropic API returned status {resp.status_code}: {resp.text}",
            }

    except httpx.TimeoutException:
        logger.warning("Anthropic API request timed out (15s limit).")
        return {
            "error_type": "timeout",
            "error_message": "Anthropic API request timed out (15s limit).",
        }
    except Exception as e:
        logger.warning(f"Anthropic connection error: {e}")
        return {
            "error_type": "connection",
            "error_message": f"Anthropic API connection notice: {str(e)[:180]}",
        }


def generate_fallback_response(
    message: str,
    target_id: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None,
    history: Optional[List[ChatMessage]] = None,
) -> ChatResponse:
    """
    Intelligent astronomical reasoning engine and local fallback.
    Produces scientifically rigorous, engaging educational responses with intent awareness.
    """
    target = _match_target(message, target_id)
    lower = message.strip().lower()

    # 0. Conversation History Recall (e.g. "What was my previous question?", "What did I ask before?")
    if any(k in lower for k in ["previous question", "last question", "what did i ask", "asked before", "what was my last"]):
        prev_user_msgs = []
        if history:
            for h in history:
                if h.role == "user" and h.content.strip():
                    prev_user_msgs.append(h.content.strip())
        # If current query is the last one in history, exclude it
        if prev_user_msgs and prev_user_msgs[-1].lower() == message.strip().lower():
            prev_user_msgs.pop()

        if prev_user_msgs:
            last_q = prev_user_msgs[-1]
            return ChatResponse(
                text=(
                    f"Your previous question was:\n\n"
                    f'> *"{last_q}"*\n\n'
                    f"We were exploring that topic together! Would you like to dive deeper into it or ask a new astronomy question?"
                ),
                band="SPHEREx Conversational Session State",
                source="Astro AI • Memory Synchronized",
                suggestions=[
                    Suggestion(label="Explore More", action="explore"),
                    Suggestion(label="Ask New Question", action="explore"),
                ],
                follow_up_questions=[
                    "Can you quiz me?",
                    "What is SPHEREx?",
                ],
                model="astro-conversational-engine-v2",
            )
        else:
            return ChatResponse(
                text=(
                    "This is the beginning of our chat session! You haven't asked a previous question yet. "
                    "What cosmic mystery would you like to explore?"
                ),
                band="SPHEREx Conversational Session State",
                source="Astro AI • Memory Synchronized",
                suggestions=[
                    Suggestion(label="Explore the Sky", action="explore"),
                    Suggestion(label="What is SPHEREx?", action="explore"),
                ],
                follow_up_questions=[
                    "What is Betelgeuse?",
                    "What is SPHEREx?",
                ],
                model="astro-conversational-engine-v2",
            )

    # 1. Greetings (e.g. "hi", "hiiii", "hello", "hey")
    if _is_greeting(lower):
        return ChatResponse(
            text=(
                "Heyyy! 👋 I'm Astro, your cosmic guide. How's it going? "
                "Want to explore the stars, check out NASA SPHEREx infrared data, or just chat about space?"
            ),
            band="SPHEREx Mission Comm Link",
            source="Astro AI • Ready to Explore",
            suggestions=[
                Suggestion(label="What is SPHEREx?", action="explore"),
                Suggestion(label="Explore the Night Sky", action="explore"),
                Suggestion(label="Can you quiz me?", action="quiz"),
            ],
            follow_up_questions=[
                "What is SPHEREx?",
                "What does infrared light look like?",
                "Can you explain how stars are born?",
            ],
            model="astro-conversational-engine-v2",
        )

    # 2. Casual Chat ("how are you", "who are you", "thank you", etc.)
    if _is_casual(lower):
        if "how are you" in lower or "how's it going" in lower or "hows it going" in lower:
            return ChatResponse(
                text="I'm doing stellar! 🚀 Floating through cosmic data streams and ready to explore the infrared universe with you. What's on your mind today?",
                band="SPHEREx Telemetry Active",
                source="Astro AI • Conversational Mode",
                suggestions=[
                    Suggestion(label="Explore the Night Sky", action="explore"),
                    Suggestion(label="Learn Space Discoveries", action="learn"),
                ],
                follow_up_questions=[
                    "What is NASA SPHEREx?",
                    "Why is the infrared sky colorful?",
                    "Can you quiz me?",
                ],
                model="astro-conversational-engine-v2",
            )
        if "who are you" in lower or "what are you" in lower or "who made you" in lower or "what can you do" in lower:
            return ChatResponse(
                text="I'm Astro, your AI astronomy guide for AstroLens X! 🌌 I connect you directly with NASA's SPHEREx mission data, help you explore stars and galaxies across 102 infrared channels, and explain cosmic mysteries in plain English or Tamil.",
                band="SPHEREx Mission Architecture",
                source="Astro AI • Conversational Mode",
                suggestions=[
                    Suggestion(label="What is SPHEREx?", action="explore"),
                    Suggestion(label="Show in Sky Explorer", action="explore"),
                ],
                follow_up_questions=[
                    "What are the 102 spectral bands of SPHEREx?",
                    "How does infrared vision work?",
                    "Can you quiz me about astronomy?",
                ],
                model="astro-conversational-engine-v2",
            )
        if "thank" in lower or "thanks" in lower:
            return ChatResponse(
                text="You're very welcome! 🌟 Exploring the cosmos is always more exciting together. Let me know if you want to inspect more stars or test your astronomy knowledge!",
                band="SPHEREx Comm Channel",
                source="Astro AI • Conversational Mode",
                suggestions=[
                    Suggestion(label="Take an Astronomy Quiz", action="quiz"),
                    Suggestion(label="Explore the Sky", action="explore"),
                ],
                follow_up_questions=[
                    "Can you quiz me about this object?",
                    "What is SPHEREx?",
                ],
                model="astro-conversational-engine-v2",
            )
        # General casual reply
        return ChatResponse(
            text="Glad you're here! 🚀 Whether you're curious about red supergiants, distant galaxies, or NASA's SPHEREx all-sky survey, I'm here to explore with you. What would you like to discover?",
            band="SPHEREx Comm Link",
            source="Astro AI • Conversational Mode",
            suggestions=[
                Suggestion(label="Explore the Night Sky", action="explore"),
                Suggestion(label="What is SPHEREx?", action="explore"),
            ],
            follow_up_questions=[
                "What is SPHEREx?",
                "Why do stars look different in infrared?",
            ],
            model="astro-conversational-engine-v2",
        )

    # 3. Tamil Language Request (தமிழ்)
    if _is_tamil(lower):
        if any(k in lower for k in ["andromeda", "m31", "messier 31", "galaxy", "திரள்"]) or "ஆண்ட்ரோமிடா" in message:
            text = (
                "வணக்கம்! 🌟 **ஆண்ட்ரோமிடா விண்மீன் திரள் (Andromeda Galaxy / Messier 31)** பற்றிய முக்கிய தகவல்கள்:\n\n"
                "1. **அமைவிடம் & தொலைவு**: ஆண்ட்ரோமிடா என்பது நமது பால்வீதிக்கு (Milky Way) மிக அருகில் உள்ள மாபெரும் சுழல் விண்மீன் திரள் (Spiral Galaxy) ஆகும். இது பூமியிலிருந்து சுமார் 2.5 மில்லியன் ஒளி ஆண்டுகள் (Light-Years) தொலைவில் உள்ளது.\n"
                "2. **விண்மீன்கள் எண்ணிக்கை**: இதில் சுமார் 1 டிரில்லியனுக்கும் (1,000,000,000,000) அதிகமான நட்சத்திரங்கள் உள்ளன.\n"
                "3. **எதிர்கால இணைப்பு**: சுமார் 4.5 பில்லியன் ஆண்டுகளில் நமது பால்வீதியும் ஆண்ட்ரோமிடாவும் ஈர்ப்பு விசையால் மோதி இணைந்து 'மில்கோமெடா' (Milkomeda) என்ற புதிய பிரம்மாண்ட விண்மீன் திரளாக மாறும்!\n"
                "4. **நாசாவின் SPHEREx ஆய்வு**: நாசாவின் SPHEREx தொலைநோக்கி ஆண்ட்ரோமிடாவின் விண்மீன் உருவாக்கப் பகுதிகள் மற்றும் விண்மீன் தூசிகளை 102 அகச்சிவப்பு (Infrared) அலைவரிசைகளில் விரிவாக ஆராய்கிறது."
            )
            card = TargetCard(
                title="Andromeda Galaxy (M31)",
                subtitle="ஆண்ட்ரோமிடா விண்மீன் திரள்",
                image_url="https://images-assets.nasa.gov/image/PIA04921/PIA04921~thumb.jpg",
                metric_label="தொலைவு (DISTANCE)",
                metric_value="2.5M Light-Years",
            )
        elif target:
            name = target["name"]
            text = (
                f"வணக்கம்! 🌟 {name} என்பது நமது விண்வெளியில் மிகவும் புகழ்பெற்ற விண்மீன் பொருளாகும் ({target['type']}). "
                f"இது பூமியிலிருந்து சுமார் {target['distance']} தொலைவில் அமைந்துள்ளது. "
                f"நாசாவின் SPHEREx அகச்சிவப்பு (Infrared) தொலைநோக்கி இதன் வெப்பம் மற்றும் விண்மீன் தூசிகளை 102 அலைவரிசைகளில் ஆராய்கிறது."
            )
            card = TargetCard(
                title=target["title"],
                subtitle=f"தொலைவு: {target['distance']}",
                image_url=target["image_url"],
                metric_label=target["metric_label"],
                metric_value=target["metric_value"],
            )
        elif "வணக்கம்" in message:
            text = "வணக்கம்! 🌟 நான் ஆஸ்ட்ரோ (Astro), உங்கள் விண்வெளி வழிகாட்டி. நாசாவின் SPHEREx தொலைநோக்கி மற்றும் விண்மீன்கள் பற்றி நீங்கள் என்ன தெரிந்து கொள்ள விரும்புகிறீர்கள்?"
            card = None
        else:
            text = (
                "வணக்கம்! 🌟 நாசாவின் SPHEREx (Spectro-Photometer for the History of the Universe) திட்டம் என்பது "
                "முழு வானத்தையும் 102 அகச்சிவப்பு (Infrared) அலைவரிசைகளில் வரைபடமாக்கும் ஒரு நவீன விண்வெளித் திட்டமாகும். "
                "பிரபஞ்சத்தின் தோற்றம், விண்மீன் திரள்களின் உருவாக்கம் மற்றும் கிரகங்களில் உள்ள நீரின் தோற்றத்தை ஆராய இது உதவுகிறது."
            )
            card = None
        return ChatResponse(
            text=text,
            band="SPHEREx Tamil Linguistics Engine",
            source="Astro AI • தமிழ் வழிகாட்டி",
            target_card=card,
            suggestions=[
                Suggestion(label="வானை ஆராயுங்கள் (Explore)", action="explore"),
                Suggestion(label="SPHEREx பற்றி அறிக (Learn)", action="learn"),
            ],
            follow_up_questions=[
                "SPHEREx என்றால் என்ன?",
                "அகச்சிவப்பு ஒளி எவ்வாறு செயல்படுகிறது?",
            ],
            model="astro-multilingual-engine",
        )

    # 4. Stars Observed by NASA / SPHEREx (e.g. "Which stars has NASA SPHEREx recently observed?")
    if any(k in lower for k in [
        "which star", "what star", "stars observed", "stars has nasa",
        "stars did nasa", "targets observed", "objects observed",
        "stars recently observed", "stars does spherex", "stars has spherex",
        "stars observed by"
    ]):
        return ChatResponse(
            text=(
                "NASA's SPHEREx mission is designed as an all-sky spectrophotometric survey that systematically observes millions of stars "
                "across the Milky Way and over 450 million galaxies in 102 infrared wavelength channels (0.75 – 5.0 µm)!\n\n"
                "Key stars and primary calibration targets featured in NASA and AstroLens X telemetry include:\n"
                "• **Betelgeuse (Alpha Orionis)**: The iconic red supergiant in Orion, observed in multi-band infrared to study circumstellar dust shells and mass ejection following the 2019 Great Dimming.\n"
                "• **Barnard's Star (GJ 699)**: The closest single red dwarf (5.96 ly), tracked across multiple epochs for high-precision proper motion (10.36″/year) and kinematic benchmarks.\n"
                "• **WISE 0855 (WISE J085510.83-071442.5)**: The coldest known sub-stellar brown dwarf outside our solar system (-13°C), observed for atmospheric water-ice cloud spectroscopy.\n"
                "• **Sirius & Vega**: Bright A-type spectrophotometric flux standards used to anchor absolute photometric calibration.\n"
                "• **RW Aurigae & R Draconis**: Protoplanetary disk evolution targets and long-period variable pulsating stars.\n\n"
                "Official NASA Reference: [NASA IRSA SPHEREx Mission Documentation](https://irsa.ipac.caltech.edu/Missions/spherex.html)"
            ),
            band="SPHEREx Target Catalog Band 1-6",
            source="Astro AI • SPHEREx Synchronized",
            target_card=TargetCard(
                title="NASA SPHEREx Target Catalog",
                subtitle="Primary Spectrophotometric Targets",
                image_url="https://images-assets.nasa.gov/image/PIA23646/PIA23646~thumb.jpg",
                metric_label="SURVEY SCOPE",
                metric_value="All-Sky (102 Channels)",
            ),
            suggestions=[
                Suggestion(label="Inspect Betelgeuse Telemetry", action="explore"),
                Suggestion(label="Inspect Barnard's Star Motion", action="timemachine"),
                Suggestion(label="Inspect WISE 0855 Brown Dwarf", action="explore"),
            ],
            follow_up_questions=[
                "What is Betelgeuse?",
                "How fast does Barnard's Star move?",
                "Why does SPHEREx use 102 spectral channels?",
            ],
            model="astro-knowledge-engine-v2",
        )

    # 5. Black Holes & High-Energy Astrophysics (e.g. "Explain black holes in simple words")
    if "black hole" in lower or "singularity" in lower or "event horizon" in lower or "sagittarius a*" in lower:
        if any(k in lower for k in ["simple words", "simple", "kid", "like i'm 10", "like im 10", "easy"]):
            text = (
                "A black hole is like the ultimate cosmic trapdoor! 🕳️⭐ It is a place in space where gravity is so strong "
                "that nothing—not even light—can ever escape once it gets too close.\n\n"
                "Here is how it works in simple words:\n"
                "1. **How they form**: When an enormous star runs out of fuel at the end of its life, it collapses inward under its own crushing weight, squeezing all that mass into a tiny point called a **singularity**.\n"
                "2. **The Point of No Return**: The invisible boundary around a black hole is called the **event horizon**. If anything crosses it, it cannot come back out.\n"
                "3. **How NASA Sees Them**: The black hole itself is completely dark, but telescopes like NASA's SPHEREx and Webb detect the super-hot glowing gas, dust, and infrared light swirling into it like water down a drain!"
            )
        else:
            text = (
                "A black hole is an astronomical region of spacetime where gravitational acceleration is so intense that nothing—not even "
                "electromagnetic radiation such as light—can escape from inside its event horizon.\n\n"
                "Stellar-mass black holes form when giant stars collapse at the end of their lifecycle, while supermassive black holes "
                "(millions to billions of solar masses) reside at galactic centers like Sagittarius A* in our Milky Way. "
                "In infrared surveys like NASA's SPHEREx, astronomers study supermassive black holes by measuring the infrared emission "
                "from surrounding heated accretion disks and cosmic infrared background (CIB) fluctuations.\n\n"
                "Official NASA Reference: [NASA JPL SPHEREx Science](https://www.jpl.nasa.gov/press-kits/spherex/mission-overview/science/)"
            )
        return ChatResponse(
            text=text,
            band="High-Energy Astrophysics Infrared Survey",
            source="Astro AI • Astrophysics Guardrail",
            target_card=TargetCard(
                title="Black Hole Astrophysics",
                subtitle="Gravitational Singularity & Event Horizon",
                image_url="https://images-assets.nasa.gov/image/PIA23646/PIA23646~thumb.jpg",
                metric_label="ESCAPE VELOCITY",
                metric_value="> Speed of Light (c)",
            ),
            suggestions=[
                Suggestion(label="Explore the Sky", action="explore"),
                Suggestion(label="Learn Space Discoveries", action="learn"),
                Suggestion(label="Can you quiz me?", action="quiz"),
            ],
            follow_up_questions=[
                "What is an event horizon?",
                "Can anything escape a black hole?",
                "How does SPHEREx observe black holes?",
            ],
            model="astro-knowledge-engine-v2",
        )

    # 6. Planet X / Planet Nine / Fake Planet Guardrail
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

    # 5. Quiz Request
    if "quiz" in lower:
        quiz_text = (
            target["quiz_question"]
            if target and "quiz_question" in target
            else (
                "🌟 Astronomy Quiz: NASA SPHEREx Mission\n\n"
                "How many individual infrared wavelength channels does NASA's SPHEREx telescope map across the entire sky?\n\n"
                "A) 3 optical bands (Red, Green, Blue)\n"
                "B) 102 contiguous spectrophotometric bands (0.75 – 5.0 µm)\n"
                "C) 1,000 ultraviolet bands\n\n"
                "Type your answer: A, B, or C!"
            )
        )
        return ChatResponse(
            text=quiz_text,
            band="SPHEREx Interactive Learning Matrix",
            source="Astro AI • Astrophysics Quiz",
            target_card=TargetCard(
                title=target["title"] if target else "NASA SPHEREx 102 Channels",
                subtitle=f"Astrophysics Quiz: {target['name']}" if target else "All-Sky Spectrophotometry",
                image_url=target["image_url"] if target else "https://images-assets.nasa.gov/image/PIA23646/PIA23646~thumb.jpg",
                metric_label="CHALLENGE TYPE",
                metric_value="Multiple Choice",
            ),
            suggestions=[
                Suggestion(label="Option A", action="quiz_a"),
                Suggestion(label="Option B", action="quiz_b"),
                Suggestion(label="Option C", action="quiz_c"),
            ],
            follow_up_questions=[
                "Why does SPHEREx use 102 spectral channels?",
                "What is infrared light in simple words?",
                "Can you explain this like I'm 10?",
            ],
            model="astro-knowledge-engine-v2",
        )

    # 6. "Explain like I'm 10" / Kid-Friendly Analogy
    if "like i'm 10" in lower or "like im 10" in lower or "simple words" in lower or "kid" in lower or "easy" in lower:
        name = target["name"] if target else "a distant star"
        return ChatResponse(
            text=(
                f"Imagine you are playing hide-and-seek in a pitch-dark room, but you have superpowers! 🦸‍♂️\n\n"
                f"Your normal eyes can only see visible light—like the flashlight beam. But cosmic space is full of giant, dusty "
                f"'space blankets' of smoke that block normal light. That's where NASA’s SPHEREx telescope comes in! It wears "
                f"special **infrared heat-vision goggles**.\n\n"
                f"Instead of looking for light, SPHEREx detects **warmth**. Even cold objects like brown dwarfs or warm dust around "
                f"{name} glow like warm cookies straight out of the oven! That is how astronomers see right through dark space clouds!"
            ),
            band="Cosmic Heat-Vision Mode",
            source="Astro AI • Kid-Friendly Science",
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

    # 7. What changed between these observations? / Sky Time Machine
    if _is_comparison(lower):
        bands = context.get("bands", "SPHEREx Calibration Band") if context else "SPHEREx Multi-Band"
        delta_days = context.get("span_days") if context else None
        repeat = context.get("repeat_coverage_found") if context else False

        if target and target["name"] == "Barnard's Star":
            text = (
                "In our Sky Time Machine, you are observing Barnard's Star—famous for having the highest known proper motion "
                "of any star in Earth's sky (10.36 arcseconds per year)!\n\n"
                "When you toggle the blink comparator between multi-epoch exposures, Barnard's Star noticeably shifts its physical "
                "coordinates across the detector relative to static distant background stars. This demonstrates real stellar kinematic motion through space!"
            )
        elif repeat and delta_days:
            text = (
                f"In our Sky Time Machine, these two observations were taken approximately {delta_days:.1f} days apart in spectral band {bands}.\n\n"
                "Based on verified NASA SPHEREx astrometric telemetry, distant stars show **no confirmed physical displacement or proper motion** "
                "over this time baseline. Any slight pixel brightness or edge differences between the two frames are due to detector Point Spread "
                "Function (PSF) sampling and calibration noise—NOT moving planets or physical alterations."
            )
        else:
            text = (
                f"Based on verified NASA SPHEREx observation telemetry for this coordinate ({bands}), both frames share calibrated Level-2 baseline data.\n\n"
                "Astronomers look for two genuine phenomena over time: **Proper Motion** (nearby stars physically shifting across the detector) "
                "and **Stellar Variability** (stars pulsating in temperature and radius). These exposures show **no physical displacement**; "
                "any visual pixel differences between views reflect display contrast or interpolation filtering (Nearest-Neighbor vs. Bilinear)."
            )

        return ChatResponse(
            text=text,
            band="Temporal Multi-Epoch Analysis",
            source="Astro AI • SPHEREx Synchronized",
            target_card=TargetCard(
                title="Astrometric Co-Registration",
                subtitle="Multi-Epoch Comparison",
                image_url="https://images-assets.nasa.gov/image/PIA22334/PIA22334~thumb.jpg",
                metric_label="OBSERVATION DELTA",
                metric_value=f"{delta_days:.1f} Days" if delta_days else "Verified Baseline",
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

    # 8. Proper Motion / Why Space Changes Over Time
    if "proper motion" in lower or "why does space change" in lower or "change over time" in lower:
        return ChatResponse(
            text=(
                "Space looks calm to our eyes, but the universe is continuously in motion! Astronomers look for two key physical phenomena:\n\n"
                "1. **Proper Motion**: Nearby stars race across our field of view. Barnard's Star, for example, moves at 10.36 arcseconds "
                "per year—meaning when comparing NASA observations taken just a few years apart with a blink comparator, its shift "
                "against distant background stars is unmistakably visible!\n\n"
                "2. **Stellar Variability**: Variable stars (like Betelgeuse or Mira variables) fluctuate in physical radius and surface "
                "temperature, causing their infrared brightness to rise and fall."
            ),
            band="Kinematic Astrometry & Proper Motion",
            source="Astro AI • SPHEREx Synchronized",
            target_card=TargetCard(
                title="Stellar Proper Motion",
                subtitle="Cosmic Kinematics",
                image_url="https://images-assets.nasa.gov/image/PIA22334/PIA22334~thumb.jpg",
                metric_label="RECORD HOLDER",
                metric_value="10.36″ / year (Barnard's Star)",
            ),
            suggestions=[
                Suggestion(label="Inspect Barnard's Star", action="explore"),
                Suggestion(label="Open Sky Time Machine", action="timemachine"),
            ],
            follow_up_questions=[
                "How does the blink comparator work?",
                "How fast is Barnard's Star moving?",
                "Why do variable stars pulse?",
            ],
            model="astro-knowledge-engine-v2",
        )

    # 9. Target-Specific Match (when user explicitly asks about the target, e.g. Betelgeuse, distance, infrared radiance)
    if target:
        name = target["name"]
        # Great Dimming check for Betelgeuse
        if name == "Betelgeuse" and ("dimming" in lower or "dim" in lower or "supernova" in lower or "explode" in lower):
            text = (
                f"{target['dimming_fact']}\n\n"
                "Astronomers confirm that Betelgeuse will eventually end its life as a spectacular Type II supernova, "
                "lighting up Earth's night sky as bright as the full Moon! However, astrophysics calculations show this will "
                "likely occur anytime within the next 100,000 years, so there is no immediate danger to Earth."
            )
        else:
            text = (
                f"{target['core_explanation']}\n\n"
                f"In NASA SPHEREx multi-band telemetry, {name} is observed across multiple epochs to quantify infrared spectral "
                f"energy distributions (SEDs). Whether tracking interstellar dust chemistry, stellar pulsation, or proper motion shifts, "
                f"these observations provide astrophysicists with direct empirical constraints on celestial physics."
            )

        return ChatResponse(
            text=text,
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

    # 10. Infrared Light / Seeing Through Cosmic Dust (Generic)
    if "infrared" in lower or "dust" in lower or "heat" in lower or "wavelength" in lower:
        return ChatResponse(
            text=(
                "Visible starlight has very short wavelengths (~0.4 to 0.7 µm) that collide directly with interstellar dust grains, "
                "scattering the light away and creating dark silhouette clouds in optical telescopes.\n\n"
                "Infrared light, by contrast, has longer wavelengths (0.75 to 5.0 µm in SPHEREx's detectors). These longer heat waves "
                "slip smoothly around sub-micron dust particles without scattering! This allows SPHEREx to peer directly into opaque stellar "
                "nurseries, uncover baby stars forming inside dense molecular cores, and detect the thermal glow of cool objects."
            ),
            band="SPHEREx Band 0.75 – 5.0 µm",
            source="Astro AI • SPHEREx Synchronized",
            target_card=TargetCard(
                title="Infrared Wavelength Penetration",
                subtitle="Scattering vs Absorption Physics",
                image_url="https://images-assets.nasa.gov/image/PIA14445/PIA14445~thumb.jpg",
                metric_label="SPECTRAL RANGE",
                metric_value="0.75 – 5.0 µm",
            ),
            suggestions=[
                Suggestion(label="Explore Infrared Targets", action="explore"),
                Suggestion(label="What is SPHEREx?", action="explore"),
                Suggestion(label="Learn How Space Changes", action="learn"),
            ],
            follow_up_questions=[
                "Why can infrared light pass through cosmic dust?",
                "What are the 102 spectral bands of SPHEREx?",
                "Can you quiz me about this object?",
            ],
            model="astro-knowledge-engine-v2",
        )

    # 11. SPHEREx Mission / 102 Bands / RAG Knowledge Integration
    rag_matches = search_spherex_rag(message, top_k=2)
    if "spherex" in lower or "spectrophotometry" in lower or "102 band" in lower or "inflation" in lower or "ice" in lower or "ebl" in lower:
        if rag_matches:
            top_passage = rag_matches[0]["passage"]
            top_url = rag_matches[0]["source_url"]
            top_title = rag_matches[0]["title"]
            text = (
                f"{top_passage}\n\n"
                f"Official NASA/IPAC Reference: [{top_title}]({top_url})"
            )
        else:
            text = (
                "NASA's SPHEREx (Spectro-Photometer for the History of the Universe, Epoch of Reionization, and Ices Explorer) "
                "is an all-sky near-infrared space observatory. It maps the entire sky four times over a two-year mission across "
                "102 individual spectrophotometric bands between 0.75 and 5.0 µm.\n\n"
                "SPHEREx answers three grand questions in astrophysics: 1) What drove cosmic inflation after the Big Bang? "
                "2) How did water and biogenic ices form in planetary nurseries? and 3) What is the total history of galaxy light "
                "throughout cosmic time?\n\n"
                "Official Reference: [NASA IRSA SPHEREx Missions](https://irsa.ipac.caltech.edu/Missions/spherex.html)"
            )
        return ChatResponse(
            text=text,
            band="SPHEREx 102 Channels (0.75 – 5.0 µm)",
            source="Astro AI • NASA IRSA Grounded",
            target_card=TargetCard(
                title="NASA SPHEREx Observatory",
                subtitle="102-Band Spectrophotometer",
                image_url="https://images-assets.nasa.gov/image/PIA23646/PIA23646~thumb.jpg",
                metric_label="SPECTRAL CHANNELS",
                metric_value="102 Infrared Bands",
            ),
            suggestions=[
                Suggestion(label="Explore the Sky", action="explore"),
                Suggestion(label="Compare Epochs in Time Machine", action="timemachine"),
                Suggestion(label="Learn Space Discoveries", action="learn"),
            ],
            follow_up_questions=[
                "What are the three science pillars of SPHEREx?",
                "How does SPHEREx detect interstellar water ice?",
                "What is cosmic inflation?",
            ],
            model="astro-knowledge-engine-v2",
        )

    # 12. SPHEREx Pixelation / Image Resolution / 6.155 arcsec
    if "pixel" in lower or "blurry" in lower or "resolution" in lower or "arcsec" in lower or "fits" in lower or "wcs" in lower:
        return ChatResponse(
            text=(
                "Great observation! SPHEREx is an all-sky surveyor designed to map the entire celestial sphere four times over, "
                "rather than taking narrow, high-magnification portraits like Hubble or Webb.\n\n"
                "Its wide-field telescope has a 20 cm aperture with a native pixel scale of 6.155 arcseconds per pixel. Each pixel "
                "in our viewer is not an aesthetic graphic, but a calibrated scientific measurement of sky surface brightness in "
                "mega-Janskys per steradian (MJy/sr). In AstroLens X, you can toggle between 'Nearest Neighbor' to inspect raw "
                "science pixels and 'Bilinear' for smooth educational display!\n\n"
                "Official Reference: [NASA IRSA SPHEREx Archive](https://irsa.ipac.caltech.edu/spherex-archive-documentation/)"
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
            Suggestion(label="Compare Epochs in Time Machine", action="timemachine"),
            Suggestion(label="Learn Space Discoveries", action="learn"),
        ],
        follow_up_questions=[
            "What is SPHEREx?",
            "Why does space change over time?",
            "Can you quiz me about astronomy?",
        ],
        model="astro-knowledge-engine-v2",
    )


async def generate_ai_chat_response(req: ChatRequest) -> ChatResponse:
    """
    Primary handler for POST /api/ai/chat.
    Tries official Anthropic Claude API if configured with API key.
    Seamlessly falls back to local astronomical reasoning engine if key is absent or on network errors.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        try:
            from dotenv import dotenv_values
            env_file = Path(__file__).resolve().parent.parent / ".env"
            if env_file.exists():
                vals = dotenv_values(env_file)
                api_key = (vals.get("ANTHROPIC_API_KEY") or "").strip()
        except Exception:
            pass
    claude_model = os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-latest")

    # Validate and sanitize context against backend reference catalog
    validated_context = _validate_context(req.target_id, req.context)
    target = _match_target(req.message, req.target_id)

    # If greeting or casual chat, decouple target so it doesn't force unprompted star info
    if _is_greeting(req.message) or _is_casual(req.message):
        target = None

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
        fallback = generate_fallback_response(req.message, req.target_id, validated_context, history=req.history)
        fallback.notice = err_msg
        fallback.source = f"Astro AI • Verified Offline Engine ({claude_result.get('error_type', 'offline')})"
        return fallback

    # Seamless fallback to intelligent local reasoning engine
    return generate_fallback_response(req.message, req.target_id, validated_context, history=req.history)
