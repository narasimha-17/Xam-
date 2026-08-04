from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.os_learn import OsLevelProgress
from app.models.user import User
from app.schemas.os_learn import OsLevelCompleteIn, OsProgressOut

router = APIRouter(prefix="/os-learn", tags=["os-learn"])


@router.get("/progress", response_model=OsProgressOut)
async def get_progress(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.scalars(select(OsLevelProgress).where(OsLevelProgress.user_id == user.id))
    rows = list(result.all())
    return OsProgressOut(
        completed_level_ids=[r.level_id for r in rows],
        total_xp=sum(r.xp_earned for r in rows),
    )


@router.post("/progress", response_model=OsProgressOut)
async def complete_level(
    payload: OsLevelCompleteIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing = await db.scalar(
        select(OsLevelProgress).where(
            OsLevelProgress.user_id == user.id,
            OsLevelProgress.level_id == payload.level_id,
        )
    )
    if existing is None:
        db.add(OsLevelProgress(user_id=user.id, level_id=payload.level_id, xp_earned=payload.xp))
        await db.commit()

    result = await db.scalars(select(OsLevelProgress).where(OsLevelProgress.user_id == user.id))
    rows = list(result.all())
    return OsProgressOut(
        completed_level_ids=[r.level_id for r in rows],
        total_xp=sum(r.xp_earned for r in rows),
    )
