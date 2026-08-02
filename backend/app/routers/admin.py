from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_admin
from app.db.session import get_db
from app.models.discussion import DiscussionPost, DiscussionThread
from app.models.exam import AttemptStatus, Exam, ExamAttempt, Question, QuestionReport
from app.models.pdf import Pdf
from app.models.subject import Subject
from app.models.system import AdminActivityLog
from app.models.user import User, UserRole
from app.schemas.admin import ActivityLogOut, PlatformStatsOut, ReportedQuestionStat

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/activity-log", response_model=list[ActivityLogOut])
async def list_activity_log(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.scalars(
        select(AdminActivityLog).order_by(AdminActivityLog.created_at.desc()).limit(min(max(limit, 1), 500))
    )
    rows = result.all()
    admin_ids = {r.admin_id for r in rows if r.admin_id is not None}
    admins: dict[int, str] = {}
    if admin_ids:
        admin_rows = await db.scalars(select(User).where(User.id.in_(admin_ids)))
        admins = {a.id: a.full_name for a in admin_rows.all()}

    return [
        ActivityLogOut(
            id=r.id,
            admin_name=admins.get(r.admin_id) if r.admin_id else None,
            action=r.action,
            target_type=r.target_type,
            target_id=r.target_id,
            detail=r.detail,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.get("/stats", response_model=PlatformStatsOut)
async def platform_stats(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    total_students = await db.scalar(select(func.count()).select_from(User).where(User.role == UserRole.student))
    active_students = await db.scalar(
        select(func.count()).select_from(User).where(User.role == UserRole.student, User.is_active.is_(True))
    )
    total_admins = await db.scalar(select(func.count()).select_from(User).where(User.role == UserRole.admin))
    total_subjects = await db.scalar(select(func.count()).select_from(Subject))
    total_exams = await db.scalar(select(func.count()).select_from(Exam))
    published_exams = await db.scalar(select(func.count()).select_from(Exam).where(Exam.is_published.is_(True)))
    total_pdfs = await db.scalar(select(func.count()).select_from(Pdf))
    total_attempts = await db.scalar(select(func.count()).select_from(ExamAttempt))
    submitted_attempts = await db.scalar(
        select(func.count()).select_from(ExamAttempt).where(ExamAttempt.status == AttemptStatus.submitted)
    )
    total_threads = await db.scalar(select(func.count()).select_from(DiscussionThread))
    total_posts = await db.scalar(select(func.count()).select_from(DiscussionPost))
    open_reports = await db.scalar(select(func.count()).select_from(QuestionReport))

    score_rows = (
        await db.scalars(
            select(ExamAttempt).where(
                ExamAttempt.status == AttemptStatus.submitted, ExamAttempt.max_score > 0
            )
        )
    ).all()
    average_score_pct = (
        sum(a.score / a.max_score * 100 for a in score_rows) / len(score_rows) if score_rows else 0.0
    )

    report_counts = await db.execute(
        select(QuestionReport.question_id, func.count().label("cnt"))
        .group_by(QuestionReport.question_id)
        .order_by(func.count().desc())
        .limit(5)
    )
    report_rows = report_counts.all()
    question_ids = [r.question_id for r in report_rows]
    questions_by_id: dict[int, str] = {}
    if question_ids:
        q_rows = await db.scalars(select(Question).where(Question.id.in_(question_ids)))
        questions_by_id = {q.id: q.question_text for q in q_rows.all()}

    most_reported = [
        ReportedQuestionStat(
            question_id=r.question_id,
            question_text=questions_by_id.get(r.question_id, "(deleted question)"),
            report_count=r.cnt,
        )
        for r in report_rows
    ]

    return PlatformStatsOut(
        total_students=total_students or 0,
        active_students=active_students or 0,
        total_admins=total_admins or 0,
        total_subjects=total_subjects or 0,
        total_exams=total_exams or 0,
        published_exams=published_exams or 0,
        total_pdfs=total_pdfs or 0,
        total_attempts=total_attempts or 0,
        submitted_attempts=submitted_attempts or 0,
        average_score_pct=round(average_score_pct, 1),
        total_discussion_threads=total_threads or 0,
        total_discussion_posts=total_posts or 0,
        open_question_reports=open_reports or 0,
        most_reported_questions=most_reported,
    )
