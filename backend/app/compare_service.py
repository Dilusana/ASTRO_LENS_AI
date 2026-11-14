"""Astronomical image co-registration, WCS reprojection, and multi-epoch comparison.

Provides scientifically rigorous alignment of two SPHEREx FITS observations onto a
shared celestial tangent plane grid (North-up, East-left) with identical pixel scale,
joint Asinh contrast stretching, spatial overlap verification, and spectral band
compatibility validation.
"""

from __future__ import annotations

import base64
import io
import json
import logging
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
import numpy as np
from astropy.io import fits
from PIL import Image

from .fits_service import (
    CUTOUT_CACHE_DIR,
    PREVIEW_CACHE_DIR,
    USER_AGENT,
    FitsServiceError,
    compute_wcs_orientation,
    fetch_cutout_bytes,
    find_hdu1_end_offset,
    get_cache_key,
    validate_trusted_irsa_url,
    world_to_tan_pixel,
)

logger = logging.getLogger("astrolens.compare")

STANDARD_PIXEL_SCALE_ARCSEC = 6.155
DEFAULT_GRID_SIZE = 25


def extract_bandpass(hdr: fits.Header) -> str:
    """Extract standard SPHEREx bandpass from header keywords."""
    det = hdr.get("DETECTOR")
    if det is not None:
        return f"SPHEREx-D{det}"
    filt = hdr.get("FILTER", hdr.get("BANDPASS", hdr.get("BAND")))
    if filt:
        return str(filt).strip()
    return "Unknown"


def parse_iso_datetime(dt_str: str | None) -> datetime | None:
    if not dt_str:
        return None
    try:
        # Expected formats: '2026-07-20 06:03:58 UTC' or ISO 8601
        clean = dt_str.replace(" UTC", "").replace("Z", "").strip()
        return datetime.fromisoformat(clean).replace(tzinfo=timezone.utc)
    except Exception:
        return None


def reproject_to_tangent_grid(
    data: np.ndarray,
    header: fits.Header,
    ra0: float,
    dec0: float,
    grid_size: int = DEFAULT_GRID_SIZE,
    scale_arcsec: float = STANDARD_PIXEL_SCALE_ARCSEC,
    interpolation: str = "nearest",
) -> np.ndarray:
    """Reproject a 2D scientific FITS array onto a standard celestial tangent plane grid.

    Output grid properties:
    - Center (u0, v0) is fixed at (ra0, dec0).
    - Grid is standard astronomical orientation: +v is North (up), -u is East (left).
    - Pixel scale is exactly scale_arcsec (default 6.155 arcsec/pixel).
    - Supports 'nearest' (authentic instrument pixels) and 'bilinear' (smooth continuous visualization) interpolation.
    """
    naxis1 = data.shape[1]
    naxis2 = data.shape[0]

    u0 = (grid_size - 1) / 2.0
    v0 = (grid_size - 1) / 2.0
    scale_rad = math.radians(scale_arcsec / 3600.0)
    ra0_rad = math.radians(ra0)
    dec0_rad = math.radians(dec0)
    cos_d0 = math.cos(dec0_rad)
    sin_d0 = math.sin(dec0_rad)

    out = np.full((grid_size, grid_size), np.nan, dtype=np.float32)

    for v in range(grid_size):
        for u in range(grid_size):
            # North is +v, East is -u
            xi = -(u - u0) * scale_rad
            eta = (v - v0) * scale_rad
            r = math.hypot(xi, eta)
            if r < 1e-12:
                ra_deg, dec_deg = ra0, dec0
            else:
                c = math.atan(r)
                sin_c = math.sin(c)
                cos_c = math.cos(c)
                sin_d = cos_c * sin_d0 + (eta * sin_c * cos_d0) / r
                dec_rad = math.asin(max(-1.0, min(1.0, sin_d)))
                dec_deg = math.degrees(dec_rad)
                denom = r * cos_d0 * cos_c - eta * sin_d0 * sin_c
                numer = xi * sin_c
                dra = math.atan2(numer, denom)
                ra_deg = (math.degrees(ra0_rad + dra)) % 360.0

            px, py, inside = world_to_tan_pixel(ra_deg, dec_deg, header)
            if px is not None and py is not None and 0 <= px <= naxis1 - 1 and 0 <= py <= naxis2 - 1:
                if interpolation == "nearest":
                    x_near = int(math.floor(px + 0.5))
                    y_near = int(math.floor(py + 0.5))
                    if 0 <= x_near < naxis1 and 0 <= y_near < naxis2:
                        val = data[y_near, x_near]
                        if np.isfinite(val):
                            out[v, u] = val
                else:
                    x0, y0 = int(math.floor(px)), int(math.floor(py))
                    x1, y1 = min(x0 + 1, naxis1 - 1), min(y0 + 1, naxis2 - 1)
                    wx, wy = px - x0, py - y0
                    p00 = data[y0, x0]
                    p01 = data[y0, x1]
                    p10 = data[y1, x0]
                    p11 = data[y1, x1]

                    if np.all(np.isfinite([p00, p01, p10, p11])):
                        val = (
                            (1 - wx) * (1 - wy) * p00
                            + wx * (1 - wy) * p01
                            + (1 - wx) * wy * p10
                            + wx * wy * p11
                        )
                        out[v, u] = val
                    elif np.isfinite(p00):
                        out[v, u] = p00

    return out


