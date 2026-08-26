from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    email: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    phone: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    location: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # Each a list of dicts, e.g. education: [{institution, degree, field, start, end, gpa}]
    education: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    experience: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    projects: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    skills: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    certifications: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
