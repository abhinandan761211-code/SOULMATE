"""Settings loaded from environment variables (.env locally, dashboard on Render)."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- Supabase -------------------------------------------------------
    supabase_url: str = ""
    # service_role key → the API runs with full access (RLS bypassed).
    # The backend therefore scopes every query by the caller's user id itself.
    supabase_service_role_key: str = ""
    # fallback used only in local dev when no service role key is set
    supabase_anon_key: str = ""

    # --- Google OAuth (kept server-side, never shipped to the browser) --
    google_client_id: str = ""
    google_client_secret: str = ""

    # --- CORS -----------------------------------------------------------
    # comma-separated list, e.g. "https://soulmate.netlify.app,http://localhost:5199"
    cors_origins: str = "http://localhost:5199,http://localhost:5173"

    # --- misc -----------------------------------------------------------
    app_name: str = "SoulMate API"
    environment: str = "development"

    @property
    def api_key(self) -> str:
        """Key used for the Supabase REST/storage calls."""
        return self.supabase_service_role_key or self.supabase_anon_key

    @property
    def allowed_origins(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_configured(self) -> bool:
        return bool(self.supabase_url and self.api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
