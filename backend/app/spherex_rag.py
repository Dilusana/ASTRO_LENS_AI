"""
AstroLens X - NASA SPHEREx Curated Knowledge Base (RAG)
Provides verified, factual retrieval-augmented generation passages sourced from
official NASA, JPL, and Caltech/IPAC SPHEREx documentation.

Sources:
- https://irsa.ipac.caltech.edu/Missions/spherex.html
- https://irsa.ipac.caltech.edu/spherex-archive-documentation/
- https://www.jpl.nasa.gov/press-kits/spherex/mission-overview/science/
- https://irsa.ipac.caltech.edu/data/SPHEREx/docs/overview_dr1.html
"""
from __future__ import annotations

import re
import math
from typing import List, Dict, Any

# Curated, refreshable NASA knowledge index
SPHEREX_KNOWLEDGE_INDEX: List[Dict[str, Any]] = [
    {
        "id": "spherex-observed-stars",
        "title": "NASA SPHEREx Observed Stars & Primary Calibration Targets",
        "source_url": "https://irsa.ipac.caltech.edu/Missions/spherex.html",
        "retrieval_date": "2026-11-15",
        "keywords": ["stars", "observed", "recent", "targets", "catalog", "which stars", "stellar", "betelgeuse", "barnard", "sirius", "vega", "wise"],
        "passage": (
            "In NASA's SPHEREx mission archive and the AstroLens X catalog, key verified stellar targets include: "
            "1) Betelgeuse (Alpha Orionis) — a red supergiant in Orion observed for warm circumstellar dust envelopes and mass loss; "
            "2) Barnard's Star (GJ 699) — the fastest moving star in our night sky (10.36″/year) tracked across epochs to measure proper motion; "
            "3) WISE 0855 — the coldest known sub-stellar brown dwarf outside our solar system (~250 K); "
            "4) Sirius (Alpha Canis Majoris) — the brightest star in the night sky, utilized as an infrared photometric flux benchmark; "
            "5) Vega (Alpha Lyrae) — an astrophysics zero-point standard star featuring a warm circumstellar debris disk; "
            "6) RW Aurigae — a young binary system with tidally disrupted protoplanetary disks; and "
            "7) R Draconis — a Mira-type pulsating red giant with a 245-day period shedding silicate dust. "
            "In addition to these benchmark stars, SPHEREx maps over 100 million stars across the entire sky every six months."
        ),
    },
    {
        "id": "astronomy-black-holes",
        "title": "Black Holes & High-Energy Astrophysics in Infrared Surveys",
        "source_url": "https://www.jpl.nasa.gov/press-kits/spherex/mission-overview/science/",
        "retrieval_date": "2026-11-15",
        "keywords": ["black hole", "black holes", "singularity", "event horizon", "accretion", "gravity", "supermassive"],
        "passage": (
            "A black hole is a region of spacetime where matter is packed so densely that gravity prevents anything—even light—from escaping "
            "once it crosses the boundary known as the event horizon. Stellar black holes form when massive stars collapse at the end of their lives, "
            "while supermassive black holes containing millions of solar masses anchor the centers of galaxies. While a black hole itself is invisible, "
            "infrared surveys detect them through the thermal glow of superheated gas and dust spiraling into accretion disks around them."
        ),
    },
    {
        "id": "spherex-overview-mission",
        "title": "NASA IRSA SPHEREx Mission Overview & Spectral Architecture",
        "source_url": "https://irsa.ipac.caltech.edu/Missions/spherex.html",
        "retrieval_date": "2026-11-15",
        "keywords": ["spherex", "mission", "spectrophotometry", "bands", "wavelength", "infrared", "channels", "telescope", "survey"],
        "passage": (
            "SPHEREx (Spectro-Photometer for the History of the Universe, Epoch of Reionization, and Ices Explorer) "
            "is a NASA Medium-Class Explorer (MIDEX) mission designed to perform the first all-sky near-infrared "
            "spectral survey. Operating across 102 contiguous spectral bands spanning 0.75 to 5.0 micrometers (µm) "
            "with resolving power R = λ/Δλ between 35 and 130, SPHEREx maps the entire celestial sphere every six months. "
            "Over its 2-year baseline mission, SPHEREx creates four complete independent all-sky spectrophotometric maps."
        ),
    },
    {
        "id": "spherex-data-products",
        "title": "SPHEREx Archive Data Products, Pixel Scale, & TAN Projection",
        "source_url": "https://irsa.ipac.caltech.edu/spherex-archive-documentation/",
        "retrieval_date": "2026-11-15",
        "keywords": ["archive", "level 2", "fits", "flux", "pixel", "resolution", "scale", "mjy/sr", "arcsecond", "tan", "wcs", "irsa"],
        "passage": (
            "SPHEREx science data products served by NASA's IPAC IRSA archive include calibrated Level-2 spectral images "
            "and all-sky spectral catalogs. The telescope features a 20 cm aperture with a detector plate scale of "
            "6.155 arcseconds per pixel and an optical point-spread function (PSF) of approximately 7.5 arcseconds FWHM. "
            "Pixel flux densities are calibrated in absolute mega-Janskys per steradian (MJy/sr) and astrometrically "
            "registered using standard FITS World Coordinate System (WCS) TAN (gnomonic tangent) projections."
        ),
    },
    {
        "id": "spherex-science-inflation",
        "title": "SPHEREx Science Pillar 1: Cosmic Inflation & Galaxy Clustering",
        "source_url": "https://www.jpl.nasa.gov/press-kits/spherex/mission-overview/science/",
        "retrieval_date": "2026-11-15",
        "keywords": ["inflation", "cosmic", "universe", "big bang", "primordial", "non-gaussianity", "galaxy", "clustering", "redshift"],
        "passage": (
            "SPHEREx probes the physics of cosmic inflation—the rapid exponential expansion of spacetime fractions of a "
            "second after the Big Bang. By surveying over 450 million galaxies and obtaining precise 3D spectroscopic redshifts, "
            "SPHEREx tests primordial non-Gaussianity (fnl parameter) to distinguish between single-field and multi-field "
            "inflation models that generated the original seeds of cosmic structure."
        ),
    },
    {
        "id": "spherex-science-ices",
        "title": "SPHEREx Science Pillar 2: Interstellar Ices & Origins of Planetary Water",
        "source_url": "https://www.jpl.nasa.gov/press-kits/spherex/mission-overview/science/",
        "retrieval_date": "2026-11-15",
        "keywords": ["ice", "water", "organic", "molecules", "interstellar", "planetary", "nurseries", "clouds", "co2", "co", "chemistry"],
        "passage": (
            "SPHEREx investigates the origin of biogenic molecules and water in nascent planetary systems. Within dense "
            "molecular clouds and circumstellar disks, SPHEREx detects absorption features of interstellar ices, including "
            "water (H2O, 3.05 µm), carbon dioxide (CO2, 4.27 µm), carbon monoxide (CO, 4.67 µm), and methanol (CH3OH). "
            "These observations track how essential life-forming volatiles are incorporated into forming planets."
        ),
    },
    {
        "id": "spherex-science-ebl",
        "title": "SPHEREx Science Pillar 3: Extragalactic Background Light & First Stars",
        "source_url": "https://www.jpl.nasa.gov/press-kits/spherex/mission-overview/science/",
        "retrieval_date": "2026-11-15",
        "keywords": ["extragalactic", "background", "ebl", "first stars", "reionization", "galaxy formation", "diffuse", "light"],
        "passage": (
            "SPHEREx measures spatial fluctuations in the diffuse Cosmic Extragalactic Background Light (EBL) across near-infrared "
            "wavelengths. This cumulative cosmic glow encodes the total light output from all stars and galaxies throughout cosmic history, "
            "including the very first Population III stars and proto-galaxies that emerged during the Epoch of Reionization, "
            "as well as intra-halo stars stripped during galactic collisions."
        ),
    },
    {
        "id": "spherex-data-release-dr1",
        "title": "SPHEREx Data Release 1 (DR1) & Multi-Epoch Survey Coverage",
        "source_url": "https://irsa.ipac.caltech.edu/data/SPHEREx/docs/overview_dr1.html",
        "retrieval_date": "2026-11-15",
        "keywords": ["dr1", "release", "survey", "coverage", "multi-epoch", "temporal", "repeat", "observations", "pipeline"],
        "passage": (
            "NASA IPAC SPHEREx Data Release 1 (DR1) provides calibrated spectral coverage across celestial coordinates. "
            "Because SPHEREx executes a sun-synchronous low Earth polar orbit, celestial targets receive repeated coverage "
            "over baseline operational epochs. Multi-epoch observations allow astronomers to track temporal variability, "
            "cross-validate photometric calibration, and verify proper motion of high-velocity nearby stars against "
            "astrometric catalogs like Gaia DR3."
        ),
    },
]


