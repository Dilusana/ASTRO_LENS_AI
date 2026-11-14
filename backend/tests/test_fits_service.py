"""Unit and integration tests for SPHEREx FITS retrieval, WCS validation, and normalization."""

import io
import pytest
import numpy as np
from astropy.io import fits
from PIL import Image

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.fits_service import (
    FitsServiceError,
    validate_trusted_irsa_url,
    get_cache_key,
    world_to_tan_pixel,
    compute_wcs_orientation,
    process_fits_image,
    find_hdu1_end_offset,
)


VALID_IRSA_URL = (
    "https://irsa.ipac.caltech.edu/ibe/data/spherex/qr3/level2/2026W30_1B/l2b-v27-2026-222/3/"
    "level2_2026W30_1B_0051_1D3_spx_l2b-v27-2026-222.fits"
)


# --- URL Validation -----------------------------------------------------------

def test_validate_trusted_irsa_url_valid():
    assert validate_trusted_irsa_url(VALID_IRSA_URL) == VALID_IRSA_URL


def test_validate_trusted_irsa_url_rejects_http():
    http_url = VALID_IRSA_URL.replace("https://", "http://")
    with pytest.raises(FitsServiceError, match="HTTPS"):
        validate_trusted_irsa_url(http_url)


def test_validate_trusted_irsa_url_rejects_foreign_host():
    bad_host = "https://evil.com/ibe/data/spherex/test.fits"
    with pytest.raises(FitsServiceError, match="not trusted"):
        validate_trusted_irsa_url(bad_host)


def test_validate_trusted_irsa_url_rejects_non_spherex_path():
    bad_path = "https://irsa.ipac.caltech.edu/data/other/image.fits"
    with pytest.raises(FitsServiceError, match="valid IRSA SPHEREx"):
        validate_trusted_irsa_url(bad_path)


def test_validate_trusted_irsa_url_rejects_non_fits():
    bad_ext = "https://irsa.ipac.caltech.edu/ibe/data/spherex/test.png"
    with pytest.raises(FitsServiceError, match="valid IRSA SPHEREx"):
        validate_trusted_irsa_url(bad_ext)


def test_validate_trusted_irsa_url_rejects_none_or_empty():
    with pytest.raises(FitsServiceError):
        validate_trusted_irsa_url(None)
    with pytest.raises(FitsServiceError):
        validate_trusted_irsa_url("")


# --- Cache Key ----------------------------------------------------------------

def test_get_cache_key_deterministic():
    k1 = get_cache_key(VALID_IRSA_URL, 10.6845, 41.2687, 0.04)
    k2 = get_cache_key(VALID_IRSA_URL, 10.6845, 41.2687, 0.04)
    assert k1 == k2
    assert len(k1) == 24


def test_get_cache_key_differs_on_params():
    k1 = get_cache_key(VALID_IRSA_URL, 10.6845, 41.2687, 0.04)
    k2 = get_cache_key(VALID_IRSA_URL, 10.6845, 41.2687, 0.08)
    assert k1 != k2


# --- WCS TAN Footprint & Pixel Coordinates -------------------------------------

def _make_sample_wcs_header(naxis1=24, naxis2=24, ra0=10.0, dec0=40.0, scale_deg=0.001):
    hdr = fits.Header()
    hdr["NAXIS"] = 2
    hdr["NAXIS1"] = naxis1
    hdr["NAXIS2"] = naxis2
    hdr["CTYPE1"] = "RA---TAN"
    hdr["CTYPE2"] = "DEC--TAN"
    hdr["CRVAL1"] = ra0
    hdr["CRVAL2"] = dec0
    hdr["CRPIX1"] = (naxis1 / 2.0) + 0.5
    hdr["CRPIX2"] = (naxis2 / 2.0) + 0.5
    hdr["CD1_1"] = -scale_deg
    hdr["CD1_2"] = 0.0
    hdr["CD2_1"] = 0.0
    hdr["CD2_2"] = scale_deg
    hdr["BUNIT"] = "MJy / sr"
    hdr["OBS_ID"] = "TEST_SPHEREx_01"
    return hdr


def test_world_to_tan_pixel_at_center():
    hdr = _make_sample_wcs_header(24, 24, ra0=10.0, dec0=40.0)
    x, y, inside = world_to_tan_pixel(10.0, 40.0, hdr)
    assert inside is True
    # Center pixel (0-indexed) should be exactly 11.5
    assert x == pytest.approx(11.5, abs=0.01)
    assert y == pytest.approx(11.5, abs=0.01)


