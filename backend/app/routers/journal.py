"""Journal entries — one per user per day."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException

from ..deps import CurrentUser, current_user, get_supabase
from ..models import JournalIn
from ..supabase_client import SupabaseClient, SupabaseError

router = APIRouter(prefix="/api/journal", tags=["journal"])

User = Annotated[CurrentUser, Depends(current_user)]
DB = Annotated[SupabaseClient, Depends(get_supabase)]


def _raise(exc: SupabaseError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get("")
async def list_journal(user: User, db: DB, limit: int = 400) -> list[dict[str, Any]]:
    try:
        return await db.select(
            "journal_entries",
            filters={"user_id": f"eq.{user.id}"},
            order="entry_date.desc",
            limit=limit,
        )
    except SupabaseError as exc:
        _raise(exc)


@router.put("/{entry_date}")
async def upsert_journal(entry_date: str, body: JournalIn, user: User, db: DB) -> dict[str, Any]:
    """Create or replace the entry for a date (unique per user + date)."""
    row = {"user_id": user.id, **body.model_dump(exclude_none=True)}
    row["entry_date"] = entry_date  # URL wins over the body
    try:
        return await db.insert(
            "journal_entries",
            row,
            upsert_on="user_id,entry_date",
            single=True,
        )
    except SupabaseError as exc:
        _raise(exc)


@router.delete("/{entry_id}")
async def delete_journal(entry_id: str, user: User, db: DB) -> dict[str, bool]:
    try:
        await db.delete("journal_entries", filters={"id": f"eq.{entry_id}", "user_id": f"eq.{user.id}"})
    except SupabaseError as exc:
        _raise(exc)
    return {"ok": True}
