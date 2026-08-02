from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system import AdminActivityLog


async def log_admin_action(
    db: AsyncSession,
    admin_id: int,
    action: str,
    target_type: str,
    target_id: int | None = None,
    detail: str | None = None,
) -> None:
    """Appends an audit row. Caller is responsible for committing (usually alongside the action itself)."""
    db.add(
        AdminActivityLog(
            admin_id=admin_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            detail=detail,
        )
    )
