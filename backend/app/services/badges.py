from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Callable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam import AttemptStatus, ExamAttempt
from app.schemas.progress import BadgeOut


@dataclass
class Stats:
    total_attempts: int
    current_streak_days: int
    best_score_pct: float


@dataclass
class BadgeDef:
    code: str
    name: str
    description: str
    icon: str
    target: int
    progress: Callable[[Stats], int]

    def check(self, stats: Stats) -> BadgeOut:
        current = min(self.progress(stats), self.target)
        return BadgeOut(
            code=self.code,
            name=self.name,
            description=self.description,
            icon=self.icon,
            earned=current >= self.target,
            progress_current=current,
            progress_target=self.target,
        )


BADGES: list[BadgeDef] = [
    BadgeDef("first_attempt", "First steps", "Submit your first practice exam", "footprints", 1,
             lambda s: s.total_attempts),
    BadgeDef("ten_attempts", "Getting started", "Submit 10 practice exams", "target", 10,
             lambda s: s.total_attempts),
    BadgeDef("fifty_attempts", "Half-century", "Submit 50 practice exams", "trophy", 50,
             lambda s: s.total_attempts),
    BadgeDef("hundred_attempts", "Centurion", "Submit 100 practice exams", "medal", 100,
             lambda s: s.total_attempts),
    BadgeDef("streak_3", "On a roll", "Practice 3 days in a row", "flame", 3,
             lambda s: s.current_streak_days),
    BadgeDef("streak_7", "Week warrior", "Practice 7 days in a row", "flame", 7,
             lambda s: s.current_streak_days),
    BadgeDef("streak_30", "Unstoppable", "Practice 30 days in a row", "flame", 30,
             lambda s: s.current_streak_days),
    BadgeDef("perfect_score", "Perfectionist", "Score 100% on an exam", "star", 1,
             lambda s: 1 if s.best_score_pct >= 100 else 0),
]


def compute_streak_days(dates: set[date]) -> int:
    """Consecutive calendar days with at least one submitted attempt, ending today or yesterday."""
    if not dates:
        return 0
    sorted_dates = sorted(dates)
    today = datetime.now(timezone.utc).date()
    if (today - sorted_dates[-1]).days > 1:
        return 0
    streak = 1
    for i in range(len(sorted_dates) - 1, 0, -1):
        if (sorted_dates[i] - sorted_dates[i - 1]).days == 1:
            streak += 1
        else:
            break
    return streak


def compute_badges(total_attempts: int, attempt_dates: set[date], best_score_pct: float) -> list[BadgeOut]:
    stats = Stats(
        total_attempts=total_attempts,
        current_streak_days=compute_streak_days(attempt_dates),
        best_score_pct=best_score_pct,
    )
    return [b.check(stats) for b in BADGES]


async def get_user_badges(db: AsyncSession, user_id: int) -> list[BadgeOut]:
    result = await db.execute(
        select(ExamAttempt.submitted_at, ExamAttempt.score, ExamAttempt.max_score).where(
            ExamAttempt.user_id == user_id, ExamAttempt.status == AttemptStatus.submitted
        )
    )
    rows = result.all()
    attempt_dates = {r.submitted_at.date() for r in rows if r.submitted_at}
    best_score_pct = 0.0
    for r in rows:
        if r.max_score:
            best_score_pct = max(best_score_pct, r.score / r.max_score * 100)
    return compute_badges(total_attempts=len(rows), attempt_dates=attempt_dates, best_score_pct=best_score_pct)
