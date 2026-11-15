"""
Unit and integration tests for the AstroLens X SPHEREx backend.
Run with: python -m pytest tests/ -v
"""
import io
import csv
import pytest

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.spherex import (
    SpherexError,
    _parse_float,
    _parse_int,
    _format_mjd,
    _trusted_fits_url,
    _cutout_url,
    _blank_to_none,
    _observation,
    _comparable,
    _public_observation,
)


# --- _parse_float -----------------------------------------------------------

def test_parse_float_valid():
    assert _parse_float("3.14") == pytest.approx(3.14)

def test_parse_float_scientific():
    assert _parse_float("1.63010e-06") == pytest.approx(1.63010e-06)

def test_parse_float_whitespace():
    assert _parse_float("  42.0  ") == pytest.approx(42.0)

def test_parse_float_empty_string():
    assert _parse_float("") is None

def test_parse_float_none():
    assert _parse_float(None) is None

def test_parse_float_non_numeric():
    assert _parse_float("abc") is None


# --- _parse_int -----------------------------------------------------------

def test_parse_int_valid():
    assert _parse_int("2") == 2

def test_parse_int_float_string():
    assert _parse_int("2.0") == 2

def test_parse_int_none():
    assert _parse_int(None) is None


# --- _format_mjd -----------------------------------------------------------

def test_format_mjd_known_date():
    # MJD 0 = 1858-11-17
    mjd, text = _format_mjd("0.0")
    assert mjd == pytest.approx(0.0)
    assert text == "1858-11-17 00:00:00 UTC"

def test_format_mjd_none():
    mjd, text = _format_mjd(None)
    assert mjd is None
    assert text is None

def test_format_mjd_real_spherex_epoch():
    # From live data: t_min = 61241.252765 (2026-07-20 ~06:03 UTC)
    mjd, text = _format_mjd("61241.252765")
    assert mjd == pytest.approx(61241.252765)
    assert "2026" in text
    assert "UTC" in text


# --- _trusted_fits_url -----------------------------------------------------------

GOOD_URL = "https://irsa.ipac.caltech.edu/ibe/data/spherex/qr3/level2/2026W30_1B/l2b-v27-2026-222/3/level2_2026W30_1B_0051_1D3_spx_l2b-v27-2026-222.fits"

def test_trusted_fits_url_valid():
    assert _trusted_fits_url(GOOD_URL) == GOOD_URL

def test_trusted_fits_url_with_query_rejected():
    url = GOOD_URL + "?foo=bar"
    assert _trusted_fits_url(url) is None

def test_trusted_fits_url_wrong_host():
    url = "https://evil.com/ibe/data/spherex/qr3/level2/foo.fits"
    assert _trusted_fits_url(url) is None

def test_trusted_fits_url_wrong_path():
    url = "https://irsa.ipac.caltech.edu/other/path/foo.fits"
    assert _trusted_fits_url(url) is None

def test_trusted_fits_url_not_fits():
    url = "https://irsa.ipac.caltech.edu/ibe/data/spherex/qr3/level2/foo.jpg"
    assert _trusted_fits_url(url) is None

def test_trusted_fits_url_http_rejected():
    url = GOOD_URL.replace("https://", "http://")
    assert _trusted_fits_url(url) is None

def test_trusted_fits_url_none():
    assert _trusted_fits_url(None) is None

def test_trusted_fits_url_empty():
    assert _trusted_fits_url("") is None


# --- _cutout_url -----------------------------------------------------------

def test_cutout_url_builds_correctly():
    url = _cutout_url(GOOD_URL, 10.12345678, -5.98765432)
    assert url == f"{GOOD_URL}?center=10.12345678,-5.98765432&size=0.08"

def test_cutout_url_none_access():
    assert _cutout_url(None, 10.0, 5.0) is None


# --- _blank_to_none -----------------------------------------------------------

def test_blank_to_none_blank():
    assert _blank_to_none("   ") is None

def test_blank_to_none_none():
    assert _blank_to_none(None) is None

