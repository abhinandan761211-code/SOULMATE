"""FastAPI dependencies: the authenticated user and the Supabase client."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from .supabase_client import SupabaseClient, SupabaseError, get_client


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str | None
    access_token: str


async def get_supabase() -> SupabaseClient:
    try:
        return get_client()
    except RuntimeError as exc:  # supabase env vars missing
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc


def _bearer(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token. Sign in with Supabase and send the access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Empty bearer token.")
    return token


async def current_user(
    authorization: Annotated[str | None, Header()] = None,
    supabase: SupabaseClient = Depends(get_supabase),
) -> CurrentUser:
    """Verify the Supabase JWT and return the user it belongs to.

    The backend then scopes every query by this id — a caller can only ever
    read or write their own rows, even though the service-role key bypasses RLS.
    """
    token = _bearer(authorization)
    try:
        user = await supabase.get_user(token)
    except SupabaseError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc.message}",
        ) from exc
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has no user id.")
    return CurrentUser(id=user_id, email=user.get("email"), access_token=token)
