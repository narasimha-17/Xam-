from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.sql_learn import SqlLevelProgress
from app.models.user import User
from app.schemas.sql_learn import SqlLevelCompleteIn, SqlProgressOut

router = APIRouter(prefix="/sql-learn", tags=["sql-learn"])


@router.get("/progress", response_model=SqlProgressOut)
async def get_progress(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.scalars(select(SqlLevelProgress).where(SqlLevelProgress.user_id == user.id))
    rows = list(result.all())
    return SqlProgressOut(
        completed_level_ids=[r.level_id for r in rows],
        total_xp=sum(r.xp_earned for r in rows),
    )


@router.post("/progress", response_model=SqlProgressOut)
async def complete_level(
    payload: SqlLevelCompleteIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing = await db.scalar(
        select(SqlLevelProgress).where(
            SqlLevelProgress.user_id == user.id,
            SqlLevelProgress.level_id == payload.level_id,
        )
    )
    if existing is None:
        db.add(SqlLevelProgress(user_id=user.id, level_id=payload.level_id, xp_earned=payload.xp))
        await db.commit()

    result = await db.scalars(select(SqlLevelProgress).where(SqlLevelProgress.user_id == user.id))
    rows = list(result.all())
    return SqlProgressOut(
        completed_level_ids=[r.level_id for r in rows],
        total_xp=sum(r.xp_earned for r in rows),
    )
