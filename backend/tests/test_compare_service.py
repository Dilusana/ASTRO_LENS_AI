"""Unit tests for multi-epoch WCS reprojection, registration, and comparison."""

import asyncio
import io
import math
import os
import sys
import pytest
import numpy as np
from astropy.io import fits
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.compare_service import (
    reproject_to_tangent_grid,
    parse_iso_datetime,
    array_to_base64_png,
    compare_two_epochs,
)
from app.fits_service import FitsServiceError


def _make_wcs_header(ra0=10.0, dec0=40.0, scale_deg=0.00170833, shape=(25, 25)):
    hdr = fits.Header()
    hdr["NAXIS"] = 2
    hdr["NAXIS1"] = shape[1]
    hdr["NAXIS2"] = shape[0]
    hdr["CTYPE1"] = "RA---TAN"
    hdr["CTYPE2"] = "DEC--TAN"
    hdr["CRVAL1"] = ra0
    hdr["CRVAL2"] = dec0
    hdr["CRPIX1"] = (shape[1] / 2.0) + 0.5
    hdr["CRPIX2"] = (shape[0] / 2.0) + 0.5
    hdr["CD1_1"] = -scale_deg
    hdr["CD1_2"] = 0.0
    hdr["CD2_1"] = 0.0
    hdr["CD2_2"] = scale_deg
    hdr["BUNIT"] = "MJy / sr"
    hdr["OBS_ID"] = "TEST_EPOCH"
    hdr["FILTER"] = "SPHEREx-D3"
    hdr["DATE-OBS"] = "2026-07-20 06:03:58 UTC"
    return hdr


def test_reproject_to_tangent_grid_centered_peak():
    shape = (25, 25)
    y, x = np.mgrid[0:shape[0], 0:shape[1]]
    data = (np.exp(-((x - 12.0)**2 + (y - 12.0)**2) / 4.0) * 500.0).astype(np.float32)
    hdr = _make_wcs_header(ra0=10.0, dec0=40.0, shape=shape)

    grid = reproject_to_tangent_grid(data, hdr, ra0=10.0, dec0=40.0, grid_size=25)
    assert grid.shape == (25, 25)
    center_val = grid[12, 12]
    assert center_val == pytest.approx(500.0, rel=0.05)
    assert np.nanmax(grid) == pytest.approx(500.0, rel=0.05)


def test_parse_iso_datetime():
    dt = parse_iso_datetime("2026-07-20 06:03:58 UTC")
    assert dt is not None
    assert dt.year == 2026
    assert dt.month == 7
    assert dt.day == 20
    assert dt.hour == 6

    assert parse_iso_datetime(None) is None
    assert parse_iso_datetime("") is None
    assert parse_iso_datetime("not-a-date") is None


def test_array_to_base64_png():
    arr = np.zeros((20, 20), dtype=np.uint8)
    arr[10, 10] = 255
    res = array_to_base64_png(arr)
    assert isinstance(res, str)
    assert res.startswith("data:image/png;base64,")


def test_compare_two_epochs_compatible():
    hdr1 = _make_wcs_header(ra0=10.0, dec0=40.0)
    hdr1["DATE-OBS"] = "2026-07-20 06:03:58 UTC"
    hdr1["FILTER"] = "SPHEREx-D3"
    hdr1["OBS_ID"] = "EPOCH_1"
    data1 = np.ones((25, 25), dtype=np.float32) * 50.0

    hdr2 = _make_wcs_header(ra0=10.0, dec0=40.0)
    hdr2["DATE-OBS"] = "2026-08-07 07:20:13 UTC"
    hdr2["FILTER"] = "SPHEREx-D3"
    hdr2["OBS_ID"] = "EPOCH_2"
    data2 = np.ones((25, 25), dtype=np.float32) * 60.0

    async def _mock_load(client, trusted_url, ra, dec, size_deg):
        if "epoch1" in trusted_url:
            return data1, hdr1, "EPOCH_1"
        return data2, hdr2, "EPOCH_2"

    async def _run():
        with patch("app.compare_service.load_cutout_fits", side_effect=_mock_load):
            return await compare_two_epochs(
                fits_url_1="https://irsa.ipac.caltech.edu/ibe/data/spherex/epoch1.fits",
                fits_url_2="https://irsa.ipac.caltech.edu/ibe/data/spherex/epoch2.fits",
                ra=10.0,
                dec=40.0,
                size_deg=0.04,
            )

    res = asyncio.run(_run())
    assert res["epoch1"]["obs_id"] == "EPOCH_1"
    assert res["epoch2"]["obs_id"] == "EPOCH_2"
    assert res["registration"]["status"] == "aligned"
    assert res["registration"]["compatible_bandpass"] is True
    assert res["registration"]["delta_days"] == pytest.approx(18.05, abs=0.1)
    assert res["registration"]["sufficient_overlap"] is True
    assert len(res["registration"]["warnings"]) == 0
    assert "scientific_caution" in res