def test_blank_to_none_value():
    assert _blank_to_none("SPHEREx") == "SPHEREx"


# --- _observation -----------------------------------------------------------

SAMPLE_ROW = {
    "s_ra": "8.391713938098956",
    "s_dec": "42.004837640111958",
    "facility_name": "SPHEREx",
    "instrument_name": "SPHEREx",
    "energy_bandpassname": "SPHEREx-D3",
    "energy_emband": "Infrared",
    "obs_id": "2026W30_1B_0051_1",
    "em_min": "1.63010e-06",
    "em_max": "2.43460e-06",
    "t_exptime": "113.582600",
    "obs_release_date": "2026-09-15 16:02:25",
    "s_pixel_scale": "6.150",
    "t_min": "61241.252765",
    "t_max": "61241.254098",
    "obs_publisher_did": "ivo://irsa.ipac/spherex_qr3?2026W30_1B_0051_1/D3",
    "s_fov": "3.485e+00",
    "calib_level": "2",
    "proposal_title": "SPHEREx LVF Survey Data",
    "obs_collection": "spherex_qr3",
    "access_url": GOOD_URL,
    "access_format": "image/fits",
    "access_estsize": "65711",
}

def test_observation_parses_wavelengths():
    obs = _observation(SAMPLE_ROW, 10.0, 41.0)
    assert obs["wavelength_min_um"] == pytest.approx(1.63010)
    assert obs["wavelength_max_um"] == pytest.approx(2.43460)

def test_observation_parses_dates():
    obs = _observation(SAMPLE_ROW, 10.0, 41.0)
    assert "2026" in obs["observation_start"]
    assert obs["observation_start_mjd"] == pytest.approx(61241.252765)

def test_observation_trusted_access_url():
    obs = _observation(SAMPLE_ROW, 10.0, 41.0)
    assert obs["access_url"] == GOOD_URL

def test_observation_cutout_url_contains_coords():
    obs = _observation(SAMPLE_ROW, 10.12345678, 41.26875)
    assert "center=10.12345678,41.26875000" in obs["cutout_url"]

def test_observation_no_preview():
    obs = _observation(SAMPLE_ROW, 10.0, 41.0)
    assert obs["preview_image_url"] is None
    assert "FITS" in obs["preview_note"]

def test_observation_calib_level_int():
    obs = _observation(SAMPLE_ROW, 10.0, 41.0)
    assert obs["calib_level"] == 2
    assert isinstance(obs["calib_level"], int)

def test_observation_missing_access_url():
    row = dict(SAMPLE_ROW, access_url="")
    obs = _observation(row, 10.0, 41.0)
    assert obs["access_url"] is None
    assert obs["cutout_url"] is None


# --- _comparable -----------------------------------------------------------

def _make_obs(band, obs_id, start_mjd):
    return {
        "bandpass": band,
        "obs_id": obs_id,
        "observation_start": f"MJD {start_mjd}",
        "observation_start_mjd": start_mjd,
    }

def test_comparable_repeat_found():
    observations = [
        _make_obs("SPHEREx-D3", "obs_001", 61241.0),
        _make_obs("SPHEREx-D3", "obs_002", 61243.5),  # 2.5 days later
    ]
    result = _comparable(observations, truncated=False)
    assert result["repeat_coverage_found"] is True

def test_comparable_no_repeat_same_obs_id():
    # Same obs_id repeated = not distinct
    observations = [
        _make_obs("SPHEREx-D3", "obs_001", 61241.0),
        _make_obs("SPHEREx-D3", "obs_001", 61243.5),
    ]
    result = _comparable(observations, truncated=False)
    assert result["repeat_coverage_found"] is False

def test_comparable_no_repeat_less_than_one_day():
    observations = [
        _make_obs("SPHEREx-D3", "obs_001", 61241.0),
        _make_obs("SPHEREx-D3", "obs_002", 61241.5),  # 0.5 days
    ]
    result = _comparable(observations, truncated=False)
    assert result["repeat_coverage_found"] is False

