from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system import Notification


async def notify(
    db: AsyncSession,
    user_id: int,
    type: str,
    message: str,
    link: str | None = None,
) -> None:
    """Creates an in-app notification. Caller is responsible for committing."""
    db.add(Notification(user_id=user_id, type=type, message=message, link=link))