def test_compare_two_epochs_warns_on_mismatch():
    hdr1 = _make_wcs_header(ra0=10.0, dec0=40.0)
    hdr1["FILTER"] = "SPHEREx-D2"
    data1 = np.ones((25, 25), dtype=np.float32) * 50.0

    hdr2 = _make_wcs_header(ra0=10.0, dec0=40.0)
    hdr2["FILTER"] = "SPHEREx-D5"
    data2 = np.ones((25, 25), dtype=np.float32) * 60.0

    async def _mock_load(client, trusted_url, ra, dec, size_deg):
        if "epoch1" in trusted_url:
            return data1, hdr1, "OBS1"
        return data2, hdr2, "OBS2"

    async def _run():
        with patch("app.compare_service.load_cutout_fits", side_effect=_mock_load):
            return await compare_two_epochs(
                fits_url_1="https://irsa.ipac.caltech.edu/ibe/data/spherex/epoch1.fits",
                fits_url_2="https://irsa.ipac.caltech.edu/ibe/data/spherex/epoch2.fits",
                ra=10.0,
                dec=40.0,
            )

    res = asyncio.run(_run())
    assert res["registration"]["compatible_bandpass"] is False
    assert any("Bandpass mismatch" in w for w in res["registration"]["warnings"])


def test_compare_two_epochs_detects_reversed_chronology():
    hdr1 = _make_wcs_header(ra0=10.0, dec0=40.0)
    hdr1["DATE-OBS"] = "2026-08-07 07:20:13 UTC"
    hdr1["FILTER"] = "SPHEREx-D3"
    hdr1["OBS_ID"] = "LATER_EPOCH"
    data1 = np.ones((25, 25), dtype=np.float32) * 50.0

    hdr2 = _make_wcs_header(ra0=10.0, dec0=40.0)
    hdr2["DATE-OBS"] = "2026-07-20 06:03:58 UTC"
    hdr2["FILTER"] = "SPHEREx-D3"
    hdr2["OBS_ID"] = "EARLIER_EPOCH"
    data2 = np.ones((25, 25), dtype=np.float32) * 60.0

    async def _mock_load(client, trusted_url, ra, dec, size_deg):
        if "epoch1" in trusted_url:
            return data1, hdr1, "LATER_EPOCH"
        return data2, hdr2, "EARLIER_EPOCH"

    async def _run():
        with patch("app.compare_service.load_cutout_fits", side_effect=_mock_load):
            return await compare_two_epochs(
                fits_url_1="https://irsa.ipac.caltech.edu/ibe/data/spherex/epoch1.fits",
                fits_url_2="https://irsa.ipac.caltech.edu/ibe/data/spherex/epoch2.fits",
                ra=10.0,
                dec=40.0,
            )

    res = asyncio.run(_run())
    reg = res["registration"]
    assert reg["is_chronological"] is False
    assert reg["temporal_order"] == "reversed"
    assert reg["earlier_epoch"] == "epoch2"
    assert reg["later_epoch"] == "epoch1"
    assert any("Reversed chronological input" in w for w in reg["warnings"])


def test_reproject_to_tangent_grid_nearest_vs_bilinear():
    shape = (25, 25)
    y, x = np.mgrid[0:shape[0], 0:shape[1]]
    data = (np.exp(-((x - 12.0)**2 + (y - 12.0)**2) / 4.0) * 500.0).astype(np.float32)
    hdr = _make_wcs_header(ra0=10.0, dec0=40.0, shape=shape)

    grid_near = reproject_to_tangent_grid(data, hdr, ra0=10.0, dec0=40.0, grid_size=25, interpolation="nearest")
    grid_bilinear = reproject_to_tangent_grid(data, hdr, ra0=10.0, dec0=40.0, grid_size=25, interpolation="bilinear")

    assert grid_near.shape == (25, 25)
    assert grid_bilinear.shape == (25, 25)
    assert np.sum(np.isfinite(grid_near)) > 500
    assert np.sum(np.isfinite(grid_bilinear)) > 500
    # Peak flux should be preserved
    assert np.nanmax(grid_near) == pytest.approx(500.0, rel=0.05)
    assert np.nanmax(grid_bilinear) == pytest.approx(500.0, rel=0.05)


def test_compare_two_epochs_custom_fov_and_interpolation():
    hdr1 = _make_wcs_header(ra0=10.0, dec0=40.0)
    hdr1["DATE-OBS"] = "2026-07-20 06:03:58 UTC"
    hdr1["FILTER"] = "SPHEREx-D3"
    hdr1["OBS_ID"] = "EPOCH_1"
    data1 = np.ones((25, 25), dtype=np.float32) * 50.0

    hdr2 = _make_wcs_header(ra0=10.0, dec0=40.0)
    hdr2["DATE-OBS"] = "2026-08-07 07:20:13 UTC"
    hdr2["FILTER"] = "SPHEREx-D3"
    hdr2["OBS_ID"] = "EPOCH_2"
    data2 = np.ones((25, 25), dtype=np.float32) * 60.0

    async def _mock_load(client, trusted_url, ra, dec, size_deg):
        if "epoch1" in trusted_url:
            return data1, hdr1, "EPOCH_1"
        return data2, hdr2, "EPOCH_2"

    async def _run():
        with patch("app.compare_service.load_cutout_fits", side_effect=_mock_load):
            return await compare_two_epochs(
                fits_url_1="https://irsa.ipac.caltech.edu/ibe/data/spherex/epoch1.fits",
                fits_url_2="https://irsa.ipac.caltech.edu/ibe/data/spherex/epoch2.fits",
                ra=10.0,
                dec=40.0,
                size_deg=0.02,
                interpolation="bilinear",
            )

    res = asyncio.run(_run())
    reg = res["registration"]
    assert reg["grid_dimensions"] == [13, 13]
    assert reg["field_of_view_deg"] == 0.02
    assert reg["field_of_view_arcmin"] == 1.2
    assert reg["display_interpolation"] == "bilinear"
    assert "Visualization Only" in reg["interpolation_notice"]
    assert reg["psf_fwhm_arcsec"] == 7.5


