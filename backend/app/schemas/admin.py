from datetime import datetime

from pydantic import BaseModel


class ActivityLogOut(BaseModel):
    id: int
    admin_name: str | None
    action: str
    target_type: str
    target_id: int | None
    detail: str | None
    created_at: datetime


class ReportedQuestionStat(BaseModel):
    question_id: int
    question_text: str
    report_count: int


class PlatformStatsOut(BaseModel):
    total_students: int
    active_students: int
    total_admins: int
    total_subjects: int
    total_exams: int
    published_exams: int
    total_pdfs: int
    total_attempts: int
    submitted_attempts: int
    average_score_pct: float
    total_discussion_threads: int
    total_discussion_posts: int
    open_question_reports: int
    most_reported_questions: list[ReportedQuestionStat]
