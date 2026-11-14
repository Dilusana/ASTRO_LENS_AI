from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .spherex import SpherexError, search_observations

app = FastAPI(title="AstroLens X SPHEREx API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
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