async def load_cutout_fits(
    client: httpx.AsyncClient,
    trusted_url: str,
    ra: float,
    dec: float,
    size_deg: float,
) -> tuple[np.ndarray, fits.Header, str]:
    """Retrieve FITS cutout bytes from disk cache or IRSA, and return (data, header, obs_id)."""
    cache_key = get_cache_key(trusted_url, ra, dec, size_deg)
    cutout_fits_file = CUTOUT_CACHE_DIR / f"{cache_key}.fits"

    fits_bytes: bytes | None = None
    if cutout_fits_file.exists():
        try:
            fits_bytes = cutout_fits_file.read_bytes()
        except Exception:
            fits_bytes = None

    # Check if a standard 0.04 cutout is already cached when querying a sub-field or fallback
    if not fits_bytes and size_deg <= 0.04:
        alt_key = get_cache_key(trusted_url, ra, dec, 0.04)
        alt_file = CUTOUT_CACHE_DIR / f"{alt_key}.fits"
        if alt_file.exists():
            try:
                fits_bytes = alt_file.read_bytes()
            except Exception:
                pass

    if not fits_bytes:
        cutout_url = f"{trusted_url}?center={ra:.8f},{dec:.8f}&size={size_deg:.4f}"
        try:
            fits_bytes = await fetch_cutout_bytes(client, cutout_url)
            try:
                cutout_fits_file.write_bytes(fits_bytes)
            except Exception:
                pass
        except Exception as exc:
            # If IRSA is busy (e.g. 503) or rate-limiting for a larger size, fallback to cached 0.04
            alt_key = get_cache_key(trusted_url, ra, dec, 0.04)
            alt_file = CUTOUT_CACHE_DIR / f"{alt_key}.fits"
            if alt_file.exists():
                logger.warning(
                    "Cutout download for size %.4f failed (%s); using cached 0.04 cutout with tangent reprojection",
                    size_deg,
                    exc,
                )
                fits_bytes = alt_file.read_bytes()
            else:
                raise

    # Extract 2D IMAGE HDU
    with fits.open(io.BytesIO(fits_bytes)) as hdul:
        img_hdu = None
        if "IMAGE" in hdul and hdul["IMAGE"].data is not None and hdul["IMAGE"].data.ndim == 2:
            img_hdu = hdul["IMAGE"]
        else:
            for h in hdul:
                if h.data is not None and getattr(h.data, "ndim", 0) == 2:
                    img_hdu = h
                    break

        if img_hdu is None:
            raise FitsServiceError("No 2D scientific image plane found in cutout.")

        header = img_hdu.header.copy()
        data = np.asarray(img_hdu.data, dtype=np.float32)
        obs_id = str(header.get("OBS_ID", header.get("OBSID", "SPHEREx Level-2"))).strip()

    return data, header, obs_id


def array_to_base64_png(norm_img: np.ndarray) -> str:
    """Convert an 8-bit normalized 2D image array (flipped for display) to base64 PNG data URL."""
    display_img = np.flipud(norm_img)
    pil_img = Image.fromarray(display_img, mode="L")
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG", optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64}"


