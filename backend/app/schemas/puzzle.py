from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PuzzleIn(BaseModel):
    question_text: str
    options: list[str] = Field(min_length=2, max_length=6)
    correct_index: int
    explanation: str | None = None
    difficulty: str = "medium"


class PuzzleAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    question_text: str
    options: list[str]
    correct_index: int
    explanation: str | None
    difficulty: str
    is_active: bool
    created_at: datetime


class PuzzleTodayOut(BaseModel):
    id: int
    question_text: str
    options: list[str]
    difficulty: str
    already_solved: bool
    # only populated when already_solved is True
    selected_index: int | None = None
    correct_index: int | None = None
    is_correct: bool | None = None
    explanation: str | None = None


class PuzzleAttemptIn(BaseModel):
    selected_index: int


class PuzzleAttemptResult(BaseModel):
    is_correct: bool
    correct_index: int
    explanation: str | None
    current_streak: int
    longest_streak: int


class PuzzleStreakOut(BaseModel):
    current_streak: int
    longest_streak: int
    total_solved: int
    total_correct: int
