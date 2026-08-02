import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_admin
from app.core.security import hash_password
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.user import AdminResetPasswordOut, UserActiveUpdate, UserOut, UserRoleUpdate
from app.services.activity_log import log_admin_action

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
async def list_users(
    search: str | None = None,
    role: UserRole | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = select(User).order_by(User.created_at.desc())
    if role is not None:
        query = query.where(User.role == role)
    if search:
        like = f"%{search.strip()}%"
        query = query.where((User.full_name.ilike(like)) | (User.email.ilike(like)))
    result = await db.scalars(query)
    return result.all()


@router.patch("/{user_id}/role", response_model=UserOut)
async def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if user_id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't change your own role")
    target = await db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    target.role = payload.role
    await log_admin_action(db, admin.id, "update_role", "user", user_id, f"role -> {payload.role.value}")
    await db.commit()
    await db.refresh(target)
    return target


@router.patch("/{user_id}/active", response_model=UserOut)
async def update_user_active(
    user_id: int,
    payload: UserActiveUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if user_id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't deactivate your own account")
    target = await db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    target.is_active = payload.is_active
    action = "activate_user" if payload.is_active else "deactivate_user"
    await log_admin_action(db, admin.id, action, "user", user_id)
    await db.commit()
    await db.refresh(target)
    return target


@router.post("/{user_id}/reset-password", response_model=AdminResetPasswordOut)
async def admin_reset_password(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    target = await db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    temp_password = secrets.token_urlsafe(9)
    target.hashed_password = hash_password(temp_password)
    await log_admin_action(db, admin.id, "reset_password", "user", user_id)
    await db.commit()
    return AdminResetPasswordOut(temporary_password=temp_password)
