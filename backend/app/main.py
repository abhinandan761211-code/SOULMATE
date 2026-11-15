"""SoulMate API — FastAPI service deployed on Render, called by the Netlify frontend.

Run locally:
    cd backend
    pip install -r requirements.txt
    uvicorn app.main:app --reload --port 8000

Production (Render):
    gunicorn app.main:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.gzip import GZipMiddleware

from .config import get_settings
from .routers import analysis, challenges, goals, habits, journal, profile, projects

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description=(
        "REST API in front of Supabase for the SoulMate app. "
        "Every request must carry a Supabase access token as a Bearer header; "
        "all data is scoped to that user."
    ),
    docs_url="/docs",
    redoc_url=None,
    openapi_url="/openapi.json",
)

app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=r"https://.*\.netlify\.app",  # deploy previews
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

for router in (
    profile.router,
    journal.router,
    goals.router,
    habits.router,
    projects.router,
    challenges.router,
    analysis.router,
):
    app.include_router(router)


@app.get("/", tags=["health"])
async def root() -> JSONResponse:
    return JSONResponse(
        {
            "service": settings.app_name,
            "version": "1.0.0",
            "status": "ok",
            "docs": "/docs",
        }
    )


@app.get("/health", tags=["health"])
async def health() -> JSONResponse:
    """Render health check — never touches Supabase, so it stays fast and cheap."""
    return JSONResponse({"status": "ok", "supabase": settings.is_configured})


@app.get("/api/health", tags=["health"])
async def api_health() -> JSONResponse:
    return JSONResponse({"status": "ok", "supabaseConfigured": settings.is_configured})
