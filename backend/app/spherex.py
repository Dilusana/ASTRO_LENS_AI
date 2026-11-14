"""Query NASA/IPAC IRSA for published SPHEREx spectral images.

The service is IRSA's IVOA Simple Image Access version 2 endpoint.
Rows are passed through from that response. This module does not invent
observation identifiers, times, instruments, or preview images.
"""

from __future__ import annotations

import csv
import io
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

import httpx

SIA_ENDPOINT = "https://irsa.ipac.caltech.edu/SIA"
# Wide-survey Quick Release 3 is the current public spectral-image collection.
# The deep-survey collection is consulted only when the wide survey returns nothing.
PRIMARY_COLLECTION = "spherex_qr3"
FALLBACK_COLLECTION = "spherex_qr3_deep"
USER_AGENT = "AstroLensX/0.1 (SPHEREx archive client)"
MJD_EPOCH = datetime(1858, 11, 17, tzinfo=timezone.utc)
PREVIEW_NOTE = (
    "IRSA did not publish a JPEG or PNG preview for this product. "
    "The archive file is a FITS spectral image."
)
EPOCH_CAVEAT = (
    "These rows are spectral images whose footprints intersect the search circle. "
    "A SPHEREx frame is several degrees across, and wavelength changes across the detector. "
    "Shared bandpass and separated dates mean repeat coverage of this coordinate in the "
    "returned set. They are not a matched pair of identical pictures."
)
CUTOUT_SIZE_DEG = 0.08


class SpherexError(Exception):
    def __init__(self, message: str, status_code: int = 502) -> None:
        super().__init__(message)
        self.status_code = status_code


def _parse_float(value: str | None) -> float | None:
    if value is None:
        return None
    text = value.strip()
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _parse_int(value: str | None) -> int | None:
    number = _parse_float(value)
    if number is None:
        return None
    return int(number)


def _format_mjd(value: str | None) -> tuple[float | None, str | None]:
    mjd = _parse_float(value)
    if mjd is None:
        return None, None
    moment = MJD_EPOCH + timedelta(days=mjd)
    return mjd, moment.strftime("%Y-%m-%d %H:%M:%S UTC")


def _trusted_fits_url(url: str | None) -> str | None:
    if not url:
        return None
    parsed = urlparse(url.strip())
    if parsed.scheme != "https" or parsed.hostname != "irsa.ipac.caltech.edu":
        return None
    if parsed.query or parsed.fragment:
        return None
    if not parsed.path.startswith("/ibe/data/spherex/") or not parsed.path.endswith(".fits"):
        return None
    return f"https://irsa.ipac.caltech.edu{parsed.path}"


def _cutout_url(access_url: str | None, ra: float, dec: float) -> str | None:
    if not access_url:
        return None
    return f"{access_url}?center={ra:.8f},{dec:.8f}&size={CUTOUT_SIZE_DEG}"


def _blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    text = value.strip()
    return text or None


def _observation(row: dict[str, str], ra: float, dec: float) -> dict:
    start_mjd, start_text = _format_mjd(row.get("t_min"))
    end_mjd, end_text = _format_mjd(row.get("t_max"))
    access_url = _trusted_fits_url(row.get("access_url"))
    min_m = _parse_float(row.get("em_min"))
    max_m = _parse_float(row.get("em_max"))
    return {
        "obs_id": _blank_to_none(row.get("obs_id")),
        "facility_name": _blank_to_none(row.get("facility_name")),
        "instrument_name": _blank_to_none(row.get("instrument_name")),
        "bandpass": _blank_to_none(row.get("energy_bandpassname")),
        "spectral_band": _blank_to_none(row.get("energy_emband")),
        "wavelength_min_um": None if min_m is None else min_m * 1_000_000,
        "wavelength_max_um": None if max_m is None else max_m * 1_000_000,
        "exposure_seconds": _parse_float(row.get("t_exptime")),
        "observation_start": start_text,
        "observation_end": end_text,
        "observation_start_mjd": start_mjd,
        "observation_end_mjd": end_mjd,
        "release_date": _blank_to_none(row.get("obs_release_date")),
        "image_center_ra_deg": _parse_float(row.get("s_ra")),
        "image_center_dec_deg": _parse_float(row.get("s_dec")),
        "pixel_scale_arcsec": _parse_float(row.get("s_pixel_scale")),
        "fov_deg": _parse_float(row.get("s_fov")),
        "calib_level": _parse_int(row.get("calib_level")),
        "proposal_title": _blank_to_none(row.get("proposal_title")),
        "obs_collection": _blank_to_none(row.get("obs_collection")),
        "access_url": access_url,
        "access_format": _blank_to_none(row.get("access_format")),
        "access_estsize_kb": _parse_float(row.get("access_estsize")),
        "cutout_url": _cutout_url(access_url, ra, dec),
        "publisher_did": _blank_to_none(row.get("obs_publisher_did")),
        "preview_image_url": None,
        "fits_preview_url": (
            f"/api/spherex/preview?fits_url={access_url}&ra={ra:.8f}&dec={dec:.8f}"
            if access_url
            else None
        ),
        "preview_note": PREVIEW_NOTE,
    }


