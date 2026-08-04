import random
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.puzzle import Puzzle, PuzzleAttempt
from app.models.user import User
from app.schemas.puzzle import (
    PuzzleAdminOut,
    PuzzleAttemptIn,
    PuzzleAttemptResult,
    PuzzleIn,
    PuzzleStreakOut,
    PuzzleTodayItem,
    PuzzleTodayOut,
)

router = APIRouter(prefix="/puzzles", tags=["puzzles"])

REQUIRED_PER_DAY = 5


async def _active_puzzles(db: AsyncSession) -> list[Puzzle]:
    result = await db.scalars(
        select(Puzzle).where(Puzzle.is_active.is_(True)).order_by(Puzzle.id.asc())
    )
    return list(result.all())


async def _puzzles_for_date(db: AsyncSession, day: date) -> list[Puzzle]:
    """Picks a deterministic set of puzzles for the given date — same puzzles for every student
    that day, seeded by the date so the set rotates daily without needing to store anything."""
    puzzles = await _active_puzzles(db)
    if not puzzles:
        return []
    count = min(REQUIRED_PER_DAY, len(puzzles))
    return random.Random(day.toordinal()).sample(puzzles, count)


async def _compute_streaks(db: AsyncSession, user_id: int) -> tuple[int, int, int, int]:
    """Returns (current_streak, longest_streak, total_solved, total_correct).
    A calendar day only counts toward the streak once the student has solved at least
    REQUIRED_PER_DAY distinct puzzles that day — solving just one or two doesn't keep it alive.
    """
    result = await db.scalars(select(PuzzleAttempt).where(PuzzleAttempt.user_id == user_id))
    attempts = list(result.all())
    total_solved = len(attempts)
    total_correct = sum(1 for a in attempts if a.is_correct)
    if not attempts:
        return 0, 0, 0, 0

    solved_puzzle_ids_by_date: dict[date, set[int]] = {}
    for a in attempts:
        solved_puzzle_ids_by_date.setdefault(a.solved_for_date, set()).add(a.puzzle_id)
    qualifying_dates = {d for d, ids in solved_puzzle_ids_by_date.items() if len(ids) >= REQUIRED_PER_DAY}

    today = date.today()

    current_streak = 0
    cursor = today
    if cursor not in qualifying_dates:
        cursor -= timedelta(days=1)
    while cursor in qualifying_dates:
        current_streak += 1
        cursor -= timedelta(days=1)

    longest_streak = 0
    run = 0
    prev_day: date | None = None
    for d in sorted(qualifying_dates):
        if prev_day is not None and (d - prev_day).days == 1:
            run += 1
        else:
            run = 1
        longest_streak = max(longest_streak, run)
        prev_day = d

    return current_streak, longest_streak, total_solved, total_correct


