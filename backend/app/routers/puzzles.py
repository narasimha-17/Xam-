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
    PuzzleTodayOut,
)

router = APIRouter(prefix="/puzzles", tags=["puzzles"])


async def _active_puzzles(db: AsyncSession) -> list[Puzzle]:
    result = await db.scalars(
        select(Puzzle).where(Puzzle.is_active.is_(True)).order_by(Puzzle.id.asc())
    )
    return list(result.all())


async def _puzzle_for_date(db: AsyncSession, day: date) -> Puzzle | None:
    puzzles = await _active_puzzles(db)
    if not puzzles:
        return None
    return puzzles[day.toordinal() % len(puzzles)]


async def _compute_streaks(db: AsyncSession, user_id: int) -> tuple[int, int, int, int]:
    """Returns (current_streak, longest_streak, total_solved, total_correct).
    Streak counts consecutive calendar days with an attempt (any answer), not just correct ones —
    keeping it forgiving/friendly rather than punishing a wrong guess with a broken streak.
    """
    result = await db.scalars(
        select(PuzzleAttempt).where(PuzzleAttempt.user_id == user_id).order_by(PuzzleAttempt.solved_for_date.desc())
    )
    attempts = list(result.all())
    total_solved = len(attempts)
    total_correct = sum(1 for a in attempts if a.is_correct)
    if not attempts:
        return 0, 0, 0, 0

    solved_dates = {a.solved_for_date for a in attempts}
    today = date.today()

    current_streak = 0
    cursor = today
    if cursor not in solved_dates:
        cursor -= timedelta(days=1)
    while cursor in solved_dates:
        current_streak += 1
        cursor -= timedelta(days=1)

    longest_streak = 0
    run = 0
    prev_day: date | None = None
    for d in sorted(solved_dates):
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
    puzzle = await _puzzle_for_date(db, today)
    if puzzle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No puzzles available yet")

    existing = await db.scalar(
        select(PuzzleAttempt).where(
            PuzzleAttempt.user_id == user.id,
            PuzzleAttempt.solved_for_date == today,
        )
    )
    if existing is not None:
        return PuzzleTodayOut(
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

    return PuzzleTodayOut(
        id=puzzle.id,
        question_text=puzzle.question_text,
        options=puzzle.options,
        difficulty=puzzle.difficulty,
        already_solved=False,
    )


@router.post("/today/attempt", response_model=PuzzleAttemptResult)
async def attempt_today_puzzle(
    payload: PuzzleAttemptIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    today = date.today()
    puzzle = await _puzzle_for_date(db, today)
    if puzzle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No puzzles available yet")

    existing = await db.scalar(
        select(PuzzleAttempt).where(
            PuzzleAttempt.user_id == user.id,
            PuzzleAttempt.solved_for_date == today,
        )
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You already solved today's puzzle")

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

    current_streak, longest_streak, _, _ = await _compute_streaks(db, user.id)
    return PuzzleAttemptResult(
        is_correct=is_correct,
        correct_index=puzzle.correct_index,
        explanation=puzzle.explanation,
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