def _comparable(observations: list[dict], truncated: bool) -> dict:
    grouped: dict[str, list[dict]] = {}
    for observation in observations:
        band = observation.get("bandpass") or "unspecified bandpass"
        grouped.setdefault(band, []).append(observation)

    bands = []
    for band, items in sorted(grouped.items()):
        mjds = [
            item["observation_start_mjd"]
            for item in items
            if item.get("observation_start_mjd") is not None
        ]
        obs_ids = {item.get("obs_id") for item in items if item.get("obs_id")}
        mjds.sort()
        span_days = (mjds[-1] - mjds[0]) if len(mjds) >= 2 else 0.0
        dated = [item for item in items if item.get("observation_start_mjd") is not None]
        earliest = min(dated, key=lambda item: item["observation_start_mjd"]) if dated else None
        latest = max(dated, key=lambda item: item["observation_start_mjd"]) if dated else None
        bands.append(
            {
                "bandpass": band,
                "image_count": len(items),
                "distinct_obs_ids": len(obs_ids),
                "earliest": None if earliest is None else earliest.get("observation_start"),
                "latest": None if latest is None else latest.get("observation_start"),
                "span_days": round(span_days, 2),
                "repeat_coverage": len(obs_ids) >= 2 and span_days >= 1,
            }
        )

    return {
        "repeat_coverage_found": any(band["repeat_coverage"] for band in bands),
        "uses_truncated_result": truncated,
        "caveat": EPOCH_CAVEAT,
        "bands": bands,
    }


def _public_observation(observation: dict) -> dict:
    hidden = {"observation_start_mjd", "observation_end_mjd"}
    return {key: value for key, value in observation.items() if key not in hidden}


async def _query_collection(
    client: httpx.AsyncClient,
    collection: str,
    ra: float,
    dec: float,
    radius_deg: float,
    max_records: int,
) -> list[dict[str, str]]:
    try:
        response = await client.get(
            SIA_ENDPOINT,
            params={
                "COLLECTION": collection,
                "POS": f"circle {ra:.8f} {dec:.8f} {radius_deg:.8f}",
                "MAXREC": str(max_records),
                "RESPONSEFORMAT": "csv",
            },
        )
    except httpx.TimeoutException as exc:
        raise SpherexError("The IRSA SPHEREx query timed out.", status_code=504) from exc
    except httpx.HTTPError as exc:
        raise SpherexError("The IRSA SPHEREx service could not be reached.") from exc

    if response.status_code != 200:
        snippet = " ".join(response.text[:180].split())
        raise SpherexError(
            f"IRSA returned HTTP {response.status_code} for the SPHEREx search. {snippet}".strip()
        )

    text = response.text.lstrip("\ufeff")
    if not text.strip():
        return []
    first_line = text.splitlines()[0]
    if "obs_id" not in first_line or "access_url" not in first_line:
        snippet = " ".join(text[:180].split())
        raise SpherexError(f"IRSA returned an unexpected SPHEREx payload. {snippet}")

    return list(csv.DictReader(io.StringIO(text)))


async def search_observations(
    ra: float,
    dec: float,
    radius_deg: float,
    max_records: int,
) -> dict:
    timeout = httpx.Timeout(90.0, connect=20.0)
    async with httpx.AsyncClient(timeout=timeout, headers={"User-Agent": USER_AGENT}) as client:
        collections = [PRIMARY_COLLECTION]
        rows = await _query_collection(client, PRIMARY_COLLECTION, ra, dec, radius_deg, max_records)
        collection = PRIMARY_COLLECTION
        if not rows:
            collections.append(FALLBACK_COLLECTION)
            rows = await _query_collection(
                client, FALLBACK_COLLECTION, ra, dec, radius_deg, max_records
            )
            collection = FALLBACK_COLLECTION if rows else PRIMARY_COLLECTION

    observations = [_observation(row, ra, dec) for row in rows]
    observations.sort(
        key=lambda item: (
            item["observation_start_mjd"] is None,
            -(item["observation_start_mjd"] or 0),
        )
    )
    truncated = len(observations) >= max_records
    comparable = _comparable(observations, truncated)
    return {
        "query": {
            "ra_deg": ra,
            "dec_deg": dec,
            "radius_deg": radius_deg,
            "collection": collection,
            "collections_queried": collections,
            "service": "IRSA SIA2",
            "endpoint": SIA_ENDPOINT,
            "max_records": max_records,
        },
        "count": len(observations),
        "truncated": truncated,
        "preview_images_published": False,
        "comparable": comparable,
        "observations": [_public_observation(item) for item in observations],
    }
