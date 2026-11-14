"""FITS cutout retrieval, WCS coordinate validation, and scientific normalization.

Downloads genuine NASA SPHEREx FITS cutouts from NASA/IPAC IRSA, validates the WCS
footprint against the queried coordinates, applies scientific asinh + percentile stretch,
and generates authentic PNG previews.
"""

from __future__ import annotations

import asyncio
import hashlib
import io
import json
import math
import os
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx
import numpy as np
from astropy.io import fits
from PIL import Image

USER_AGENT = "AstroLensX/0.1 (SPHEREx archive client)"
TRUSTED_HOST = "irsa.ipac.caltech.edu"
TRUSTED_PATH_PREFIX = "/ibe/data/spherex/"
MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024  # 20 MB limit to prevent resource exhaustion
DEFAULT_CUTOUT_SIZE_DEG = 0.04
CACHE_DIR = Path(__file__).resolve().parent.parent / ".cache"
CUTOUT_CACHE_DIR = CACHE_DIR / "cutouts"
PREVIEW_CACHE_DIR = CACHE_DIR / "previews"


class FitsServiceError(Exception):
    def __init__(self, message: str, status_code: int = 502) -> None:
        super().__init__(message)
        self.status_code = status_code


def _ensure_cache_dirs() -> None:
    CUTOUT_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_CACHE_DIR.mkdir(parents=True, exist_ok=True)


def validate_trusted_irsa_url(url: str | None) -> str:
    """Validate that the given URL strictly points to NASA IRSA SPHEREx data."""
    if not url or not isinstance(url, str):
        raise FitsServiceError("No FITS access URL provided.", status_code=400)
    parsed = urlparse(url.strip())
    if parsed.scheme != "https":
        raise FitsServiceError("FITS URL must use HTTPS.", status_code=400)
    if parsed.hostname != TRUSTED_HOST:
        raise FitsServiceError(
            f"FITS URL host {parsed.hostname!r} is not trusted NASA IRSA host.",
            status_code=400,
        )
    if not parsed.path.startswith(TRUSTED_PATH_PREFIX) or not parsed.path.endswith(".fits"):
        raise FitsServiceError(
            "FITS URL path must be a valid IRSA SPHEREx .fits product.",
            status_code=400,
        )
    return f"https://{TRUSTED_HOST}{parsed.path}"


def get_cache_key(fits_url: str, ra: float, dec: float, size_deg: float) -> str:
    seed = f"{fits_url}|{ra:.8f}|{dec:.8f}|{size_deg:.4f}"
    return hashlib.sha256(seed.encode("utf-8")).hexdigest()[:24]


def _extract_cd_matrix(header: fits.Header) -> tuple[float, float, float, float]:
    """Extract CD1_1, CD1_2, CD2_1, CD2_2 from header, supporting CD or PC+CDELT."""
    if "CD1_1" in header and "CD2_2" in header:
        return (
            float(header.get("CD1_1", 0.0)),
            float(header.get("CD1_2", 0.0)),
            float(header.get("CD2_1", 0.0)),
            float(header.get("CD2_2", 0.0)),
        )

    # Fallback to PC matrix + CDELT
    cdelt1 = float(header.get("CDELT1", 1.0))
    cdelt2 = float(header.get("CDELT2", 1.0))
    pc1_1 = float(header.get("PC1_1", header.get("PC001001", 1.0)))
    pc1_2 = float(header.get("PC1_2", header.get("PC001002", 0.0)))
    pc2_1 = float(header.get("PC2_1", header.get("PC002001", 0.0)))
    pc2_2 = float(header.get("PC2_2", header.get("PC002002", 1.0)))

    return (
        pc1_1 * cdelt1,
        pc1_2 * cdelt1,
        pc2_1 * cdelt2,
        pc2_2 * cdelt2,
    )


