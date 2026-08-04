from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.exam import AttemptStatus, QuestionReportReason, QuestionType

# ---------- Admin: create/edit (may include correct answers) ----------


class QuestionOptionIn(BaseModel):
    option_text: str
    is_correct: bool = False
    order: int = 0


class MatchPairIn(BaseModel):
    left_text: str
    right_text: str
    order: int = 0


class FillBlankAnswerIn(BaseModel):
    blank_index: int = 0
    accepted_answers: list[str]


class TestCaseIn(BaseModel):
    input: str = ""
    expected_output: str
    is_sample: bool = False
    order: int = 0


class QuestionIn(BaseModel):
    type: QuestionType
    question_text: str
    order: int = 0
    points: float = 1.0
    options: list[QuestionOptionIn] = []
    match_pairs: list[MatchPairIn] = []
    fill_blank_answers: list[FillBlankAnswerIn] = []
    languages: list[str] = []
    starter_code: dict[str, str] = {}
    test_cases: list[TestCaseIn] = []


class ExamCreate(BaseModel):
    subject_id: int
    topic_id: int | None = None
    title: str
    description: str | None = None
    duration_minutes: int = 30
    available_from: datetime | None = None
    available_until: datetime | None = None
    questions_to_serve: int | None = None
    questions: list[QuestionIn] = []


class ExamReplace(ExamCreate):
    """Full replace of an exam's fields + questions (used for edits)."""


class PublishUpdate(BaseModel):
    is_published: bool


# ---------- Admin: AI-assisted question drafting ----------


class GenerateQuestionsIn(BaseModel):
    subject_id: int
    topic: str
    question_type: QuestionType
    count: int = 3


class GenerateQuestionsOut(BaseModel):
    questions: list[QuestionIn]
    generated_count: int
    rejected_count: int
    error: str | None = None


# ---------- Admin: read back (with correct answers) ----------


class QuestionOptionAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    option_text: str
    is_correct: bool
    order: int


class MatchPairAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    left_text: str
    right_text: str
    order: int


class FillBlankAnswerAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    blank_index: int
    accepted_answers: list[str]


class TestCaseAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    input: str
    expected_output: str
    is_sample: bool
    order: int


class QuestionAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    type: QuestionType
    question_text: str
    order: int
    points: float
    options: list[QuestionOptionAdminOut] = []
    match_pairs: list[MatchPairAdminOut] = []
    fill_blank_answers: list[FillBlankAnswerAdminOut] = []
    languages: list[str] | None = None
    starter_code: dict[str, str] | None = None
    test_cases: list[TestCaseAdminOut] = []


class ExamAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    subject_id: int
    topic_id: int | None
    title: str
    description: str | None
    duration_minutes: int
    questions_to_serve: int | None
    is_published: bool
    available_from: datetime | None
    available_until: datetime | None
    created_by: int
    created_at: datetime
    questions: list[QuestionAdminOut] = []


# ---------- Student-safe (no correct answers exposed) ----------


class ExamSummaryOut(BaseModel):
    id: int
    subject_id: int
    topic_id: int | None
    title: str
    description: str | None
    duration_minutes: int
    questions_to_serve: int | None
    is_published: bool
    available_from: datetime | None
    available_until: datetime | None
    question_count: int


class QuestionOptionSafeOut(BaseModel):
    id: int
    option_text: str
    order: int


class MatchItemSafeOut(BaseModel):
    id: int
    text: str
    order: int


class TestCaseSampleOut(BaseModel):
    id: int
    input: str
    expected_output: str


class QuestionSafeOut(BaseModel):
    id: int
    type: QuestionType
    question_text: str
    order: int
    points: float
    options: list[QuestionOptionSafeOut] = []
    match_left: list[MatchItemSafeOut] = []
    match_right: list[MatchItemSafeOut] = []
    blank_count: int = 0
    languages: list[str] | None = None
    starter_code: dict[str, str] | None = None
    sample_test_cases: list[TestCaseSampleOut] = []
    hidden_test_case_count: int = 0


class ExamSafeOut(BaseModel):
    id: int
    subject_id: int
    topic_id: int | None
    title: str
    description: str | None
    duration_minutes: int
    questions_to_serve: int | None = None
    is_published: bool
    questions: list[QuestionSafeOut] = []


# ---------- Attempts ----------


class AnswerIn(BaseModel):
    question_id: int
    answer: dict[str, Any]


class AttemptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    exam_id: int
    user_id: int
    started_at: datetime
    submitted_at: datetime | None
    score: float | None
    max_score: float | None
    status: AttemptStatus
    flagged_question_ids: list[int] = []
    current_index: int = 0
    saved_answers: list[AnswerIn] = []


class SubmitAttemptIn(BaseModel):
    answers: list[AnswerIn]


class AutosaveIn(BaseModel):
    answers: list[AnswerIn] = []
    flagged_question_ids: list[int] = []
    current_index: int = 0


class AttemptAnswerResultOut(BaseModel):
    question_id: int
    is_correct: bool | None
    points_awarded: float
    correct_answer: dict[str, Any]
    submitted_answer: dict[str, Any] = {}


class AttemptResultOut(AttemptOut):
    answers: list[AttemptAnswerResultOut] = []


# ---------- Coding: run against sample test cases (ungraded trial run) ----------


class RunCodeIn(BaseModel):
    language: str
    code: str


class TestCaseRunResultOut(BaseModel):
    input: str
    expected_output: str
    actual_output: str
    passed: bool
    error: str | None


class RunCodeResultOut(BaseModel):
    test_case_results: list[TestCaseRunResultOut]
    passed_count: int
    total_count: int


# ---------- Question reports ----------


class QuestionReportIn(BaseModel):
    reason: QuestionReportReason
    comment: str | None = None
    submitted_answer: dict[str, Any] | None = None


class QuestionReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    question_id: int
    reason: QuestionReportReason
    comment: str | None
    created_at: datetime


class QuestionReportAdminOut(QuestionReportOut):
    question_text: str
    exam_title: str
    reported_by: str
    your_answer: str | None
    correct_answer: str | None


# ---------- Exam feedback ----------


class ExamFeedbackIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    difficulty: str | None = None
    comment: str | None = None


class ExamFeedbackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    rating: int
    difficulty: str | None
    comment: str | None
    created_at: datetime


class ExamFeedbackCommentOut(BaseModel):
    rating: int
    difficulty: str | None
    comment: str | None
    submitted_by: str
    created_at: datetime


class ExamFeedbackSummaryOut(BaseModel):
    total_feedback: int
    average_rating: float
    difficulty_counts: dict[str, int]
    comments: list[ExamFeedbackCommentOut]
