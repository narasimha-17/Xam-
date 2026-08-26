from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.ai_radar import AiRadarItem
from app.models.user import User
from app.schemas.ai_radar import AiRadarItemIn, AiRadarItemOut, AiRadarRunResult
from app.services.ai_radar import run_ai_radar_pipeline

router = APIRouter(prefix="/ai-radar", tags=["ai-radar"])


def _require_ai_enabled() -> None:
    if not settings.ai_features_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI Radar isn't available in this environment.",
        )


@router.get("", response_model=list[AiRadarItemOut])
async def list_ai_radar_items(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.scalars(select(AiRadarItem).order_by(AiRadarItem.found_at.desc()))
    return result.all()


@router.post("", response_model=AiRadarItemOut, status_code=status.HTTP_201_CREATED)
async def create_ai_radar_item(
    payload: AiRadarItemIn, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
):
    item = AiRadarItem(**payload.model_dump(), query="manual", is_manual=True)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=AiRadarItemOut)
async def update_ai_radar_item(
    item_id: int, payload: AiRadarItemIn, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
):
    item = await db.get(AiRadarItem, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI Radar item not found")
    for field, value in payload.model_dump().items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ai_radar_item(item_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    item = await db.get(AiRadarItem, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI Radar item not found")
    await db.delete(item)
    await db.commit()


@router.post("/run", response_model=AiRadarRunResult)
async def trigger_ai_radar_run(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    _require_ai_enabled()
    return await run_ai_radar_pipeline(db)
