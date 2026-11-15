"""30 / 50 / 90-day challenges and their daily pass-fail logs."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException

from ..deps import CurrentUser, current_user, get_supabase
from ..models import ChallengeDayIn, ChallengeIn, ChallengePatch
from ..supabase_client import SupabaseClient, SupabaseError

router = APIRouter(prefix="/api/challenges", tags=["challenges"])

User = Annotated[CurrentUser, Depends(current_user)]
DB = Annotated[SupabaseClient, Depends(get_supabase)]


def _raise(exc: SupabaseError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get("")
async def list_challenges(user: User, db: DB) -> dict[str, Any]:
    try:
        challenges = await db.select(
            "challenges", filters={"user_id": f"eq.{user.id}"}, order="created_at.desc"
        )
        logs = await db.select(
            "challenge_logs", filters={"user_id": f"eq.{user.id}"}, order="log_date.desc"
        )
    except SupabaseError as exc:
        _raise(exc)
    return {"challenges": challenges, "logs": logs}


@router.post("", status_code=201)
async def create_challenge(body: ChallengeIn, user: User, db: DB) -> dict[str, Any]:
    try:
        return await db.insert(
            "challenges", {"user_id": user.id, **body.model_dump(exclude_none=True)}, single=True
        )
    except SupabaseError as exc:
        _raise(exc)


@router.patch("/{challenge_id}")
async def update_challenge(challenge_id: str, body: ChallengePatch, user: User, db: DB) -> dict[str, Any]:
    patch = body.model_dump(exclude_none=True)
    if not patch:
        raise HTTPException(status_code=400, detail="Empty patch.")
    try:
        return await db.update(
            "challenges",
            patch,
            filters={"id": f"eq.{challenge_id}", "user_id": f"eq.{user.id}"},
            single=True,
        )
    except SupabaseError as exc:
        _raise(exc)


@router.delete("/{challenge_id}")
async def delete_challenge(challenge_id: str, user: User, db: DB) -> dict[str, bool]:
    try:
        await db.delete("challenges", filters={"id": f"eq.{challenge_id}", "user_id": f"eq.{user.id}"})
    except SupabaseError as exc:
        _raise(exc)
    return {"ok": True}


@router.post("/{challenge_id}/days")
async def mark_day(challenge_id: str, body: ChallengeDayIn, user: User, db: DB) -> dict[str, Any]:
    """Record pass/fail for a day — one row per challenge per day."""
    row = {"user_id": user.id, "challenge_id": challenge_id, **body.model_dump()}
    try:
        return await db.insert(
            "challenge_logs", row, upsert_on="challenge_id,log_date", single=True
        )
    except SupabaseError as exc:
        _raise(exc)


@router.delete("/{challenge_id}/days/{log_date}")
async def clear_day(challenge_id: str, log_date: str, user: User, db: DB) -> dict[str, bool]:
    """Undo a day's mark."""
    try:
        await db.delete(
            "challenge_logs",
            filters={
                "challenge_id": f"eq.{challenge_id}",
                "log_date": f"eq.{log_date}",
                "user_id": f"eq.{user.id}",
            },
        )
    except SupabaseError as exc:
        _raise(exc)
    return {"ok": True}
