"""Habits and their daily marks (yes / no / skip)."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException

from ..deps import CurrentUser, current_user, get_supabase
from ..models import HabitIn, HabitMarkIn
from ..supabase_client import SupabaseClient, SupabaseError

router = APIRouter(prefix="/api/habits", tags=["habits"])

User = Annotated[CurrentUser, Depends(current_user)]
DB = Annotated[SupabaseClient, Depends(get_supabase)]


def _raise(exc: SupabaseError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get("")
async def list_habits(user: User, db: DB) -> dict[str, Any]:
    try:
        habits = await db.select(
            "habits",
            filters={"user_id": f"eq.{user.id}", "active": "eq.true"},
            order="created_at.asc",
        )
        logs = await db.select(
            "habit_logs", filters={"user_id": f"eq.{user.id}"}, order="log_date.desc"
        )
    except SupabaseError as exc:
        _raise(exc)
    return {"habits": habits, "logs": logs}


@router.post("", status_code=201)
async def create_habit(body: HabitIn, user: User, db: DB) -> dict[str, Any]:
    row = {"user_id": user.id, "name": body.name, "icon": body.icon, "active": True}
    try:
        return await db.insert("habits", row, single=True)
    except SupabaseError as exc:
        _raise(exc)


@router.delete("/{habit_id}")
async def delete_habit(habit_id: str, user: User, db: DB) -> dict[str, bool]:
    try:
        await db.delete("habits", filters={"id": f"eq.{habit_id}", "user_id": f"eq.{user.id}"})
    except SupabaseError as exc:
        _raise(exc)
    return {"ok": True}


@router.post("/mark")
async def mark_habit(body: HabitMarkIn, user: User, db: DB) -> dict[str, Any]:
    """Upsert a day's mark — one row per habit per day."""
    row = {"user_id": user.id, **body.model_dump()}
    try:
        return await db.insert("habit_logs", row, upsert_on="habit_id,log_date", single=True)
    except SupabaseError as exc:
        _raise(exc)
