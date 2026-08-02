from datetime import datetime

from pydantic import BaseModel


class SubjectProgress(BaseModel):
    subject_id: int
    subject_name: str
    attempts: int
    average_score_pct: float


class AttemptHistoryEntry(BaseModel):
    attempt_id: int
    submitted_at: datetime
    score_pct: float
    exam_title: str
    subject_name: str


class ProgressStats(BaseModel):
    total_attempts: int
    average_score_pct: float
    subjects: list[SubjectProgress]
    history: list[AttemptHistoryEntry]


class BadgeOut(BaseModel):
    code: str
    name: str
    description: str
    icon: str
    earned: bool
    progress_current: int
    progress_target: int


class StudentProgressOut(BaseModel):
    user_id: int
    full_name: str
    email: str
    total_attempts: int
    average_score_pct: float
    last_attempt_at: datetime | None
