import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ProctorEventType(str, enum.Enum):
    tab_switch = "tab_switch"
    fullscreen_exit = "fullscreen_exit"
    copy_attempt = "copy_attempt"
    paste_attempt = "paste_attempt"
    webcam_snapshot = "webcam_snapshot"
    screenshot_attempt = "screenshot_attempt"
    no_face_detected = "no_face_detected"
    multiple_faces = "multiple_faces"


class ProctorEvent(Base):
    __tablename__ = "proctor_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    attempt_id: Mapped[int] = mapped_column(ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False)
    event_type: Mapped[ProctorEventType] = mapped_column(
        Enum(ProctorEventType, name="proctor_event_type"), nullable=False
    )
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    snapshot_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
