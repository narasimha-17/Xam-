import asyncio

from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole


async def seed_admin() -> None:
    async with AsyncSessionLocal() as db:
        existing = await db.scalar(select(User).where(User.email == settings.seed_admin_email))
        if existing is not None:
            print(f"Admin already exists: {settings.seed_admin_email}")
            return

        admin = User(
            email=settings.seed_admin_email,
            hashed_password=hash_password(settings.seed_admin_password),
            full_name=settings.seed_admin_name,
            role=UserRole.admin,
        )
        db.add(admin)
        await db.commit()
        print(f"Created admin user: {settings.seed_admin_email}")


if __name__ == "__main__":
    asyncio.run(seed_admin())
