from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.coding import CodingSubmission
from app.models.docker_learn import DockerLevelProgress
from app.models.exam import AttemptStatus, ExamAttempt
from app.models.git_learn import GitLevelProgress
from app.models.k8s_learn import K8sLevelProgress
from app.models.os_learn import OsLevelProgress
from app.models.sql_learn import SqlLevelProgress
from app.models.user import User
from app.routers.puzzles import REQUIRED_PER_DAY, _compute_streaks
from app.schemas.user import BadgeOut, ProfileStatsOut, UserOut, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
async def update_me(
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for field in ("full_name", "roll_number", "section", "department", "phone_number", "location", "institution"):
        value = getattr(payload, field)
        if value is not None:
            stripped = value.strip()
            if not stripped:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This field cannot be empty")
            setattr(current_user, field, stripped)

    if payload.gender is not None:
        current_user.gender = payload.gender
    if payload.education_level is not None:
        current_user.education_level = payload.education_level
    if payload.avatar_id is not None:
        current_user.avatar_id = payload.avatar_id

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/me/stats", response_model=ProfileStatsOut)
async def get_my_stats(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    current_streak, longest_streak, _, total_correct = await _compute_streaks(db, user.id)

    coding_solved = await db.scalar(
        select(func.count(func.distinct(CodingSubmission.problem_id))).where(
            CodingSubmission.user_id == user.id, CodingSubmission.is_solved.is_(True)
        )
    )
    coding_solved = coding_solved or 0

    exams_completed = await db.scalar(
        select(func.count()).select_from(ExamAttempt).where(
            ExamAttempt.user_id == user.id, ExamAttempt.status == AttemptStatus.submitted
        )
    )
    exams_completed = exams_completed or 0

    total_xp = 0
    for model in (GitLevelProgress, DockerLevelProgress, SqlLevelProgress, K8sLevelProgress, OsLevelProgress):
        xp = await db.scalar(select(func.coalesce(func.sum(model.xp_earned), 0)).where(model.user_id == user.id))
        total_xp += xp or 0

    badges = [
        BadgeOut(
            id="first-exam",
            label="First exam",
            description="Submit your first practice exam",
            earned=exams_completed >= 1,
        ),
        BadgeOut(
            id="puzzle-streak",
            label="Puzzle streak",
            description=f"Keep a {REQUIRED_PER_DAY}-a-day puzzle streak going for a full week",
            earned=longest_streak >= 7,
        ),
        BadgeOut(
            id="puzzle-master",
            label="Puzzle master",
            description="Solve 25 daily puzzles correctly",
            earned=total_correct >= 25,
        ),
        BadgeOut(
            id="code-solver",
            label="Code solver",
            description="Solve your first coding problem",
            earned=coding_solved >= 1,
        ),
        BadgeOut(
            id="code-warrior",
            label="Code warrior",
            description="Solve 10 coding problems",
            earned=coding_solved >= 10,
        ),
        BadgeOut(
            id="dev-practice-novice",
            label="Dev Practice novice",
            description="Earn 50 XP across the Dev Practice sandboxes",
            earned=total_xp >= 50,
        ),
        BadgeOut(
            id="dev-practice-pro",
            label="Dev Practice pro",
            description="Earn 200 XP across the Dev Practice sandboxes",
            earned=total_xp >= 200,
        ),
    ]

    return ProfileStatsOut(
        puzzles_solved=total_correct,
        puzzle_current_streak=current_streak,
        puzzle_longest_streak=longest_streak,
        coding_solved=coding_solved,
        exams_completed=exams_completed,
        total_xp=total_xp,
        badges=badges,
    )
