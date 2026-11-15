"""Thin async wrapper over the Supabase PostgREST + Auth endpoints.

We call the REST API directly with httpx instead of pulling in the Python
Supabase SDK: fewer moving parts, no event-loop quirks under gunicorn/uvicorn,
and the exact same paths PostgREST exposes.
"""

from __future__ import annotations

from typing import Any

import httpx

from .config import get_settings


class SupabaseError(Exception):
    """Raised when Supabase returns a non-2xx response."""

    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message


class SupabaseClient:
    def __init__(self, timeout: float = 15.0) -> None:
        settings = get_settings()
        if not settings.is_configured:
            raise RuntimeError(
                "Supabase is not configured: set SUPABASE_URL and "
                "SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in the environment."
            )
        self.url = settings.supabase_url.rstrip("/")
        self.key = settings.api_key
        self._timeout = timeout

    # ------------------------------ helpers ------------------------------
    def _headers(self, token: str | None, prefer: str | None = None) -> dict[str, str]:
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {token or self.key}",
            "Content-Type": "application/json",
        }
        if prefer:
            headers["Prefer"] = prefer
        return headers

    async def _request(
        self,
        method: str,
        path: str,
        *,
        token: str | None = None,
        params: dict[str, Any] | None = None,
        json: Any = None,
        prefer: str | None = None,
    ) -> Any:
        url = f"{self.url}{path}"
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            res = await client.request(
                method, url, headers=self._headers(token, prefer), params=params, json=json
            )
        if res.status_code >= 400:
            detail = res.text
            try:
                body = res.json()
                detail = body.get("message") or body.get("msg") or body.get("hint") or detail
            except Exception:  # noqa: BLE001 - body may be plain text
                pass
            raise SupabaseError(res.status_code, detail)
        if res.status_code == 204 or not res.content:
            return None
        return res.json()

    # ------------------------------- auth --------------------------------
    async def get_user(self, access_token: str) -> dict[str, Any]:
        """Resolve the Supabase auth user behind a JWT."""
        return await self._request("GET", "/auth/v1/user", token=access_token)

    # ------------------------------ tables -------------------------------
    async def select(
        self,
        table: str,
        *,
        token: str | None = None,
        filters: dict[str, str] | None = None,
        order: str | None = None,
        limit: int | None = None,
        single: bool = False,
    ) -> Any:
        params: dict[str, Any] = {"select": "*", **(filters or {})}
        if order:
            params["order"] = order
        if limit is not None:
            params["limit"] = limit
        prefer = "application/vnd.pgrst.object+json" if single else None
        result = await self._request(
            "GET", f"/rest/v1/{table}", token=token, params=params, prefer=prefer
        )
        return result

    async def insert(
        self,
        table: str,
        rows: dict[str, Any] | list[dict[str, Any]],
        *,
        token: str | None = None,
        upsert_on: str | None = None,
        single: bool = False,
    ) -> Any:
        prefer = "return=representation"
        if upsert_on:
            prefer += ",resolution=merge-duplicates"
        if single:
            prefer += ",application/vnd.pgrst.object+json"
        params = {"on_conflict": upsert_on} if upsert_on else None
        return await self._request(
            "POST", f"/rest/v1/{table}", token=token, params=params, json=rows, prefer=prefer
        )

    async def update(
        self,
        table: str,
        patch: dict[str, Any],
        *,
        filters: dict[str, str],
        token: str | None = None,
        single: bool = False,
    ) -> Any:
        prefer = "return=representation"
        if single:
            prefer += ",application/vnd.pgrst.object+json"
        return await self._request(
            "PATCH", f"/rest/v1/{table}", token=token, params=filters, json=patch, prefer=prefer
        )

    async def delete(self, table: str, *, filters: dict[str, str], token: str | None = None) -> None:
        await self._request("DELETE", f"/rest/v1/{table}", token=token, params=filters)


def get_client() -> SupabaseClient:
    return SupabaseClient()
