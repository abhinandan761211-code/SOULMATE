"""Projects, their user-defined columns and task-table rows."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException

from ..deps import CurrentUser, current_user, get_supabase
from ..models import ProjectColumnIn, ProjectColumnPatch, ProjectIn, ProjectPatch, ProjectTaskIn, ProjectTaskPatch
from ..supabase_client import SupabaseClient, SupabaseError

router = APIRouter(prefix="/api/projects", tags=["projects"])

User = Annotated[CurrentUser, Depends(current_user)]
DB = Annotated[SupabaseClient, Depends(get_supabase)]


def _raise(exc: SupabaseError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.message)


def _owned(resource_id: str, user_id: str) -> dict[str, str]:
    return {"id": f"eq.{resource_id}", "user_id": f"eq.{user_id}"}


# ------------------------------- projects --------------------------------
@router.get("")
async def list_projects(user: User, db: DB) -> list[dict[str, Any]]:
    try:
        return await db.select(
            "projects", filters={"user_id": f"eq.{user.id}"}, order="created_at.desc"
        )
    except SupabaseError as exc:
        _raise(exc)


@router.post("", status_code=201)
async def create_project(body: ProjectIn, user: User, db: DB) -> dict[str, Any]:
    try:
        return await db.insert("projects", {"user_id": user.id, **body.model_dump(exclude_none=True)}, single=True)
    except SupabaseError as exc:
        _raise(exc)


@router.patch("/{project_id}")
async def update_project(project_id: str, body: ProjectPatch, user: User, db: DB) -> dict[str, Any]:
    patch = body.model_dump(exclude_none=True)
    if not patch:
        raise HTTPException(status_code=400, detail="Empty patch.")
    try:
        return await db.update("projects", patch, filters=_owned(project_id, user.id), single=True)
    except SupabaseError as exc:
        _raise(exc)


@router.delete("/{project_id}")
async def delete_project(project_id: str, user: User, db: DB) -> dict[str, bool]:
    try:
        await db.delete("projects", filters=_owned(project_id, user.id))
    except SupabaseError as exc:
        _raise(exc)
    return {"ok": True}


# --------------------------------- tasks ----------------------------------
@router.get("/{project_id}/tasks")
async def list_tasks(project_id: str, user: User, db: DB) -> list[dict[str, Any]]:
    try:
        return await db.select(
            "project_tasks",
            filters={"project_id": f"eq.{project_id}", "user_id": f"eq.{user.id}"},
            order="sort_order.asc",
        )
    except SupabaseError as exc:
        _raise(exc)


@router.post("/{project_id}/tasks", status_code=201)
async def create_task(project_id: str, body: ProjectTaskIn, user: User, db: DB) -> dict[str, Any]:
    row = {"user_id": user.id, "project_id": project_id, **body.model_dump()}
    try:
        return await db.insert("project_tasks", row, single=True)
    except SupabaseError as exc:
        _raise(exc)


@router.patch("/{project_id}/tasks/{task_id}")
async def update_task(task_id: str, body: ProjectTaskPatch, user: User, db: DB) -> dict[str, Any]:
    patch = body.model_dump(exclude_none=True)
    if not patch:
        raise HTTPException(status_code=400, detail="Empty patch.")
    try:
        return await db.update("project_tasks", patch, filters=_owned(task_id, user.id), single=True)
    except SupabaseError as exc:
        _raise(exc)


@router.delete("/{project_id}/tasks/{task_id}")
async def delete_task(task_id: str, user: User, db: DB) -> dict[str, bool]:
    try:
        await db.delete("project_tasks", filters=_owned(task_id, user.id))
    except SupabaseError as exc:
        _raise(exc)
    return {"ok": True}


# -------------------------------- columns ---------------------------------
@router.get("/{project_id}/columns")
async def list_columns(project_id: str, user: User, db: DB) -> list[dict[str, Any]]:
    try:
        return await db.select(
            "project_columns",
            filters={"project_id": f"eq.{project_id}", "user_id": f"eq.{user.id}"},
            order="sort_order.asc",
        )
    except SupabaseError as exc:
        _raise(exc)


@router.post("/{project_id}/columns", status_code=201)
async def create_column(project_id: str, body: ProjectColumnIn, user: User, db: DB) -> dict[str, Any]:
    row = {"user_id": user.id, "project_id": project_id, **body.model_dump()}
    try:
        return await db.insert("project_columns", row, single=True)
    except SupabaseError as exc:
        _raise(exc)


@router.patch("/{project_id}/columns/{column_id}")
async def update_column(column_id: str, body: ProjectColumnPatch, user: User, db: DB) -> dict[str, Any]:
    patch = body.model_dump(exclude_none=True)
    if not patch:
        raise HTTPException(status_code=400, detail="Empty patch.")
    try:
        return await db.update("project_columns", patch, filters=_owned(column_id, user.id), single=True)
    except SupabaseError as exc:
        _raise(exc)


@router.delete("/{project_id}/columns/{column_id}")
async def delete_column(column_id: str, user: User, db: DB) -> dict[str, bool]:
    try:
        await db.delete("project_columns", filters=_owned(column_id, user.id))
    except SupabaseError as exc:
        _raise(exc)
    return {"ok": True}
