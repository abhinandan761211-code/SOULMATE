"""Weekly analysis / review entries."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException

from ..deps import CurrentUser, current_user, get_supabase
from ..models import AnalysisIn
from ..supabase_client import SupabaseClient, SupabaseError

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

User = Annotated[CurrentUser, Depends(current_user)]
DB = Annotated[SupabaseClient, Depends(get_supabase)]


def _raise(exc: SupabaseError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get("")
async def list_analysis(user: User, db: DB, limit: int = 30) -> list[dict[str, Any]]:
    try:
        return await db.select(
            "analysis_entries",
            filters={"user_id": f"eq.{user.id}"},
            order="period_start.desc",
            limit=limit,
        )
    except SupabaseError as exc:
        _raise(exc)


@router.put("/{period_start}")
async def upsert_analysis(period_start: str, body: AnalysisIn, user: User, db: DB) -> dict[str, Any]:
    row = {"user_id": user.id, **body.model_dump(exclude_none=True)}
    row["period_start"] = period_start  # URL wins over the body
    try:
        return await db.insert(
            "analysis_entries", row, upsert_on="user_id,period_start", single=True
        )
    except SupabaseError as exc:
        _raise(exc)
