import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, JSON, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CompetitionStatus(str, enum.Enum):
    waiting = "waiting"
    active = "active"
    finished = "finished"


class CompetitionRoom(Base):
    __tablename__ = "competition_rooms"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(8), unique=True, index=True, nullable=False)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    host_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    question_ids: Mapped[list[int]] = mapped_column(JSON, nullable=False, default=list)
    status: Mapped[CompetitionStatus] = mapped_column(
        Enum(CompetitionStatus, name="competition_status"), nullable=False, default=CompetitionStatus.waiting
    )
    current_question_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    question_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    time_limit_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=20)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    participants: Mapped[list["CompetitionParticipant"]] = relationship(
        back_populates="room", cascade="all, delete-orphan"
    )


class CompetitionParticipant(Base):
    __tablename__ = "competition_participants"
    __table_args__ = (UniqueConstraint("room_id", "user_id", name="uq_competition_participant_room_user"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("competition_rooms.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    room: Mapped["CompetitionRoom"] = relationship(back_populates="participants")


class CompetitionAnswer(Base):
    __tablename__ = "competition_answers"
    __table_args__ = (UniqueConstraint("participant_id", "question_id", name="uq_competition_answer_participant_question"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    participant_id: Mapped[int] = mapped_column(
        ForeignKey("competition_participants.id", ondelete="CASCADE"), nullable=False
    )
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    selected_option_id: Mapped[int | None] = mapped_column(
        ForeignKey("question_options.id", ondelete="SET NULL"), nullable=True
    )
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    points_awarded: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    answered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