async def compare_two_epochs(
    fits_url_1: str,
    fits_url_2: str,
    ra: float,
    dec: float,
    size_deg: float = 0.04,
    grid_size: int | None = None,
    interpolation: str = "nearest",
) -> dict[str, Any]:
    """Co-register two real SPHEREx observations, reproject to common grid, and return comparison metadata."""
    trusted_url_1 = validate_trusted_irsa_url(fits_url_1)
    trusted_url_2 = validate_trusted_irsa_url(fits_url_2)

    # Determine co-registered tangent grid dimensions from requested Field of View
    if grid_size is None:
        calc_size = int(round((size_deg * 3600.0) / STANDARD_PIXEL_SCALE_ARCSEC))
        grid_size = calc_size if (calc_size % 2 == 1) else (calc_size + 1)
        grid_size = max(9, min(grid_size, 101))

    # Sanitize interpolation mode
    interp_mode = "bilinear" if str(interpolation).lower() == "bilinear" else "nearest"

    timeout = httpx.Timeout(60.0, connect=15.0)
    async with httpx.AsyncClient(timeout=timeout, headers={"User-Agent": USER_AGENT}) as client:
        data1, hdr1, obs_id1 = await load_cutout_fits(client, trusted_url_1, ra, dec, size_deg)
        data2, hdr2, obs_id2 = await load_cutout_fits(client, trusted_url_2, ra, dec, size_deg)

    # Validate target footprint coverage
    _, _, inside1 = world_to_tan_pixel(ra, dec, hdr1)
    _, _, inside2 = world_to_tan_pixel(ra, dec, hdr2)

    wcs1 = compute_wcs_orientation(hdr1)
    wcs2 = compute_wcs_orientation(hdr2)

    # Reproject both onto identical tangent plane grid using selected interpolation
    grid1 = reproject_to_tangent_grid(data1, hdr1, ra, dec, grid_size=grid_size, interpolation=interp_mode)
    grid2 = reproject_to_tangent_grid(data2, hdr2, ra, dec, grid_size=grid_size, interpolation=interp_mode)

    # Compute spatial overlap
    valid1 = np.isfinite(grid1)
    valid2 = np.isfinite(grid2)
    both_valid = valid1 & valid2
    total_cells = grid_size * grid_size
    overlap_count = int(np.sum(both_valid))
    overlap_pct = round((overlap_count / total_cells) * 100.0, 1)
    sufficient_overlap = overlap_pct >= 50.0

    # Extract astronomical dates and metadata
    date_str1 = str(hdr1.get("DATE-OBS", hdr1.get("DATE_OBS", ""))).strip()
    date_str2 = str(hdr2.get("DATE-OBS", hdr2.get("DATE_OBS", ""))).strip()
    dt1 = parse_iso_datetime(date_str1)
    dt2 = parse_iso_datetime(date_str2)

    delta_days: float | None = None
    delta_hours: float | None = None
    is_chronological: bool = True
    temporal_order: str = "chronological"
    if dt1 and dt2:
        diff_sec = (dt2 - dt1).total_seconds()
        is_chronological = (diff_sec >= 0)
        temporal_order = "chronological" if is_chronological else "reversed"
        delta_days = round(abs(diff_sec) / 86400.0, 2)
        delta_hours = round(abs(diff_sec) / 3600.0, 1)

    # Extract bandpasses
    band1 = extract_bandpass(hdr1)
    band2 = extract_bandpass(hdr2)
    compatible_bandpass = (band1 == band2) and (band1 != "Unknown")

    # Joint Intensity Normalization (consistent stretch scale)
    all_valid_pixels = np.concatenate([grid1[valid1], grid2[valid2]]) if (np.any(valid1) and np.any(valid2)) else np.array([0.0, 1.0])
    if len(all_valid_pixels) > 0:
        joint_vmin = float(np.percentile(all_valid_pixels, 0.5))
        joint_vmax = float(np.percentile(all_valid_pixels, 99.5))
    else:
        joint_vmin, joint_vmax = 0.0, 1.0

    if joint_vmax <= joint_vmin:
        joint_vmax = joint_vmin + 1e-6

    # Apply identical Asinh stretch to both reprojected grids
    def normalize_grid(arr: np.ndarray) -> np.ndarray:
        clipped = np.clip((arr - joint_vmin) / (joint_vmax - joint_vmin), 0.0, 1.0)
        non_linear = 0.1
        factor = math.asinh(1.0 / non_linear)
        asinh_scaled = np.arcsinh(clipped / non_linear) / factor
        asinh_scaled = np.nan_to_num(asinh_scaled, nan=0.0)
        return np.clip(asinh_scaled * 255.0, 0, 255).astype(np.uint8)

    norm1 = normalize_grid(grid1)
    norm2 = normalize_grid(grid2)

    # Difference image (Epoch 2 - Epoch 1 on identical physical grid)
    diff_arr = np.where(both_valid, grid2 - grid1, np.nan)
    diff_valid = diff_arr[np.isfinite(diff_arr)]
    mean_diff = float(np.mean(diff_valid)) if len(diff_valid) > 0 else 0.0
    std_diff = float(np.std(diff_valid)) if len(diff_valid) > 0 else 0.0

    # Build base64 PNG data URLs
    png_b64_1 = array_to_base64_png(norm1)
    png_b64_2 = array_to_base64_png(norm2)

    # Relative rotation angle difference
    pa1 = wcs1["north_position_angle_deg"]
    pa2 = wcs2["north_position_angle_deg"]
    rotation_diff_deg = round(abs(pa2 - pa1) % 360.0, 2)
    if rotation_diff_deg > 180.0:
        rotation_diff_deg = round(360.0 - rotation_diff_deg, 2)

    # Construct warnings
    warnings_list = []
    if not compatible_bandpass:
        warnings_list.append(
            f"Bandpass mismatch: Epoch 1 is in {band1} while Epoch 2 is in {band2}. "
            "SPHEREx Linear Variable Filters observe different wavelengths across bands. "
            "Brightness differences between different filters reflect infrared color, NOT object motion or discoveries."
        )

    if not sufficient_overlap:
        warnings_list.append(
            f"Low spatial overlap ({overlap_pct}%). The telescope pointings only partially overlap at this coordinate."
        )

    if delta_hours is not None and delta_hours < 1.0:
        warnings_list.append(
            "Observations from the same orbit or epoch. Detector differences between frames from the same visit "
            "are instrumental scan variations and must NOT be interpreted as physical movement."
        )

    if not is_chronological:
        warnings_list.append(
            "Reversed chronological input: Epoch 1 is dated later than Epoch 2. "
            "AstroLens X has aligned the data as requested, but astronomical baseline comparisons "
            "typically treat the earlier visit as the baseline (Epoch 1) and the later visit as the repeat (Epoch 2)."
        )

    return {
        "target_coordinates": {"ra": ra, "dec": dec},
        "epoch1": {
            "obs_id": obs_id1,
            "observation_date": date_str1 or "Unknown",
            "bandpass": band1,
            "bunit": str(hdr1.get("BUNIT", "MJy / sr")),
            "flux_min": round(float(np.nanmin(grid1)), 4) if np.any(valid1) else 0.0,
            "flux_max": round(float(np.nanmax(grid1)), 4) if np.any(valid1) else 0.0,
            "inside_footprint": inside1,
            "wcs": wcs1,
            "preview_png": png_b64_1,
        },
        "epoch2": {
            "obs_id": obs_id2,
            "observation_date": date_str2 or "Unknown",
            "bandpass": band2,
            "bunit": str(hdr2.get("BUNIT", "MJy / sr")),
            "flux_min": round(float(np.nanmin(grid2)), 4) if np.any(valid2) else 0.0,
            "flux_max": round(float(np.nanmax(grid2)), 4) if np.any(valid2) else 0.0,
            "inside_footprint": inside2,
            "wcs": wcs2,
            "preview_png": png_b64_2,
        },
        "registration": {
            "status": "aligned",
            "method": "Tangent Plane WCS Reprojection (North-up, East-left)",
            "grid_dimensions": [grid_size, grid_size],
            "common_pixel_scale_arcsec": STANDARD_PIXEL_SCALE_ARCSEC,
            "field_of_view_deg": round(size_deg, 4),
            "field_of_view_arcmin": round(size_deg * 60.0, 2),
            "display_interpolation": interp_mode,
            "interpolation_label": (
                "Bilinear Resampling (Visualization Only)"
                if interp_mode == "bilinear"
                else "Nearest Neighbor (Raw Detector Pixels)"
            ),
            "interpolation_notice": (
                "Visualization Only: Bilinear interpolation creates a continuous visual appearance, "
                "but does NOT increase scientific optical resolution or reveal sub-pixel detail. "
                "The native SPHEREx instrument pixel scale is 6.155″/pixel with an optical PSF FWHM of ~7.5″. "
                "True astrophysical photometric measurements are derived strictly from raw detector pixel fluxes."
                if interp_mode == "bilinear"
                else "Displays discrete detector pixels exactly as recorded by SPHEREx instruments, preserving unblended peak pixel intensities."
            ),
            "psf_fwhm_arcsec": 7.5,
            "relative_rotation_deg": rotation_diff_deg,
            "spatial_overlap_percent": overlap_pct,
            "sufficient_overlap": sufficient_overlap,
            "compatible_bandpass": compatible_bandpass,
            "delta_days": delta_days,
            "delta_hours": delta_hours,
            "is_chronological": is_chronological,
            "temporal_order": temporal_order,
            "earlier_epoch": "epoch1" if is_chronological else "epoch2",
            "later_epoch": "epoch2" if is_chronological else "epoch1",
            "joint_stretch": "Asinh (joint 0.5% - 99.5% percentile interval)",
            "joint_flux_min": round(joint_vmin, 4),
            "joint_flux_max": round(joint_vmax, 4),
            "mean_flux_difference": round(mean_diff, 4),
            "std_flux_difference": round(std_diff, 4),
            "warnings": warnings_list,
        },
        "scientific_caution": (
            "Never interpret pixel differences as confirmed object motion or scientific discovery. "
            "SPHEREx Linear Variable Filters (LVF) vary spectral wavelength continuously across the detector. "
            "Repeat visits often observe different wavelengths or scan angles. Professional astronomers "
            "verify true changes only with calibrated multi-band spectroscopy."
        ),
    }
