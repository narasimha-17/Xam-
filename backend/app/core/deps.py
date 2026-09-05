from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from firebase_admin import auth as firebase_auth
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.firebase import get_firebase_app
from app.db.session import get_db
from app.models.user import User, UserRole

# tokenUrl is unused (Firebase issues tokens client-side) but required by the OAuth2
# scheme class; it only affects the OpenAPI docs' "Authorize" button.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/me", auto_error=False)


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token is None:
        raise credentials_error

    try:
        decoded = firebase_auth.verify_id_token(token, app=get_firebase_app())
    except Exception:
        raise credentials_error

    uid = decoded.get("uid")
    email = decoded.get("email")
    if not uid or not email:
        raise credentials_error

    user = await db.scalar(select(User).where(User.firebase_uid == uid))
    if user is None:
        # Either a brand-new sign-in, or a pre-seeded row (e.g. the admin) waiting to
        # be claimed by whoever first logs in with that email.
        user = await db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(
                email=email,
                full_name=decoded.get("name") or email.split("@")[0],
                role=UserRole.student,
            )
            db.add(user)
        user.firebase_uid = uid
        await db.commit()
        await db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been disabled")
    return user


def require_role(*roles: UserRole):
    async def _checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return _checker


require_admin = require_role(UserRole.admin)