def world_to_tan_pixel(
    ra_deg: float,
    dec_deg: float,
    header: fits.Header,
) -> tuple[float | None, float | None, bool]:
    """Calculate 0-indexed pixel coordinates (x, y) for an RA/Dec position using FITS TAN projection.

    Returns (x, y, inside_footprint).
    """
    crval1 = float(header.get("CRVAL1", 0.0))
    crval2 = float(header.get("CRVAL2", 0.0))
    crpix1 = float(header.get("CRPIX1", 1.0))
    crpix2 = float(header.get("CRPIX2", 1.0))
    naxis1 = int(header.get("NAXIS1", 0))
    naxis2 = int(header.get("NAXIS2", 0))

    cd11, cd12, cd21, cd22 = _extract_cd_matrix(header)
    det = cd11 * cd22 - cd12 * cd21
    if abs(det) < 1e-15:
        return None, None, False

    ra0 = math.radians(crval1)
    dec0 = math.radians(crval2)
    ra = math.radians(ra_deg)
    dec = math.radians(dec_deg)

    cos_c = math.sin(dec0) * math.sin(dec) + math.cos(dec0) * math.cos(dec) * math.cos(ra - ra0)
    if cos_c <= 0:
        return None, None, False  # Coordinate is on opposite hemisphere

    xi = (math.cos(dec) * math.sin(ra - ra0)) / cos_c
    eta = (math.cos(dec0) * math.sin(dec) - math.sin(dec0) * math.cos(dec) * math.cos(ra - ra0)) / cos_c

    xi_deg = math.degrees(xi)
    eta_deg = math.degrees(eta)

    inv_cd11 = cd22 / det
    inv_cd12 = -cd12 / det
    inv_cd21 = -cd21 / det
    inv_cd22 = cd11 / det

    dx = inv_cd11 * xi_deg + inv_cd12 * eta_deg
    dy = inv_cd21 * xi_deg + inv_cd22 * eta_deg

    # FITS uses 1-based indexing; convert to 0-based pixel index
    x = (crpix1 + dx) - 1.0
    y = (crpix2 + dy) - 1.0

    inside = 0 <= x < naxis1 and 0 <= y < naxis2
    return round(x, 2), round(y, 2), inside


def compute_wcs_orientation(header: fits.Header) -> dict[str, Any]:
    """Compute astronomical orientation and scale from WCS metadata."""
    cd11, cd12, cd21, cd22 = _extract_cd_matrix(header)
    det = cd11 * cd22 - cd12 * cd21

    # North vector in pixel space: direction of d(Dec)
    # East vector in pixel space: direction of d(RA)
    if abs(det) > 1e-15:
        # Inverse CD matrix transforms world offsets to pixel offsets
        inv_cd12 = -cd12 / det
        inv_cd22 = cd11 / det
        # Position angle of North relative to the array's +Y axis
        north_pa_deg = math.degrees(math.atan2(-inv_cd12, inv_cd22)) % 360.0
    else:
        north_pa_deg = 0.0

    # Pixel scale in arcseconds
    scale_deg_x = math.sqrt(cd11**2 + cd21**2)
    scale_deg_y = math.sqrt(cd12**2 + cd22**2)
    scale_arcsec = (scale_deg_x + scale_deg_y) / 2.0 * 3600.0

    return {
        "north_position_angle_deg": round(north_pa_deg, 2),
        "pixel_scale_arcsec": round(scale_arcsec, 3),
        "parity": "standard" if det < 0 else "reversed",
        "has_wcs": abs(det) > 1e-15,
    }


