from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AiRadarItem(Base):
    __tablename__ = "ai_radar_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    url: Mapped[str] = mapped_column(String(1000), nullable=False, unique=True)
    source: Mapped[str | None] = mapped_column(String(200), nullable=True)
    snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    query: Mapped[str] = mapped_column(String(200), nullable=False, default="manual", server_default="manual")
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    use_cases: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_manual: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    found_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