def test_world_to_tan_pixel_outside_footprint():
    hdr = _make_sample_wcs_header(24, 24, ra0=10.0, dec0=40.0, scale_deg=0.001)
    # Coordinate 5 degrees away is well outside 24-pixel (0.024 deg) cutout
    x, y, inside = world_to_tan_pixel(15.0, 40.0, hdr)
    assert inside is False


def test_compute_wcs_orientation():
    hdr = _make_sample_wcs_header(scale_deg=0.00170833)  # approx 6.15 arcsec
    meta = compute_wcs_orientation(hdr)
    assert meta["has_wcs"] is True
    assert meta["parity"] == "standard"
    assert meta["pixel_scale_arcsec"] == pytest.approx(6.15, abs=0.05)


# --- FITS Image Normalization & Processing ------------------------------------

def _create_synthetic_fits_cutout(shape=(24, 24), fill_pattern="gradient"):
    hdul = fits.HDUList()
    hdul.append(fits.PrimaryHDU())
    
    if fill_pattern == "gradient":
        y, x = np.mgrid[0:shape[0], 0:shape[1]]
        data = (x + y).astype(np.float32)
    elif fill_pattern == "nans":
        data = np.full(shape, np.nan, dtype=np.float32)
    else:
        data = np.zeros(shape, dtype=np.float32)

    hdr = _make_sample_wcs_header(shape[1], shape[0])
    img_hdu = fits.ImageHDU(data=data, header=hdr, name="IMAGE")
    hdul.append(img_hdu)

    buf = io.BytesIO()
    hdul.writeto(buf)
    return buf.getvalue()


def test_process_fits_image_valid():
    fits_bytes = _create_synthetic_fits_cutout()
    png_bytes, meta = process_fits_image(fits_bytes, target_ra=10.0, target_dec=40.0)
    
    assert isinstance(png_bytes, bytes)
    assert len(png_bytes) > 50
    assert meta["dimensions"] == [24, 24]
    assert meta["bunit"] == "MJy / sr"
    assert meta["obs_id"] == "TEST_SPHEREx_01"
    assert meta["inside_footprint"] is True
    assert "Asinh" in meta["stretch"]

    # Verify PNG is valid and decodable
    pil_img = Image.open(io.BytesIO(png_bytes))
    assert pil_img.format == "PNG"
    assert pil_img.size == (24, 24)


def test_process_fits_image_with_nans_does_not_crash():
    fits_bytes = _create_synthetic_fits_cutout(fill_pattern="nans")
    png_bytes, meta = process_fits_image(fits_bytes, target_ra=10.0, target_dec=40.0)
    assert isinstance(png_bytes, bytes)
    assert meta["dimensions"] == [24, 24]


def test_process_fits_image_invalid_bytes_raises():
    with pytest.raises(FitsServiceError):
        process_fits_image(b"not a valid fits file", target_ra=10.0, target_dec=40.0)


# --- HDU 1 End Offset Detection & Partial Cutout Optimization -----------------

def test_find_hdu1_end_offset_valid():
    fits_bytes = _create_synthetic_fits_cutout(shape=(24, 24))
    offset = find_hdu1_end_offset(fits_bytes)
    assert offset is not None
    assert offset <= len(fits_bytes)
    assert offset % 2880 == 0

    # Ensure sliced bytes are a complete valid FITS file with HDU 1
    with fits.open(io.BytesIO(fits_bytes[:offset])) as hdul:
        assert len(hdul) >= 2
        assert hdul[1].name == "IMAGE"
        assert hdul[1].data.shape == (24, 24)


def test_find_hdu1_end_offset_truncated():
    fits_bytes = _create_synthetic_fits_cutout(shape=(24, 24))
    # Truncate halfway through header
    assert find_hdu1_end_offset(fits_bytes[:3000]) is None
    # Truncate to zero bytes
    assert find_hdu1_end_offset(b"") is None


def test_fits_service_error_structure():
    err = FitsServiceError("Service unavailable", status_code=503, error_code="upstream_503", details={"try": 1})
    assert err.status_code == 503
    assert err.error_code == "upstream_503"
    assert err.details == {"try": 1}
    assert str(err) == "Service unavailable"
