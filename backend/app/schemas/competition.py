from datetime import datetime

from pydantic import BaseModel

from app.models.competition import CompetitionStatus


class CompetitionCreateIn(BaseModel):
    exam_id: int
    time_limit_seconds: int = 20


class CompetitionJoinIn(BaseModel):
    code: str


class ParticipantOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    score: float


class CompetitionOptionOut(BaseModel):
    id: int
    option_text: str
    order: int


class CompetitionQuestionOut(BaseModel):
    id: int
    question_text: str
    points: float
    options: list[CompetitionOptionOut]


class CompetitionStateOut(BaseModel):
    id: int
    code: str
    exam_title: str
    status: CompetitionStatus
    current_question_index: int
    total_questions: int
    time_limit_seconds: int
    question_started_at: datetime | None
    current_question: CompetitionQuestionOut | None
    participants: list[ParticipantOut]
    is_host: bool
    my_participant_id: int | None
    has_answered_current: bool
    answered_count: int


class CompetitionAnswerIn(BaseModel):
    question_id: int
    selected_option_id: int


class CompetitionAnswerResultOut(BaseModel):
    is_correct: bool
    points_awarded: float
    correct_option_id: int
