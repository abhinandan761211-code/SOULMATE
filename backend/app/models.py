"""Request bodies. Field names match the frontend's types.ts so payloads are 1:1."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

Horizon = Literal["today", "tomorrow", "day_after", "week", "month", "year", "long_term"]
GoalBucket = Literal["future", "present", "done"]
GoalStatus = Literal["planned", "in_progress", "success", "failed"]
Priority = Literal["low", "medium", "high"]
GoalRepeat = Literal["daily", "weekdays", "weekly", "monthly"]
HabitMark = Literal["yes", "no", "skip"]
TaskStatus = Literal["todo", "doing", "done", "failed"]
ProjectStatus = Literal["active", "success", "failed", "paused"]
ColumnType = Literal["text", "longtext", "number", "date", "status"]
ChallengeStatus = Literal["active", "completed", "abandoned"]
ChallengeResult = Literal["pass", "fail"]
Mood = Literal["great", "good", "okay", "low", "bad"]
UserRole = Literal["student", "professional", "freelancer", "founder", "personal"]


class JournalIn(BaseModel):
    # the date comes from the URL (PUT /api/journal/{entry_date})
    entry_date: str | None = None
    title: str | None = None
    mood: Mood | None = None
    content: str | None = None
    photos: list[str] | None = None


class GoalIn(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    description: str | None = None
    horizon: Horizon = "today"
    bucket: GoalBucket = "present"
    status: GoalStatus = "planned"
    due_date: str | None = None
    priority: Priority = "medium"
    progress: int = 0
    result_note: str | None = None
    completed_at: str | None = None
    repeat: GoalRepeat | None = None
    series_id: str | None = None


class GoalPatch(BaseModel):
    model_config = {"extra": "allow"}


class HabitIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    icon: str | None = None


class HabitMarkIn(BaseModel):
    habit_id: str
    log_date: str
    mark: HabitMark


class ProjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    status: ProjectStatus = "active"
    started_at: str | None = None
    ended_at: str | None = None


class ProjectPatch(BaseModel):
    model_config = {"extra": "allow"}


class ProjectTaskIn(BaseModel):
    task: str = Field(min_length=1)
    owner: str | None = None
    due_date: str | None = None
    status: TaskStatus = "todo"
    notes: str | None = None
    weight: int = 1
    sort_order: int = 0
    custom: dict[str, str] = Field(default_factory=dict)


class ProjectTaskPatch(BaseModel):
    model_config = {"extra": "allow"}


class ProjectColumnIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    type: ColumnType = "text"
    sort_order: int = 0


class ProjectColumnPatch(BaseModel):
    model_config = {"extra": "allow"}


class ChallengeIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    icon: str | None = None
    duration: int = Field(default=30, ge=1, le=3650)
    start_date: str
    status: ChallengeStatus = "active"


class ChallengePatch(BaseModel):
    model_config = {"extra": "allow"}


class ChallengeDayIn(BaseModel):
    log_date: str
    result: ChallengeResult
    note: str | None = None


class AnalysisIn(BaseModel):
    # the period comes from the URL (PUT /api/analysis/{period_start})
    period_start: str | None = None
    wins: str | None = None
    failures: str | None = None
    lessons: str | None = None
    next_actions: str | None = None
    score: int = Field(default=0, ge=0, le=100)


class ProfileIn(BaseModel):
    role: UserRole
    full_name: str = Field(min_length=1, max_length=200)
    age: int | None = Field(default=None, ge=1, le=130)
    country: str | None = None


AnyDict = dict[str, Any]