def process_fits_image(
    fits_bytes: bytes,
    target_ra: float,
    target_dec: float,
) -> tuple[bytes, dict[str, Any]]:
    """Inspect FITS HDUs, extract scientific 2D IMAGE plane, validate WCS footprint,

    normalize with Asinh + Percentile stretch, and encode to PNG.
    """
    try:
        with fits.open(io.BytesIO(fits_bytes)) as hdul:
            # Locate the primary scientific image HDU
            image_hdu = None
            if "IMAGE" in hdul and hdul["IMAGE"].data is not None and hdul["IMAGE"].data.ndim == 2:
                image_hdu = hdul["IMAGE"]
            else:
                for h in hdul:
                    if h.data is not None and getattr(h.data, "ndim", 0) == 2:
                        image_hdu = h
                        break

            if image_hdu is None:
                raise FitsServiceError("No 2D scientific image plane found in FITS cutout.")

            header = image_hdu.header
            raw_data = np.asarray(image_hdu.data, dtype=np.float32)
            bunit = str(header.get("BUNIT", "MJy / sr")).strip()
            obs_id = str(header.get("OBS_ID", header.get("OBSID", "SPHEREx Level-2"))).strip()
            naxis1 = int(header.get("NAXIS1", raw_data.shape[1]))
            naxis2 = int(header.get("NAXIS2", raw_data.shape[0]))

            # Validate coordinate footprint using FITS WCS
            px, py, inside = world_to_tan_pixel(target_ra, target_dec, header)
            wcs_meta = compute_wcs_orientation(header)

            # Scientific image normalization
            valid_mask = np.isfinite(raw_data)
            if not np.any(valid_mask):
                norm_img = np.zeros(raw_data.shape, dtype=np.uint8)
                vmin, vmax = 0.0, 0.0
            else:
                valid_pixels = raw_data[valid_mask]
                vmin = float(np.percentile(valid_pixels, 0.5))
                vmax = float(np.percentile(valid_pixels, 99.5))
                if vmax <= vmin:
                    vmax = vmin + 1e-6

                # Scale to [0, 1]
                clipped = np.clip((raw_data - vmin) / (vmax - vmin), 0.0, 1.0)

                # Standard astronomical asinh stretch
                non_linear = 0.1
                factor = math.asinh(1.0 / non_linear)
                asinh_scaled = np.arcsinh(clipped / non_linear) / factor
                asinh_scaled = np.nan_to_num(asinh_scaled, nan=0.0)

                norm_img = np.clip(asinh_scaled * 255.0, 0, 255).astype(np.uint8)

            # FITS native coordinates have row 0 at bottom.
            # In screen coordinates, row 0 is at top, so flip vertically for standard display orientation.
            display_img = np.flipud(norm_img)

            # Compute target pixel coordinates in the display coordinate space (0-based from top-left)
            display_target_x = px
            display_target_y = (naxis2 - 1.0 - py) if py is not None else None

            # Convert to PNG using Pillow
            pil_image = Image.fromarray(display_img, mode="L")
            png_buffer = io.BytesIO()
            pil_image.save(png_buffer, format="PNG", optimize=True)
            png_bytes = png_buffer.getvalue()

            metadata = {
                "dimensions": [naxis1, naxis2],
                "bunit": bunit,
                "obs_id": obs_id,
                "flux_min": round(vmin, 4),
                "flux_max": round(vmax, 4),
                "stretch": "Asinh (99.5% percentile interval)",
                "target_coordinates": {"ra": target_ra, "dec": target_dec},
                "target_pixel": {
                    "fits_x": px,
                    "fits_y": py,
                    "display_x": round(display_target_x, 1) if display_target_x is not None else None,
                    "display_y": round(display_target_y, 1) if display_target_y is not None else None,
                },
                "inside_footprint": inside,
                "wcs": wcs_meta,
            }

            return png_bytes, metadata

    except Exception as exc:
        if isinstance(exc, FitsServiceError):
            raise
        raise FitsServiceError(f"Failed to process FITS cutout: {exc}") from exc


_IN_FLIGHT_LOCKS: dict[str, asyncio.Lock] = {}


