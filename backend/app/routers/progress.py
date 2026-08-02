from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.exam import AttemptStatus, Exam, ExamAttempt
from app.models.proctoring import ProctorEvent, ProctorEventType
from app.models.subject import Subject
from app.models.user import User, UserRole
from app.schemas.progress import (
    AttemptHistoryEntry,
    BadgeOut,
    ProgressStats,
    StudentAttemptOut,
    StudentProgressOut,
    SubjectProgress,
)
from app.services.badges import get_user_badges

router = APIRouter(prefix="/progress", tags=["progress"])

# webcam_snapshot is routine monitoring, not a malpractice signal — every other
# event type represents a genuine rule violation.
VIOLATION_TYPES = [t for t in ProctorEventType if t != ProctorEventType.webcam_snapshot]


@router.get("/me", response_model=ProgressStats)
async def my_progress(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(ExamAttempt, Exam.subject_id, Subject.name, Exam.title)
        .join(Exam, Exam.id == ExamAttempt.exam_id)
        .join(Subject, Subject.id == Exam.subject_id)
        .where(ExamAttempt.user_id == user.id, ExamAttempt.status == AttemptStatus.submitted)
        .order_by(ExamAttempt.submitted_at.asc())
    )
    rows = result.all()

    if not rows:
        return ProgressStats(total_attempts=0, average_score_pct=0.0, subjects=[], history=[])

    per_subject: dict[int, dict] = {}
    total_pct_sum = 0.0
    history: list[AttemptHistoryEntry] = []
    for attempt, subject_id, subject_name, exam_title in rows:
        pct = (attempt.score / attempt.max_score * 100) if attempt.max_score else 0.0
        total_pct_sum += pct
        entry = per_subject.setdefault(subject_id, {"name": subject_name, "attempts": 0, "pct_sum": 0.0})
        entry["attempts"] += 1
        entry["pct_sum"] += pct
        history.append(
            AttemptHistoryEntry(
                attempt_id=attempt.id,
                submitted_at=attempt.submitted_at,
                score_pct=round(pct, 1),
                exam_title=exam_title,
                subject_name=subject_name,
            )
        )

    subjects_out = [
        SubjectProgress(
            subject_id=sid,
            subject_name=data["name"],
            attempts=data["attempts"],
            average_score_pct=round(data["pct_sum"] / data["attempts"], 1),
        )
        for sid, data in per_subject.items()
    ]

    return ProgressStats(
        total_attempts=len(rows),
        average_score_pct=round(total_pct_sum / len(rows), 1),
        subjects=subjects_out,
        history=history,
    )


@router.get("/badges", response_model=list[BadgeOut])
async def my_badges(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    return await get_user_badges(db, user.id)


@router.get("/students", response_model=list[StudentProgressOut])
async def all_students_progress(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    students_result = await db.execute(select(User).where(User.role == UserRole.student).order_by(User.full_name))
    students = students_result.scalars().all()

    attempts_result = await db.execute(
        select(ExamAttempt.user_id, ExamAttempt.score, ExamAttempt.max_score, ExamAttempt.submitted_at).where(
            ExamAttempt.status == AttemptStatus.submitted
        )
    )
    attempts = attempts_result.all()

    per_user: dict[int, dict] = {}
    for user_id, score, max_score, submitted_at in attempts:
        pct = (score / max_score * 100) if max_score else 0.0
        entry = per_user.setdefault(user_id, {"count": 0, "pct_sum": 0.0, "last": None})
        entry["count"] += 1
        entry["pct_sum"] += pct
        if entry["last"] is None or (submitted_at and submitted_at > entry["last"]):
            entry["last"] = submitted_at

    violations_result = await db.execute(
        select(ExamAttempt.user_id, func.count(ProctorEvent.id))
        .join(ProctorEvent, ProctorEvent.attempt_id == ExamAttempt.id)
        .where(ProctorEvent.event_type.in_(VIOLATION_TYPES))
        .group_by(ExamAttempt.user_id)
    )
    violations_by_user = dict(violations_result.all())

    return [
        StudentProgressOut(
            user_id=s.id,
            full_name=s.full_name,
            email=s.email,
            roll_number=s.roll_number,
            total_attempts=per_user.get(s.id, {}).get("count", 0),
            average_score_pct=round(per_user[s.id]["pct_sum"] / per_user[s.id]["count"], 1) if s.id in per_user else 0.0,
            last_attempt_at=per_user.get(s.id, {}).get("last"),
            total_violations=violations_by_user.get(s.id, 0),
        )
        for s in students
    ]


@router.get("/students/{user_id}/attempts", response_model=list[StudentAttemptOut])
async def student_attempts(user_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    student = await db.get(User, user_id)
    if student is None or student.role != UserRole.student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    result = await db.execute(
        select(ExamAttempt, Exam.title, Subject.name)
        .join(Exam, Exam.id == ExamAttempt.exam_id)
        .join(Subject, Subject.id == Exam.subject_id)
        .where(ExamAttempt.user_id == user_id, ExamAttempt.status == AttemptStatus.submitted)
        .order_by(ExamAttempt.submitted_at.desc())
    )
    rows = result.all()

    violations_result = await db.execute(
        select(ProctorEvent.attempt_id, func.count(ProctorEvent.id))
        .join(ExamAttempt, ExamAttempt.id == ProctorEvent.attempt_id)
        .where(ExamAttempt.user_id == user_id, ProctorEvent.event_type.in_(VIOLATION_TYPES))
        .group_by(ProctorEvent.attempt_id)
    )
    violations_by_attempt = dict(violations_result.all())

    return [
        StudentAttemptOut(
            attempt_id=attempt.id,
            exam_title=exam_title,
            subject_name=subject_name,
            score=attempt.score,
            max_score=attempt.max_score,
            submitted_at=attempt.submitted_at,
            violation_count=violations_by_attempt.get(attempt.id, 0),
        )
        for attempt, exam_title, subject_name in rows
    ]
