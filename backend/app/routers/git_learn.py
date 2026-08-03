from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.git_learn import GitLevelProgress
from app.models.user import User
from app.schemas.git_learn import GitLevelCompleteIn, GitProgressOut

router = APIRouter(prefix="/git-learn", tags=["git-learn"])


@router.get("/progress", response_model=GitProgressOut)
async def get_progress(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.scalars(select(GitLevelProgress).where(GitLevelProgress.user_id == user.id))
    rows = list(result.all())
    return GitProgressOut(
        completed_level_ids=[r.level_id for r in rows],
        total_xp=sum(r.xp_earned for r in rows),
    )


@router.post("/progress", response_model=GitProgressOut)
async def complete_level(
    payload: GitLevelCompleteIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing = await db.scalar(
        select(GitLevelProgress).where(
            GitLevelProgress.user_id == user.id,
            GitLevelProgress.level_id == payload.level_id,
        )
    )
    if existing is None:
        db.add(GitLevelProgress(user_id=user.id, level_id=payload.level_id, xp_earned=payload.xp))
        await db.commit()

    result = await db.scalars(select(GitLevelProgress).where(GitLevelProgress.user_id == user.id))
    rows = list(result.all())
    return GitProgressOut(
        completed_level_ids=[r.level_id for r in rows],
        total_xp=sum(r.xp_earned for r in rows),
    )