@router.get("/today", response_model=PuzzleTodayOut)
async def get_today_puzzle(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    today = date.today()
    puzzles = await _puzzles_for_date(db, today)
    if not puzzles:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No puzzles available yet")

    existing_result = await db.scalars(
        select(PuzzleAttempt).where(
            PuzzleAttempt.user_id == user.id,
            PuzzleAttempt.solved_for_date == today,
            PuzzleAttempt.puzzle_id.in_([p.id for p in puzzles]),
        )
    )
    existing_by_puzzle = {a.puzzle_id: a for a in existing_result.all()}

    items = []
    for puzzle in puzzles:
        existing = existing_by_puzzle.get(puzzle.id)
        if existing is not None:
            items.append(
                PuzzleTodayItem(
                    id=puzzle.id,
                    question_text=puzzle.question_text,
                    options=puzzle.options,
                    difficulty=puzzle.difficulty,
                    already_solved=True,
                    selected_index=existing.selected_index,
                    correct_index=puzzle.correct_index,
                    is_correct=existing.is_correct,
                    explanation=puzzle.explanation,
                )
            )
        else:
            items.append(
                PuzzleTodayItem(
                    id=puzzle.id,
                    question_text=puzzle.question_text,
                    options=puzzle.options,
                    difficulty=puzzle.difficulty,
                    already_solved=False,
                )
            )

    return PuzzleTodayOut(
        puzzles=items,
        solved_count=len(existing_by_puzzle),
        required_count=len(puzzles),
    )


@router.post("/today/attempt", response_model=PuzzleAttemptResult)
async def attempt_today_puzzle(
    payload: PuzzleAttemptIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    today = date.today()
    puzzles = await _puzzles_for_date(db, today)
    puzzle = next((p for p in puzzles if p.id == payload.puzzle_id), None)
    if puzzle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="That puzzle isn't part of today's set")

    existing = await db.scalar(
        select(PuzzleAttempt).where(
            PuzzleAttempt.user_id == user.id,
            PuzzleAttempt.puzzle_id == puzzle.id,
            PuzzleAttempt.solved_for_date == today,
        )
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You already solved this puzzle today")

    if not 0 <= payload.selected_index < len(puzzle.options):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid option index")

    is_correct = payload.selected_index == puzzle.correct_index
    attempt = PuzzleAttempt(
        user_id=user.id,
        puzzle_id=puzzle.id,
        solved_for_date=today,
        selected_index=payload.selected_index,
        is_correct=is_correct,
    )
    db.add(attempt)
    await db.commit()

    solved_count_result = await db.scalars(
        select(PuzzleAttempt).where(
            PuzzleAttempt.user_id == user.id,
            PuzzleAttempt.solved_for_date == today,
        )
    )
    solved_count = len(solved_count_result.all())
    required_count = len(puzzles)

    current_streak, longest_streak, _, _ = await _compute_streaks(db, user.id)
    return PuzzleAttemptResult(
        is_correct=is_correct,
        correct_index=puzzle.correct_index,
        explanation=puzzle.explanation,
        solved_count=solved_count,
        required_count=required_count,
        streak_earned_today=solved_count >= required_count,
        current_streak=current_streak,
        longest_streak=longest_streak,
    )


@router.get("/streak", response_model=PuzzleStreakOut)
async def get_streak(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    current_streak, longest_streak, total_solved, total_correct = await _compute_streaks(db, user.id)
    return PuzzleStreakOut(
        current_streak=current_streak,
        longest_streak=longest_streak,
        total_solved=total_solved,
        total_correct=total_correct,
    )


# ---------- Admin puzzle bank management ----------


@router.get("/admin", response_model=list[PuzzleAdminOut])
async def list_puzzles(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.scalars(select(Puzzle).order_by(Puzzle.id.desc()))
    return result.all()


@router.post("/admin", response_model=PuzzleAdminOut, status_code=status.HTTP_201_CREATED)
async def create_puzzle(
    payload: PuzzleIn, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)
):
    if not 0 <= payload.correct_index < len(payload.options):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="correct_index out of range")
    puzzle = Puzzle(
        question_text=payload.question_text,
        options=payload.options,
        correct_index=payload.correct_index,
        explanation=payload.explanation,
        difficulty=payload.difficulty,
        created_by=admin.id,
    )
    db.add(puzzle)
    await db.commit()
    await db.refresh(puzzle)
    return puzzle


@router.patch("/admin/{puzzle_id}", response_model=PuzzleAdminOut)
async def update_puzzle(
    puzzle_id: int,
    payload: PuzzleIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    puzzle = await db.get(Puzzle, puzzle_id)
    if puzzle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Puzzle not found")
    if not 0 <= payload.correct_index < len(payload.options):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="correct_index out of range")
    puzzle.question_text = payload.question_text
    puzzle.options = payload.options
    puzzle.correct_index = payload.correct_index
    puzzle.explanation = payload.explanation
    puzzle.difficulty = payload.difficulty
    await db.commit()
    await db.refresh(puzzle)
    return puzzle


@router.patch("/admin/{puzzle_id}/toggle-active", response_model=PuzzleAdminOut)
async def toggle_puzzle_active(
    puzzle_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
):
    puzzle = await db.get(Puzzle, puzzle_id)
    if puzzle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Puzzle not found")
    puzzle.is_active = not puzzle.is_active
    await db.commit()
    await db.refresh(puzzle)
    return puzzle


@router.delete("/admin/{puzzle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_puzzle(puzzle_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    puzzle = await db.get(Puzzle, puzzle_id)
    if puzzle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Puzzle not found")
    await db.delete(puzzle)
    await db.commit()
