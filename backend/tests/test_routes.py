"""
FastAPI route handler tests (Python 3.14 / anyio-safe).
Calls the async route function directly via asyncio.run().
All tests mock search_observations to avoid network calls.
Run with: python -m pytest tests/test_routes.py -v
"""
import sys, os, asyncio
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from unittest.mock import patch
from fastapi import HTTPException

from app.main import spherex_observations, spherex_preview, spherex_preview_meta, spherex_compare, ai_chat
from app.ai_service import ChatRequest
from app.spherex import SpherexError
from app.fits_service import FitsServiceError


# ── shared mock data ───────────────────────────────────────────────────────────

MOCK_RESPONSE = {
    "query": {
        "ra_deg": 10.684583,
        "dec_deg": 41.26875,
        "radius_deg": 0.01,
        "collection": "spherex_qr3",
        "collections_queried": ["spherex_qr3"],
        "service": "IRSA SIA2",
        "endpoint": "https://irsa.ipac.caltech.edu/SIA",
        "max_records": 80,
    },
    "count": 2,
    "truncated": False,
    "preview_images_published": False,
    "comparable": {
        "repeat_coverage_found": True,
        "uses_truncated_result": False,
        "caveat": "...",
        "bands": [
            {
                "bandpass": "SPHEREx-D3",
                "image_count": 2,
                "distinct_obs_ids": 2,
                "earliest": "2026-07-20 06:03:58 UTC",
                "latest": "2026-07-22 10:14:40 UTC",
                "span_days": 2.17,
                "repeat_coverage": True,
            }
        ],
    },
    "observations": [
        {
            "obs_id": "2026W30_1B_0051_1",
            "facility_name": "SPHEREx",
            "instrument_name": "SPHEREx",
            "bandpass": "SPHEREx-D3",
            "spectral_band": "Infrared",
            "wavelength_min_um": 1.6301,
            "wavelength_max_um": 2.4346,
            "exposure_seconds": 113.58,
            "observation_start": "2026-07-20 06:03:58 UTC",
            "observation_end": "2026-07-20 06:05:53 UTC",
            "release_date": "2026-09-15 16:02:25",
            "image_center_ra_deg": 8.391,
            "image_center_dec_deg": 42.004,
            "pixel_scale_arcsec": 6.15,
            "fov_deg": 3.485,
            "calib_level": 2,
            "proposal_title": "SPHEREx LVF Survey Data",
            "obs_collection": "spherex_qr3",
            "access_url": (
                "https://irsa.ipac.caltech.edu"
                "/ibe/data/spherex/qr3/level2/foo.fits"
            ),
            "access_format": "image/fits",
            "access_estsize_kb": 65711.0,
            "cutout_url": (
                "https://irsa.ipac.caltech.edu"
                "/ibe/data/spherex/qr3/level2/foo.fits"
                "?center=10.68,41.26&size=0.08"
            ),
            "publisher_did": (
                "ivo://irsa.ipac/spherex_qr3?2026W30_1B_0051_1/D3"
            ),
            "preview_image_url": None,
            "preview_note": (
                "IRSA did not publish a JPEG or PNG preview. "
                "The archive file is a FITS spectral image."
            ),
        },
        {
            "obs_id": "2026W30_1B_0464_3",
            "facility_name": "SPHEREx",
            "instrument_name": "SPHEREx",
            "bandpass": "SPHEREx-D3",
            "spectral_band": "Infrared",
            "wavelength_min_um": 1.6301,
            "wavelength_max_um": 2.4346,
            "exposure_seconds": 113.58,
            "observation_start": "2026-07-22 10:14:40 UTC",
            "observation_end": "2026-07-22 10:16:35 UTC",
            "release_date": "2026-09-15 16:02:25",
            "image_center_ra_deg": 13.129,
            "image_center_dec_deg": 40.512,
            "pixel_scale_arcsec": 6.15,
            "fov_deg": 3.485,
            "calib_level": 2,
            "proposal_title": "SPHEREx LVF Survey Data",
            "obs_collection": "spherex_qr3",
            "access_url": (
                "https://irsa.ipac.caltech.edu"
                "/ibe/data/spherex/qr3/level2/bar.fits"
            ),
            "access_format": "image/fits",
            "access_estsize_kb": 65826.0,
            "cutout_url": (
                "https://irsa.ipac.caltech.edu"
                "/ibe/data/spherex/qr3/level2/bar.fits"
                "?center=10.68,41.26&size=0.08"
            ),
            "publisher_did": (
                "ivo://irsa.ipac/spherex_qr3?2026W30_1B_0464_3/D3"
            ),
            "preview_image_url": None,
            "preview_note": (
                "IRSA did not publish a JPEG or PNG preview. "
                "The archive file is a FITS spectral image."
            ),
        },
    ],
}