async def fetch_cutout_bytes(
    client: httpx.AsyncClient,
    cutout_url: str,
) -> bytes:
    """Download cutout bytes with size limits, retry on 503/429, and timeout handling."""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            async with client.stream("GET", cutout_url) as response:
                if response.status_code in (502, 503, 429) and attempt < max_retries - 1:
                    await asyncio.sleep(2.0 * (attempt + 1))
                    continue

                if response.status_code != 200:
                    raise FitsServiceError(
                        f"IRSA cutout service returned HTTP {response.status_code}.",
                        status_code=502,
                    )

                # Verify Content-Length header if present
                cl_header = response.headers.get("content-length")
                if cl_header and int(cl_header) > MAX_DOWNLOAD_BYTES:
                    raise FitsServiceError(
                        f"Cutout size ({cl_header} bytes) exceeds limit of {MAX_DOWNLOAD_BYTES} bytes.",
                        status_code=502,
                    )

                buffer = io.BytesIO()
                total_bytes = 0
                async for chunk in response.aiter_bytes(chunk_size=65536):
                    total_bytes += len(chunk)
                    if total_bytes > MAX_DOWNLOAD_BYTES:
                        raise FitsServiceError(
                            f"Cutout exceeded download limit of {MAX_DOWNLOAD_BYTES} bytes.",
                            status_code=502,
                        )
                    buffer.write(chunk)

                return buffer.getvalue()

        except httpx.TimeoutException as exc:
            if attempt < max_retries - 1:
                await asyncio.sleep(2.0)
                continue
            raise FitsServiceError(
                "Timed out downloading SPHEREx FITS cutout from NASA IRSA.",
                status_code=504,
            ) from exc
        except httpx.HTTPError as exc:
            if attempt < max_retries - 1:
                await asyncio.sleep(2.0)
                continue
            raise FitsServiceError(
                f"Network error downloading SPHEREx FITS cutout: {exc}",
                status_code=502,
            ) from exc

    raise FitsServiceError("IRSA cutout service was temporarily unavailable.", status_code=503)


async def get_or_render_preview(
    fits_url: str,
    ra: float,
    dec: float,
    size_deg: float = DEFAULT_CUTOUT_SIZE_DEG,
) -> tuple[bytes, dict[str, Any]]:
    """Retrieve or compute a cached SPHEREx FITS cutout PNG preview and its metadata."""
    _ensure_cache_dirs()
    trusted_url = validate_trusted_irsa_url(fits_url)
    cache_key = get_cache_key(trusted_url, ra, dec, size_deg)

    png_cache_file = PREVIEW_CACHE_DIR / f"{cache_key}.png"
    meta_cache_file = PREVIEW_CACHE_DIR / f"{cache_key}.json"

    # Fast cache hit
    if png_cache_file.exists() and meta_cache_file.exists():
        try:
            png_bytes = png_cache_file.read_bytes()
            metadata = json.loads(meta_cache_file.read_text(encoding="utf-8"))
            metadata["cached"] = True
            return png_bytes, metadata
        except Exception:
            pass  # Fall through to re-download if cache was corrupted

    # Deduplicate concurrent requests for the exact same cutout
    lock = _IN_FLIGHT_LOCKS.setdefault(cache_key, asyncio.Lock())
    async with lock:
        # Re-check cache in case another task populated it while waiting for the lock
        if png_cache_file.exists() and meta_cache_file.exists():
            try:
                png_bytes = png_cache_file.read_bytes()
                metadata = json.loads(meta_cache_file.read_text(encoding="utf-8"))
                metadata["cached"] = True
                return png_bytes, metadata
            except Exception:
                pass

        # Construct the IRSA cutout URL
        cutout_url = f"{trusted_url}?center={ra:.8f},{dec:.8f}&size={size_deg:.4f}"

        timeout = httpx.Timeout(90.0, connect=20.0)
        async with httpx.AsyncClient(timeout=timeout, headers={"User-Agent": USER_AGENT}) as client:
            fits_bytes = await fetch_cutout_bytes(client, cutout_url)

        # Process in worker thread to prevent blocking the async event loop
        png_bytes, metadata = await asyncio.to_thread(process_fits_image, fits_bytes, ra, dec)
        metadata["cached"] = False
        metadata["cutout_url"] = cutout_url
        metadata["source_fits"] = trusted_url

        # Save to disk cache
        try:
            png_cache_file.write_bytes(png_bytes)
            meta_cache_file.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
        except Exception:
            pass

        return png_bytes, metadata
