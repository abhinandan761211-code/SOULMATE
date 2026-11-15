"""Profile + onboarding (role, full name, age, country) and the dashboard bundle."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException

from ..deps import CurrentUser, current_user, get_supabase
from ..models import ProfileIn
from ..supabase_client import SupabaseClient, SupabaseError

router = APIRouter(prefix="/api", tags=["profile"])

User = Annotated[CurrentUser, Depends(current_user)]
DB = Annotated[SupabaseClient, Depends(get_supabase)]


def _raise(exc: SupabaseError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get("/me")
async def get_me(user: User, db: DB) -> dict[str, Any]:
    try:
        rows = await db.select("profiles", filters={"id": f"eq.{user.id}"}, limit=1)
    except SupabaseError as exc:
        _raise(exc)
    return rows[0] if rows else {"id": user.id, "email": user.email}


@router.post("/onboarding")
async def save_onboarding(body: ProfileIn, user: User, db: DB) -> dict[str, Any]:
    """Save the sign-up answers and mark the profile as onboarded."""
    record = {
        "id": user.id,
        "email": user.email,
        "role": body.role,
        "full_name": body.full_name.strip(),
        "name": body.full_name.strip(),
        "age": body.age,
        "country": (body.country or "").strip() or None,
        "onboarded_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        return await db.insert("profiles", record, upsert_on="id", single=True)
    except SupabaseError as exc:
        _raise(exc)


@router.get("/dashboard")
async def dashboard(user: User, db: DB) -> dict[str, Any]:
    """Everything the dashboard needs in one round-trip (mirrors loadDashboard)."""
    f = {"user_id": f"eq.{user.id}"}
    try:
        goals = await db.select("goals", filters=f, order="created_at.desc")
        journal = await db.select("journal_entries", filters=f, order="entry_date.desc")
        habits = await db.select("habits", filters=f)
        habit_logs = await db.select("habit_logs", filters=f, order="log_date.desc")
        projects = await db.select("projects", filters=f, order="created_at.desc")
        analysis = await db.select("analysis_entries", filters=f, order="period_start.desc", limit=1)
        challenges = await db.select("challenges", filters=f, order="created_at.desc")
        challenge_logs = await db.select("challenge_logs", filters=f, order="log_date.desc")
    except SupabaseError as exc:
        _raise(exc)

    return {
        "goals": goals,
        "journal": journal,
        "habits": habits,
        "habitLogs": habit_logs,
        "projects": projects,
        "analysis": analysis[0] if analysis else None,
        "challenges": challenges,
        "challengeLogs": challenge_logs,
    }