# ── happy path ─────────────────────────────────────────────────────────────────

def test_valid_request_returns_observations():
    async def mock_search(ra, dec, radius_deg, max_records):
        return MOCK_RESPONSE

    async def _run():
        with patch("app.main.search_observations", side_effect=mock_search):
            return await spherex_observations(ra=10.684583, dec=41.26875)

    result = asyncio.run(_run())
    assert result["count"] == 2
    assert isinstance(result["observations"], list)
    obs = result["observations"][0]
    assert obs["obs_id"] == "2026W30_1B_0051_1"
    assert obs["bandpass"] == "SPHEREx-D3"
    assert obs["wavelength_min_um"] == pytest.approx(1.6301)
    assert obs["observation_start"] == "2026-07-20 06:03:58 UTC"
    assert "observation_start_mjd" not in obs
    assert "observation_end_mjd" not in obs


def test_repeat_coverage_flag_propagated():
    async def mock_search(ra, dec, radius_deg, max_records):
        return MOCK_RESPONSE

    async def _run():
        with patch("app.main.search_observations", side_effect=mock_search):
            return await spherex_observations(ra=10.684583, dec=41.26875)

    result = asyncio.run(_run())
    assert result["comparable"]["repeat_coverage_found"] is True
    band = result["comparable"]["bands"][0]
    assert band["span_days"] == pytest.approx(2.17)
    assert band["distinct_obs_ids"] == 2


def test_query_metadata_in_response():
    async def mock_search(ra, dec, radius_deg, max_records):
        return MOCK_RESPONSE

    async def _run():
        with patch("app.main.search_observations", side_effect=mock_search):
            return await spherex_observations(ra=10.684583, dec=41.26875)

    result = asyncio.run(_run())
    q = result["query"]
    assert q["ra_deg"] == pytest.approx(10.684583)
    assert q["dec_deg"] == pytest.approx(41.26875)
    assert q["collection"] == "spherex_qr3"
    assert q["service"] == "IRSA SIA2"


# ── zero results ───────────────────────────────────────────────────────────────

def test_zero_results_returns_empty_list():
    empty = dict(
        MOCK_RESPONSE,
        count=0,
        observations=[],
        comparable={
            **MOCK_RESPONSE["comparable"],
            "bands": [],
            "repeat_coverage_found": False,
        },
    )

    async def mock_empty(ra, dec, radius_deg, max_records):
        return empty

    async def _run():
        with patch("app.main.search_observations", side_effect=mock_empty):
            return await spherex_observations(ra=10.684583, dec=41.26875)

    result = asyncio.run(_run())
    assert result["count"] == 0
    assert result["observations"] == []
    assert result["comparable"]["repeat_coverage_found"] is False


# ── error propagation ──────────────────────────────────────────────────────────

def test_spherex_error_raises_http_502():
    async def mock_error(ra, dec, radius_deg, max_records):
        raise SpherexError("IRSA unreachable", status_code=502)

    async def _run():
        with patch("app.main.search_observations", side_effect=mock_error):
            return await spherex_observations(ra=10.684583, dec=41.26875)

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(_run())

    assert exc_info.value.status_code == 502
    assert "IRSA unreachable" in exc_info.value.detail


def test_spherex_timeout_raises_http_504():
    async def mock_timeout(ra, dec, radius_deg, max_records):
        raise SpherexError("The IRSA SPHEREx query timed out.", status_code=504)

    async def _run():
        with patch("app.main.search_observations", side_effect=mock_timeout):
            return await spherex_observations(ra=10.684583, dec=41.26875)

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(_run())

    assert exc_info.value.status_code == 504
    assert "timed out" in exc_info.value.detail


# ── query params forwarded ─────────────────────────────────────────────────────

def test_ra_dec_forwarded_to_search():
    received = {}

    async def capture(ra, dec, radius_deg, max_records):
        received["ra"] = ra
        received["dec"] = dec
        received["radius_deg"] = radius_deg
        received["max_records"] = max_records
        return MOCK_RESPONSE

    async def _run():
        with patch("app.main.search_observations", side_effect=capture):
            return await spherex_observations(
                ra=83.8221, dec=-5.3911, radius_deg=0.02, max_records=50
            )

    asyncio.run(_run())
    assert received["ra"] == pytest.approx(83.8221)
    assert received["dec"] == pytest.approx(-5.3911)
    assert received["radius_deg"] == pytest.approx(0.02)
    assert received["max_records"] == 50