def test_comparable_empty():
    result = _comparable([], truncated=False)
    assert result["repeat_coverage_found"] is False
    assert result["bands"] == []

def test_comparable_truncated_flag():
    result = _comparable([], truncated=True)
    assert result["uses_truncated_result"] is True


# --- _public_observation -----------------------------------------------------------

def test_public_observation_hides_mjd():
    obs = _observation(SAMPLE_ROW, 10.0, 41.0)
    pub = _public_observation(obs)
    assert "observation_start_mjd" not in pub
    assert "observation_end_mjd" not in pub

def test_public_observation_keeps_dates():
    obs = _observation(SAMPLE_ROW, 10.0, 41.0)
    pub = _public_observation(obs)
    assert "observation_start" in pub
    assert "observation_end" in pub


# --- Sanitizer, Caching, and Retries ----------------------------------------

from app.spherex import (
    _sanitize_error_snippet,
    _get_cached_observation,
    _save_cached_observation,
    _angular_separation_deg,
    search_observations,
)


def test_sanitize_error_snippet_502_html():
    raw_html = (
        '<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN"><html><head>'
        '<title>502 Proxy Error</title></head><body><h1>Proxy Error</h1>'
        '<p>Reason: <strong>Error reading from remote server</strong></p></body></html>'
    )
    msg = _sanitize_error_snippet(502, raw_html)
    assert "<" not in msg
    assert ">" not in msg
    assert "502" in msg
    assert "temporarily unavailable" in msg


def test_sanitize_error_snippet_503_and_504():
    msg503 = _sanitize_error_snippet(503, "Service Unavailable")
    assert "503" in msg503
    assert "maintenance" in msg503.lower() or "overloaded" in msg503.lower()

    msg504 = _sanitize_error_snippet(504, "Gateway Timeout")
    assert "504" in msg504
    assert "timed out" in msg504.lower()


def test_angular_separation():
    # Same point -> 0 deg
    assert _angular_separation_deg(10.0, 20.0, 10.0, 20.0) == pytest.approx(0.0)
    # 1 deg difference along declination
    assert _angular_separation_deg(0.0, 0.0, 0.0, 1.0) == pytest.approx(1.0)


def test_cached_observation_lookup():
    # Sirius coordinates
    cached = _get_cached_observation(101.287155, -16.716116, 0.01)
    assert cached is not None
    assert cached["from_cache"] is True
    assert cached["is_cached"] is True
    assert "retrieval_timestamp" in cached
    assert "notice" in cached
    assert len(cached["observations"]) > 0


@pytest.mark.anyio
async def test_search_observations_serves_cache_when_irsa_502(monkeypatch):
    """Verify that when IRSA returns 502, search_observations falls back to cached real observations."""
    import app.spherex

    # Mock _query_collection to raise SpherexError 502
    async def mock_query_502(*args, **kwargs):
        raise SpherexError("IRSA returned HTTP 502 for the SPHEREx search.", status_code=502)

    monkeypatch.setattr(app.spherex, "_query_collection", mock_query_502)

    # Andromeda M31 coordinates (which exist in our pre-seeded cache)
    result = await search_observations(10.684583, 41.26875, 0.01, 80)
    assert result is not None
    assert result["from_cache"] is True
    assert result["count"] > 0
    assert "notice" in result
    assert "2026W30_1B" in result["observations"][0]["obs_id"]


@pytest.mark.anyio
async def test_search_observations_raises_when_no_cache_and_502(monkeypatch):
    """Verify that when coordinates have NO cached data, it raises 502 and never fabricates."""
    import app.spherex

    async def mock_query_502(*args, **kwargs):
        raise SpherexError("IRSA returned HTTP 502 for the SPHEREx search.", status_code=502)

    monkeypatch.setattr(app.spherex, "_query_collection", mock_query_502)

    # Random coordinate in the middle of nowhere that has no cache
    with pytest.raises(SpherexError) as exc_info:
        await search_observations(359.123456, -89.654321, 0.001, 80)
    assert exc_info.value.status_code == 502
