"""Goals — today / future / long-term, each ending as success or failed."""

from __future__ import annotations

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException

from ..deps import CurrentUser, current_user, get_supabase
from ..models import GoalIn, GoalPatch
from ..supabase_client import SupabaseClient, SupabaseError

router = APIRouter(prefix="/api/goals", tags=["goals"])

User = Annotated[CurrentUser, Depends(current_user)]
DB = Annotated[SupabaseClient, Depends(get_supabase)]


def _raise(exc: SupabaseError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get("")
async def list_goals(user: User, db: DB) -> list[dict[str, Any]]:
    try:
        return await db.select(
            "goals", filters={"user_id": f"eq.{user.id}"}, order="created_at.desc"
        )
    except SupabaseError as exc:
        _raise(exc)


@router.post("", status_code=201)
async def create_goal(body: GoalIn, user: User, db: DB) -> dict[str, Any]:
    row = {"user_id": user.id, **body.model_dump(exclude_none=True)}
    # recurring goals share a series id, exactly like the frontend does
    if body.repeat and not body.series_id:
        row["series_id"] = str(uuid.uuid4())
    try:
        return await db.insert("goals", row, single=True)
    except SupabaseError as exc:
        _raise(exc)


@router.patch("/{goal_id}")
async def update_goal(goal_id: str, body: GoalPatch, user: User, db: DB) -> dict[str, Any]:
    patch = body.model_dump(exclude_none=True)
    if not patch:
        raise HTTPException(status_code=400, detail="Empty patch — send at least one field.")
    try:
        return await db.update(
            "goals", patch, filters={"id": f"eq.{goal_id}", "user_id": f"eq.{user.id}"}, single=True
        )
    except SupabaseError as exc:
        _raise(exc)


@router.delete("/{goal_id}")
async def delete_goal(goal_id: str, user: User, db: DB) -> dict[str, bool]:
    try:
        await db.delete("goals", filters={"id": f"eq.{goal_id}", "user_id": f"eq.{user.id}"})
    except SupabaseError as exc:
        _raise(exc)
    return {"ok": True}