def test_default_radius_and_max_records():
    received = {}

    async def capture(ra, dec, radius_deg, max_records):
        received["radius_deg"] = radius_deg
        received["max_records"] = max_records
        return MOCK_RESPONSE

    async def _run():
        with patch("app.main.search_observations", side_effect=capture):
            return await spherex_observations(ra=10.0, dec=41.0)

    asyncio.run(_run())
    assert received["radius_deg"] == pytest.approx(0.01)
    assert received["max_records"] == 80


# ── /api/spherex/preview tests ──────────────────────────────────────────────────

MOCK_PNG = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x00\x00\x00\x00:~\x9bU\x00\x00\x00\nIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
MOCK_META = {
    "dimensions": [23, 23],
    "bunit": "MJy / sr",
    "obs_id": "MOCK_OBS_01",
    "inside_footprint": True,
}


def test_spherex_preview_success():
    async def _mock_render(*args, **kwargs):
        return MOCK_PNG, MOCK_META

    async def _run():
        with patch("app.main.get_or_render_preview", side_effect=_mock_render):
            return await spherex_preview(
                fits_url="https://irsa.ipac.caltech.edu/ibe/data/spherex/test.fits",
                ra=10.0,
                dec=41.0,
            )

    resp = asyncio.run(_run())
    assert resp.media_type == "image/png"
    assert resp.body == MOCK_PNG
    assert resp.headers["X-Fits-Obs-Id"] == "MOCK_OBS_01"
    assert resp.headers["X-Fits-Inside-Footprint"] == "true"


def test_spherex_preview_error_raises_http():
    async def _mock_render(*args, **kwargs):
        raise FitsServiceError("FITS service failed", status_code=502)

    async def _run():
        with patch("app.main.get_or_render_preview", side_effect=_mock_render):
            return await spherex_preview(
                fits_url="https://irsa.ipac.caltech.edu/ibe/data/spherex/test.fits",
                ra=10.0,
                dec=41.0,
            )

    with pytest.raises(HTTPException) as exc:
        asyncio.run(_run())
    assert exc.value.status_code == 502
    assert "FITS service failed" in exc.value.detail


def test_spherex_preview_meta_success():
    async def _mock_render(*args, **kwargs):
        return MOCK_PNG, MOCK_META

    async def _run():
        with patch("app.main.get_or_render_preview", side_effect=_mock_render):
            return await spherex_preview_meta(
                fits_url="https://irsa.ipac.caltech.edu/ibe/data/spherex/test.fits",
                ra=10.0,
                dec=41.0,
            )

    meta = asyncio.run(_run())
    assert meta["obs_id"] == "MOCK_OBS_01"
    assert meta["bunit"] == "MJy / sr"
    assert meta["inside_footprint"] is True


def test_spherex_compare_success():
    mock_compare_result = {
        "epoch1": {"obs_id": "EPOCH_1"},
        "epoch2": {"obs_id": "EPOCH_2"},
        "registration": {"status": "aligned", "warnings": []},
    }

    async def _mock_compare(*args, **kwargs):
        return mock_compare_result

    async def _run():
        with patch("app.main.compare_two_epochs", side_effect=_mock_compare):
            return await spherex_compare(
                fits_url_1="https://irsa.ipac.caltech.edu/ibe/data/spherex/epoch1.fits",
                fits_url_2="https://irsa.ipac.caltech.edu/ibe/data/spherex/epoch2.fits",
                ra=10.0,
                dec=41.0,
            )

    result = asyncio.run(_run())
    assert result["epoch1"]["obs_id"] == "EPOCH_1"
    assert result["registration"]["status"] == "aligned"


def test_spherex_compare_error():
    async def _mock_compare(*args, **kwargs):
        raise FitsServiceError("Reprojection failed", status_code=502)

    async def _run():
        with patch("app.main.compare_two_epochs", side_effect=_mock_compare):
            return await spherex_compare(
                fits_url_1="https://irsa.ipac.caltech.edu/ibe/data/spherex/epoch1.fits",
                fits_url_2="https://irsa.ipac.caltech.edu/ibe/data/spherex/epoch2.fits",
                ra=10.0,
                dec=41.0,
            )

    with pytest.raises(HTTPException) as exc:
        asyncio.run(_run())
    assert exc.value.status_code == 502
    assert "Reprojection failed" in exc.value.detail


def test_ai_chat_route(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    req = ChatRequest(message="Why is Betelgeuse bright in infrared?", target_id="betelgeuse")
    result = asyncio.run(ai_chat(req))
    assert "Betelgeuse" in result.text
    assert result.target_card is not None
    assert result.target_card.title == "Alpha Orionis"



