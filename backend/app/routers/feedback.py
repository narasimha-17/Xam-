import os
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.feedback import Feedback
from app.models.user import User
from app.schemas.feedback import FeedbackAdminOut, FeedbackOut

router = APIRouter(prefix="/feedback", tags=["feedback"])

MAX_IMAGE_SIZE = 8 * 1024 * 1024  # 8 MB
IMAGE_EXTENSION_BY_CONTENT_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
}


async def _save_image(file: UploadFile) -> str:
    ext = IMAGE_EXTENSION_BY_CONTENT_TYPE.get(file.content_type or "")
    if not ext:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only JPEG/PNG/GIF/WEBP images are allowed")
    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image exceeds 8MB limit")
    os.makedirs(settings.feedback_image_dir, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.feedback_image_dir, stored_name)
    with open(file_path, "wb") as f:
        f.write(contents)
    return file_path


def _out(fb: Feedback) -> FeedbackOut:
    return FeedbackOut(
        id=fb.id,
        description=fb.description,
        rating=fb.rating,
        image_url=f"/feedback/{fb.id}/image" if fb.image_path else None,
        created_at=fb.created_at,
    )


def _admin_out(fb: Feedback) -> FeedbackAdminOut:
    return FeedbackAdminOut(**_out(fb).model_dump(), user_id=fb.user_id, user_name=fb.user.full_name, user_email=fb.user.email)


@router.post("", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    description: str = Form(...),
    rating: int = Form(...),
    image: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not description.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Description is required")
    if not 1 <= rating <= 5:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rating must be between 1 and 5")

    image_path = await _save_image(image) if image is not None else None
    fb = Feedback(user_id=user.id, description=description.strip(), rating=rating, image_path=image_path)
    db.add(fb)
    await db.commit()
    await db.refresh(fb)
    return _out(fb)


@router.get("/me", response_model=list[FeedbackOut])
async def list_my_feedback(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.scalars(
        select(Feedback).where(Feedback.user_id == user.id).order_by(Feedback.created_at.desc())
    )
    return [_out(fb) for fb in result.all()]


@router.get("/admin/all", response_model=list[FeedbackAdminOut])
async def admin_list_feedback(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.scalars(
        select(Feedback).options(selectinload(Feedback.user)).order_by(Feedback.created_at.desc())
    )
    return [_admin_out(fb) for fb in result.all()]


@router.get("/{feedback_id}/image")
async def get_feedback_image(feedback_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    fb = await db.get(Feedback, feedback_id)
    if fb is None or not fb.image_path or not os.path.exists(fb.image_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    return FileResponse(fb.image_path)


@router.delete("/admin/{feedback_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feedback(feedback_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    fb = await db.get(Feedback, feedback_id)
    if fb is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")
    if fb.image_path and os.path.exists(fb.image_path):
        os.remove(fb.image_path)
    await db.delete(fb)
    await db.commit()
