from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.k8s_learn import K8sLevelProgress
from app.models.user import User
from app.schemas.k8s_learn import K8sLevelCompleteIn, K8sProgressOut

router = APIRouter(prefix="/k8s-learn", tags=["k8s-learn"])


@router.get("/progress", response_model=K8sProgressOut)
async def get_progress(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.scalars(select(K8sLevelProgress).where(K8sLevelProgress.user_id == user.id))
    rows = list(result.all())
    return K8sProgressOut(
        completed_level_ids=[r.level_id for r in rows],
        total_xp=sum(r.xp_earned for r in rows),
    )


@router.post("/progress", response_model=K8sProgressOut)
async def complete_level(
    payload: K8sLevelCompleteIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing = await db.scalar(
        select(K8sLevelProgress).where(
            K8sLevelProgress.user_id == user.id,
            K8sLevelProgress.level_id == payload.level_id,
        )
    )
    if existing is None:
        db.add(K8sLevelProgress(user_id=user.id, level_id=payload.level_id, xp_earned=payload.xp))
        await db.commit()

    result = await db.scalars(select(K8sLevelProgress).where(K8sLevelProgress.user_id == user.id))
    rows = list(result.all())
    return K8sProgressOut(
        completed_level_ids=[r.level_id for r in rows],
        total_xp=sum(r.xp_earned for r in rows),
    )
