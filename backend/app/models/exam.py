import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class QuestionType(str, enum.Enum):
    mcq = "mcq"
    maq = "maq"
    match = "match"
    fill_blank = "fill_blank"
    coding = "coding"


class AttemptStatus(str, enum.Enum):
    in_progress = "in_progress"
    submitted = "submitted"


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    topic_id: Mapped[int | None] = mapped_column(ForeignKey("topics.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    available_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    available_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    questions: Mapped[list["Question"]] = relationship(
        back_populates="exam", cascade="all, delete-orphan", order_by="Question.order"
    )


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[QuestionType] = mapped_column(Enum(QuestionType, name="question_type"), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    points: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)

    # coding-type only
    languages: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    starter_code: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    exam: Mapped["Exam"] = relationship(back_populates="questions")
    options: Mapped[list["QuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="QuestionOption.order"
    )
    match_pairs: Mapped[list["MatchPair"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="MatchPair.order"
    )
    fill_blank_answers: Mapped[list["FillBlankAnswer"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="FillBlankAnswer.blank_index"
    )
    test_cases: Mapped[list["TestCase"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="TestCase.order"
    )


class QuestionReportReason(str, enum.Enum):
    wrong_answer = "wrong_answer"
    unclear_wording = "unclear_wording"
    typo = "typo"
    other = "other"


class QuestionReport(Base):
    __tablename__ = "question_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    reason: Mapped[QuestionReportReason] = mapped_column(
        Enum(QuestionReportReason, name="question_report_reason"), nullable=False
    )
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    your_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    correct_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class QuestionOption(Base):
    __tablename__ = "question_options"

    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    option_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    question: Mapped["Question"] = relationship(back_populates="options")


class MatchPair(Base):
    __tablename__ = "match_pairs"

    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    left_text: Mapped[str] = mapped_column(Text, nullable=False)
    right_text: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    question: Mapped["Question"] = relationship(back_populates="match_pairs")


class FillBlankAnswer(Base):
    __tablename__ = "fill_blank_answers"

    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    blank_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    accepted_answers: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False)

    question: Mapped["Question"] = relationship(back_populates="fill_blank_answers")


class TestCase(Base):
    __tablename__ = "test_cases"

    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    input: Mapped[str] = mapped_column(Text, nullable=False, default="")
    expected_output: Mapped[str] = mapped_column(Text, nullable=False)
    is_sample: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    question: Mapped["Question"] = relationship(back_populates="test_cases")


class ExamAttempt(Base):
    __tablename__ = "exam_attempts"

    id: Mapped[int] = mapped_column(primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[AttemptStatus] = mapped_column(
        Enum(AttemptStatus, name="attempt_status"), nullable=False, default=AttemptStatus.in_progress
    )
    flagged_question_ids: Mapped[list[int] | None] = mapped_column(JSON, nullable=True)
    current_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    answers: Mapped[list["AttemptAnswer"]] = relationship(back_populates="attempt", cascade="all, delete-orphan")


class AttemptAnswer(Base):
    __tablename__ = "attempt_answers"

    id: Mapped[int] = mapped_column(primary_key=True)
    attempt_id: Mapped[int] = mapped_column(ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    answer_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    points_awarded: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    graded_detail: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    attempt: Mapped["ExamAttempt"] = relationship(back_populates="answers")