def search_spherex_rag(query: str, top_k: int = 2) -> List[Dict[str, Any]]:
    """
    Retrieves the most relevant verified NASA SPHEREx passages for a given user query
    using keyword matching and term-frequency scoring.
    Returns up to top_k matching entries with title, source_url, and verified passage.
    """
    if not query or not query.strip():
        return []

    # Tokenize and normalize query
    tokens = re.findall(r"\b[a-z0-9_]{3,}\b", query.lower())
    if not tokens:
        return []

    scored_entries = []
    for entry in SPHEREX_KNOWLEDGE_INDEX:
        score = 0.0
        passage_lower = entry["passage"].lower()
        title_lower = entry["title"].lower()
        keywords = set(entry.get("keywords", []))

        # Check full query phrase in keywords
        query_lower = query.lower()
        for kw in keywords:
            if kw in query_lower:
                score += 4.0

        for token in tokens:
            # Keyword exact match
            if token in keywords:
                score += 3.0
            # Title match
            if token in title_lower:
                score += 2.0
            # Passage frequency match
            count = passage_lower.count(token)
            if count > 0:
                score += 1.0 + math.log(1.0 + count)

        if score > 1.5:
            scored_entries.append((score, entry))

    # Sort descending by score
    scored_entries.sort(key=lambda x: x[0], reverse=True)
    return [item[1] for item in scored_entries[:top_k]]
