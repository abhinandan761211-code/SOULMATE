"""WSGI fallback for platforms that expect `app`/`application` at the root."""

from app.main import app  # noqa: F401  (ASGI app; run with uvicorn workers)

application = app
