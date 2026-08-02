import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.system import PasswordResetToken
from app.models.user import User, UserRole
from app.schemas.user import ForgotPasswordIn, ResetPasswordIn, Token, UserOut, UserRegister, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger("app.auth")

RESET_TOKEN_TTL = timedelta(hours=1)


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    existing = await db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        phone_number=payload.phone_number,
        location=payload.location,
        institution=payload.institution,
        role=UserRole.student,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == form_data.username))
    if user is None or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been disabled")

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
async def update_me(
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for field in ("full_name", "phone_number", "location", "institution"):
        value = getattr(payload, field)
        if value is not None:
            stripped = value.strip()
            if not stripped:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This field cannot be empty")
            setattr(current_user, field, stripped)

    if payload.new_password:
        if not payload.current_password or not verify_password(payload.current_password, current_user.hashed_password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
        if len(payload.new_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 8 characters"
            )
        current_user.hashed_password = hash_password(payload.new_password)

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(payload: ForgotPasswordIn, db: AsyncSession = Depends(get_db)):
    generic_response = {"detail": "If that email is registered, a reset link has been sent."}

    user = await db.scalar(select(User).where(User.email == payload.email))
    if user is None or not user.is_active:
        return generic_response

    token = secrets.token_urlsafe(32)
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=datetime.now(timezone.utc) + RESET_TOKEN_TTL,
        )
    )
    await db.commit()

    reset_link = f"{settings.frontend_url}/reset-password?token={token}"
    logger.warning(
        "[DEV] Password reset requested for %s. No email service is configured, so here's the link:\n  %s\n"
        "  (expires in %s)",
        user.email,
        reset_link,
        RESET_TOKEN_TTL,
    )
    return generic_response


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(payload: ResetPasswordIn, db: AsyncSession = Depends(get_db)):
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")

    reset_token = await db.scalar(select(PasswordResetToken).where(PasswordResetToken.token == payload.token))
    now = datetime.now(timezone.utc)
    if (
        reset_token is None
        or reset_token.used_at is not None
        or reset_token.expires_at < now
    ):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This reset link is invalid or has expired")

    user = await db.get(User, reset_token.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This reset link is invalid or has expired")

    user.hashed_password = hash_password(payload.new_password)
    reset_token.used_at = now
    await db.commit()
