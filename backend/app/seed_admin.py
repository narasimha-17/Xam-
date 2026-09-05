import asyncio

from sqlalchemy import select

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole


async def seed_admin() -> None:
    """Ensures a row exists for SEED_ADMIN_EMAIL with role=admin and no firebase_uid yet.
    It gets linked to a real Firebase account automatically the first time someone signs
    in (via Google or email/password) with that exact email — see app/core/deps.py."""
    async with AsyncSessionLocal() as db:
        existing = await db.scalar(select(User).where(User.email == settings.seed_admin_email))
        if existing is not None:
            print(f"Admin already exists: {settings.seed_admin_email}")
            return

        admin = User(
            email=settings.seed_admin_email,
            full_name=settings.seed_admin_name,
            role=UserRole.admin,
        )
        db.add(admin)
        await db.commit()
        print(f"Seeded admin placeholder for: {settings.seed_admin_email} — sign in with that email to claim it.")


if __name__ == "__main__":
    asyncio.run(seed_admin())
