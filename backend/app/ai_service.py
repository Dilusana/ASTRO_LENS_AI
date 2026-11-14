"""
AstroLens X - AI Chat Service
Provides friendly, beginner-to-undergrad astronomy explanations grounded in real
NASA SPHEREx mission data, astrophysics, and verified catalog parameters.
Supports Gemini API when GEMINI_API_KEY is configured in the environment,
with an intelligent built-in astronomical reasoning engine fallback.
"""
from __future__ import annotations

import os
import re
from typing import Any, Dict, List, Optional
import httpx
from pydantic import BaseModel, Field


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
    message: str = Field(..., min_length=1, max_length=1000)
    target_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    text: str
    band: str = "SPHEREx Calibration Level 2"
    source: str = "Astro AI • SPHEREx Synchronized"
    target_card: Optional[TargetCard] = None
    suggestions: List[Suggestion] = []
    follow_up_questions: List[str] = []


# ── Curated Astronomical Knowledge Base ──────────────────────────────────────────

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
    },
}


def _match_target(text: str, target_id: Optional[str]) -> Optional[Dict[str, Any]]:
    """Identifies the celestial object referenced in the question or context."""
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


async def _call_gemini_api(api_key: str, message: str, context: Optional[Dict[str, Any]]) -> Optional[str]:
    """Optional external call to Google Gemini API when configured."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    system_prompt = (
        "You are Astro AI, a friendly, encouraging celestial guide and astrophysics educator for AstroLens X, "
        "an application powered by NASA SPHEREx mission observations. "
        "Explain science simply for students (Grade 5 to undergraduate astrophysics). "
        "Distinguish confirmed astronomical facts from scientific uncertainty. "
        "Never hallucinate or invent fake planets, moving objects, or false transient discoveries. "
        "If asked about Planet Nine / Planet X, explain that it remains a mathematical hypothesis based on Kuiper Belt "
        "orbital clustering, and SPHEREx will provide stringent infrared constraints. "
        "Ground your answers in real NASA infrared astrophysics and keep your response under 250 words."
    )
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": f"System Guidelines: {system_prompt}\nContext: {context or {}}\n\nUser Question: {message}"}
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 450,
        },
    }
    try:
        timeout = httpx.Timeout(connect=2.5, read=5.0, write=2.5, pool=2.5)
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        return parts[0]["text"].strip()
    except Exception:
        pass
    return None


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
        )

    # 2. Great Dimming of Betelgeuse
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
        )

    # 3. Target-Specific Inquiries (e.g. "Why does Betelgeuse look so bright in infrared?")
    if target and ("betelgeuse" in lower or target_id == "betelgeuse") and ("bright" in lower or "infrared" in lower):
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
                "How does SPHEREx observe cosmic dust?",
            ],
        )

    # 4. Target distance inquiries
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
                "Why does space change over time?",
            ],
        )

    # 3. Why does space change / Proper Motion / Blinking
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
                "Why do multi-epoch images need astrometric registration?",
            ],
        )

    # 4. Infrared vs Visible Light / What is Infrared?
    if "infrared" in lower or "heat" in lower or "simple words" in lower or "12" in lower or "spectrum" in lower:
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
                "What is a brown dwarf?",
            ],
        )

    # 5. SPHEREx Pixelation / Image Resolution / 6.155 arcsec
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
                "Why does SPHEREx use 102 spectral channels?",
            ],
        )

    # 6. Specific Target Match
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
                "Why does space change over time?",
            ],
        )

    # 7. General Astronomy / Cosmic Explorer Query
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
            "Can you explain infrared light in simple words?",
        ],
    )


async def generate_ai_chat_response(req: ChatRequest) -> ChatResponse:
    """
    Main entry point for generating AI chat responses.
    Attempts external LLM API if key is present, otherwise falls back to verified reasoning engine.
    """
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if api_key:
        llm_text = await _call_gemini_api(api_key, req.message, req.context)
        if llm_text:
            target = _match_target(req.message, req.target_id)
            card = None
            if target:
                card = TargetCard(
                    title=target["title"],
                    subtitle=f"Distance: {target['distance']}",
                    image_url=target["image_url"],
                    metric_label=target["metric_label"],
                    metric_value=target["metric_value"],
                )
            return ChatResponse(
                text=llm_text,
                band=target["band"] if target else "SPHEREx Calibration Level 2",
                source="Astro AI • Gemini Powered",
                target_card=card,
                suggestions=[
                    Suggestion(label="Show in Sky Explorer", action="explore"),
                    Suggestion(label="Compare observations over time", action="timemachine"),
                    Suggestion(label="Learn Space Discoveries", action="learn"),
                ],
                follow_up_questions=[
                    "Why does space change over time?",
                    "What is infrared light in simple words?",
                    "How do astronomers measure cosmic distances?",
                ],
            )

    return generate_fallback_response(req.message, req.target_id, req.context)
