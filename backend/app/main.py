from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .compare_service import compare_two_epochs
from .fits_service import FitsServiceError, get_or_render_preview
from .spherex import SpherexError, search_observations

app = FastAPI(title="AstroLens X SPHEREx API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "archive": "IRSA SPHEREx"}


@app.get("/api/spherex/observations")
async def spherex_observations(
    ra: float = Query(..., ge=0, lt=360, description="Right ascension in ICRS degrees"),
    dec: float = Query(..., ge=-90, le=90, description="Declination in ICRS degrees"),
    radius_deg: float = Query(0.01, gt=0, le=0.05),
    max_records: int = Query(80, ge=1, le=150),
) -> dict:
    rad = radius_deg.default if hasattr(radius_deg, "default") else radius_deg
    max_rec = max_records.default if hasattr(max_records, "default") else max_records
    try:
        return await search_observations(ra, dec, rad, max_rec)
    except SpherexError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@app.get("/api/spherex/preview")
async def spherex_preview(
    fits_url: str = Query(..., description="NASA IRSA SPHEREx FITS URL"),
    ra: float = Query(..., ge=0, lt=360, description="Right ascension in ICRS degrees"),
    dec: float = Query(..., ge=-90, le=90, description="Declination in ICRS degrees"),
    size_deg: float = Query(0.04, gt=0, le=0.1, description="Cutout size in degrees"),
) -> Response:
    s_deg = size_deg.default if hasattr(size_deg, "default") else size_deg
    try:
        png_bytes, metadata = await get_or_render_preview(fits_url, ra, dec, s_deg)
        headers = {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=86400",
            "X-Fits-Obs-Id": str(metadata.get("obs_id", "")),
            "X-Fits-BUnit": str(metadata.get("bunit", "")),
            "X-Fits-Inside-Footprint": str(metadata.get("inside_footprint", False)).lower(),
            "X-Fits-Dimensions": f"{metadata['dimensions'][0]}x{metadata['dimensions'][1]}",
        }
        return Response(content=png_bytes, media_type="image/png", headers=headers)
    except FitsServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@app.get("/api/spherex/preview_meta")
async def spherex_preview_meta(
    fits_url: str = Query(..., description="NASA IRSA SPHEREx FITS URL"),
    ra: float = Query(..., ge=0, lt=360, description="Right ascension in ICRS degrees"),
    dec: float = Query(..., ge=-90, le=90, description="Declination in ICRS degrees"),
    size_deg: float = Query(0.04, gt=0, le=0.1, description="Cutout size in degrees"),
) -> dict:
    s_deg = size_deg.default if hasattr(size_deg, "default") else size_deg
    try:
        _, metadata = await get_or_render_preview(fits_url, ra, dec, s_deg)
        return metadata
    except FitsServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@app.get("/api/spherex/compare")
async def spherex_compare(
    fits_url_1: str = Query(..., description="First epoch NASA IRSA FITS URL"),
    fits_url_2: str = Query(..., description="Second epoch NASA IRSA FITS URL"),
    ra: float = Query(..., ge=0, lt=360, description="Right ascension in ICRS degrees"),
    dec: float = Query(..., ge=-90, le=90, description="Declination in ICRS degrees"),
    size_deg: float = Query(0.04, gt=0, le=0.2, description="Cutout field-of-view size in degrees"),
    interpolation: str = Query("nearest", pattern="^(nearest|bilinear)$", description="Display interpolation method"),
) -> dict:
    s_deg = size_deg.default if hasattr(size_deg, "default") else size_deg
    interp = interpolation.default if hasattr(interpolation, "default") else interpolation
    try:
        return await compare_two_epochs(fits_url_1, fits_url_2, ra, dec, s_deg, interpolation=interp)
    except FitsServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
