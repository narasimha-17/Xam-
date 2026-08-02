import asyncio
import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.exam import (
    AttemptStatus,
    Exam,
    ExamAttempt,
    AttemptAnswer,
    FillBlankAnswer,
    MatchPair,
    Question,
    QuestionOption,
    QuestionReport,
    QuestionType,
    TestCase,
)
from app.models.subject import Subject
from app.models.user import User, UserRole
from pydantic import ValidationError

from app.schemas.exam import (
    AnswerIn,
    AttemptOut,
    AttemptResultOut,
    AutosaveIn,
    ExamAdminOut,
    ExamCreate,
    ExamReplace,
    ExamSafeOut,
    ExamSummaryOut,
    GenerateQuestionsIn,
    GenerateQuestionsOut,
    MatchItemSafeOut,
    PublishUpdate,
    QuestionIn,
    QuestionOptionSafeOut,
    QuestionReportAdminOut,
    QuestionReportIn,
    QuestionReportOut,
    QuestionSafeOut,
    RunCodeIn,
    RunCodeResultOut,
    SubmitAttemptIn,
    TestCaseSampleOut,
)
from app.services import jdoodle, ollama
from app.services.activity_log import log_admin_action
from app.services.badges import get_user_badges
from app.services.grading import grade_attempt
from app.services.notifications import notify

router = APIRouter(prefix="/exams", tags=["exams"])

QUESTIONS_OPTIONS = selectinload(Exam.questions).options(
    selectinload(Question.options),
    selectinload(Question.match_pairs),
    selectinload(Question.fill_blank_answers),
    selectinload(Question.test_cases),
)


def _describe_answer(question: Question, payload: dict | None) -> str:
    if not payload:
        return "No answer"

    if question.type == QuestionType.mcq:
        oid = payload.get("selected_option_id")
        opt = next((o for o in question.options if o.id == oid), None)
        return opt.option_text if opt else "No answer"

    if question.type == QuestionType.maq:
        ids = payload.get("selected_option_ids") or []
        texts = [o.option_text for o in question.options if o.id in ids]
        return ", ".join(texts) if texts else "No answer"

    if question.type == QuestionType.match:
        pairs = payload.get("pairs") or {}
        parts = []
        for p in question.match_pairs:
            right_id = pairs.get(str(p.id))
            right = next((mp.right_text for mp in question.match_pairs if mp.id == right_id), None)
            if right is not None:
                parts.append(f"{p.left_text} -> {right}")
        return ", ".join(parts) if parts else "No answer"

    if question.type == QuestionType.fill_blank:
        blanks = payload.get("blanks") or {}
        value = blanks.get("0")
        if isinstance(value, list):
            return " / ".join(value) if value else "No answer"
        return str(value) if value else "No answer"

    return "(coding question)"


def _correct_answer_payload(question: Question) -> dict:
    if question.type == QuestionType.mcq:
        correct = next((o for o in question.options if o.is_correct), None)
        return {"selected_option_id": correct.id if correct else None}
    if question.type == QuestionType.maq:
        return {"selected_option_ids": [o.id for o in question.options if o.is_correct]}
    if question.type == QuestionType.match:
        return {"pairs": {str(p.id): p.id for p in question.match_pairs}}
    if question.type == QuestionType.fill_blank:
        return {"blanks": {str(fb.blank_index): fb.accepted_answers for fb in question.fill_blank_answers}}
    return {}


def _to_safe_question(question: Question) -> QuestionSafeOut:
    match_right = list(question.match_pairs)
    random.shuffle(match_right)
    samples = [tc for tc in question.test_cases if tc.is_sample]
    hidden_count = len(question.test_cases) - len(samples)
    return QuestionSafeOut(
        id=question.id,
        type=question.type,
        question_text=question.question_text,
        order=question.order,
        points=question.points,
        options=[
            QuestionOptionSafeOut(id=o.id, option_text=o.option_text, order=o.order) for o in question.options
        ],
        match_left=[MatchItemSafeOut(id=p.id, text=p.left_text, order=p.order) for p in question.match_pairs],
        match_right=[MatchItemSafeOut(id=p.id, text=p.right_text, order=i) for i, p in enumerate(match_right)],
        blank_count=len(question.fill_blank_answers),
        languages=question.languages,
        starter_code=question.starter_code,
        sample_test_cases=[TestCaseSampleOut(id=tc.id, input=tc.input, expected_output=tc.expected_output) for tc in samples],
        hidden_test_case_count=hidden_count,
    )


def _to_safe_exam(exam: Exam) -> ExamSafeOut:
    return ExamSafeOut(
        id=exam.id,
        subject_id=exam.subject_id,
        topic_id=exam.topic_id,
        title=exam.title,
        description=exam.description,
        duration_minutes=exam.duration_minutes,
        is_published=exam.is_published,
        questions=[_to_safe_question(q) for q in sorted(exam.questions, key=lambda q: q.order)],
    )


def _apply_questions(exam: Exam, questions_in: list) -> None:
    exam.questions = [
        Question(
            type=q.type,
            question_text=q.question_text,
            order=q.order,
            points=q.points,
            options=[QuestionOption(**o.model_dump()) for o in q.options],
            match_pairs=[MatchPair(**p.model_dump()) for p in q.match_pairs],
            fill_blank_answers=[FillBlankAnswer(**f.model_dump()) for f in q.fill_blank_answers],
            languages=q.languages or None,
            starter_code=q.starter_code or None,
            test_cases=[TestCase(**tc.model_dump()) for tc in q.test_cases],
        )
        for q in questions_in
    ]


@router.get("", response_model=list[ExamSummaryOut])
async def list_exams(
    subject_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(Exam).options(selectinload(Exam.questions))
    if subject_id is not None:
        query = query.where(Exam.subject_id == subject_id)
    if user.role != UserRole.admin:
        query = query.where(Exam.is_published.is_(True))
    result = await db.scalars(query.order_by(Exam.created_at.desc()))
    exams = result.all()
    return [
        ExamSummaryOut(
            id=e.id,
            subject_id=e.subject_id,
            topic_id=e.topic_id,
            title=e.title,
            description=e.description,
            duration_minutes=e.duration_minutes,
            is_published=e.is_published,
            available_from=e.available_from,
            available_until=e.available_until,
            question_count=len(e.questions),
        )
        for e in exams
    ]


@router.post("/generate-questions", response_model=GenerateQuestionsOut)
async def generate_questions_endpoint(
    payload: GenerateQuestionsIn, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
):
    if not settings.ai_features_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Xipe isn't available in this environment.",
        )
    subject = await db.get(Subject, payload.subject_id)
    if subject is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    count = max(1, min(payload.count, 100))
    try:
        async with ollama.ollama_slot():
            outcome = await ollama.generate_questions(payload.topic, subject.name, payload.question_type.value, count)
    except ollama.OllamaBusy:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Xipe is busy with another request right now. Try again shortly.",
        )
    if outcome["error"]:
        return GenerateQuestionsOut(questions=[], generated_count=0, rejected_count=0, error=outcome["error"])

    accepted: list[QuestionIn] = []
    for i, raw in enumerate(outcome["questions"]):
        if not isinstance(raw, dict):
            continue
        raw.setdefault("type", payload.question_type.value)
        raw["order"] = i
        try:
            accepted.append(QuestionIn(**raw))
        except (ValidationError, TypeError):
            continue

    rejected_count = len(outcome["questions"]) - len(accepted)
    error = "Model returned some malformed questions; only the valid ones are shown." if rejected_count else None
    return GenerateQuestionsOut(
        questions=accepted, generated_count=len(accepted), rejected_count=rejected_count, error=error
    )


@router.post(
    "/questions/{question_id}/report", response_model=QuestionReportOut, status_code=status.HTTP_201_CREATED
)
async def report_question(
    question_id: int,
    payload: QuestionReportIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.scalars(
        select(Question)
        .where(Question.id == question_id)
        .options(selectinload(Question.options), selectinload(Question.match_pairs), selectinload(Question.fill_blank_answers))
    )
    question = result.first()
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    report = QuestionReport(
        question_id=question_id,
        user_id=user.id,
        reason=payload.reason,
        comment=payload.comment,
        your_answer=_describe_answer(question, payload.submitted_answer),
        correct_answer=_describe_answer(question, _correct_answer_payload(question)),
    )
    db.add(report)
    admin_ids = (await db.scalars(select(User.id).where(User.role == UserRole.admin))).all()
    for admin_id in admin_ids:
        await notify(
            db, admin_id, "question_reported", f"{user.full_name} reported a question", link="/admin/reports"
        )
    await db.commit()
    await db.refresh(report)
    return report


@router.get("/reports/all", response_model=list[QuestionReportAdminOut])
async def list_question_reports(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(
        select(QuestionReport, Question.question_text, Exam.title, User.full_name)
        .join(Question, Question.id == QuestionReport.question_id)
        .join(Exam, Exam.id == Question.exam_id)
        .join(User, User.id == QuestionReport.user_id)
        .order_by(QuestionReport.created_at.desc())
    )
    rows = result.all()
    return [
        QuestionReportAdminOut(
            id=report.id,
            question_id=report.question_id,
            reason=report.reason,
            comment=report.comment,
            created_at=report.created_at,
            question_text=question_text,
            exam_title=exam_title,
            reported_by=full_name,
            your_answer=report.your_answer,
            correct_answer=report.correct_answer,
        )
        for report, question_text, exam_title, full_name in rows
    ]


@router.post("", response_model=ExamAdminOut, status_code=status.HTTP_201_CREATED)
async def create_exam(payload: ExamCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    subject = await db.get(Subject, payload.subject_id)
    if subject is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    exam = Exam(
        subject_id=payload.subject_id,
        topic_id=payload.topic_id,
        title=payload.title,
        description=payload.description,
        duration_minutes=payload.duration_minutes,
        available_from=payload.available_from,
        available_until=payload.available_until,
        created_by=admin.id,
    )
    _apply_questions(exam, payload.questions)
    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    result = await db.scalars(select(Exam).where(Exam.id == exam.id).options(QUESTIONS_OPTIONS))
    return result.one()


async def _get_exam_or_404(exam_id: int, db: AsyncSession) -> Exam:
    result = await db.scalars(select(Exam).where(Exam.id == exam_id).options(QUESTIONS_OPTIONS))
    exam = result.first()
    if exam is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
    return exam


@router.get("/{exam_id}")
async def get_exam(exam_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    exam = await _get_exam_or_404(exam_id, db)
    if user.role == UserRole.admin:
        return ExamAdminOut.model_validate(exam)
    if not exam.is_published:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Exam is not published")
    return _to_safe_exam(exam)


@router.put("/{exam_id}", response_model=ExamAdminOut)
async def replace_exam(
    exam_id: int, payload: ExamReplace, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
):
    exam = await _get_exam_or_404(exam_id, db)
    exam.subject_id = payload.subject_id
    exam.topic_id = payload.topic_id
    exam.title = payload.title
    exam.description = payload.description
    exam.duration_minutes = payload.duration_minutes
    exam.available_from = payload.available_from
    exam.available_until = payload.available_until
    _apply_questions(exam, payload.questions)
    await db.commit()
    result = await db.scalars(select(Exam).where(Exam.id == exam_id).options(QUESTIONS_OPTIONS))
    return result.one()


@router.patch("/{exam_id}/publish", response_model=ExamAdminOut)
async def publish_exam(
    exam_id: int, payload: PublishUpdate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)
):
    exam = await _get_exam_or_404(exam_id, db)
    was_published = exam.is_published
    exam.is_published = payload.is_published
    await log_admin_action(
        db, admin.id, "publish_exam" if payload.is_published else "unpublish_exam", "exam", exam_id, exam.title
    )
    if payload.is_published and not was_published:
        student_ids = (await db.scalars(select(User.id).where(User.role == UserRole.student))).all()
        for student_id in student_ids:
            await notify(
                db,
                student_id,
                "exam_published",
                f'New exam available: "{exam.title}"',
                link=f"/subjects/{exam.subject_id}",
            )
    await db.commit()
    result = await db.scalars(select(Exam).where(Exam.id == exam_id).options(QUESTIONS_OPTIONS))
    return result.one()


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(exam_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    exam = await _get_exam_or_404(exam_id, db)
    await log_admin_action(db, admin.id, "delete_exam", "exam", exam_id, exam.title)
    await db.delete(exam)
    await db.commit()


@router.post("/{exam_id}/duplicate", response_model=ExamAdminOut, status_code=status.HTTP_201_CREATED)
async def duplicate_exam(exam_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    source = await _get_exam_or_404(exam_id, db)

    copy = Exam(
        subject_id=source.subject_id,
        topic_id=source.topic_id,
        title=f"{source.title} (copy)",
        description=source.description,
        duration_minutes=source.duration_minutes,
        available_from=None,
        available_until=None,
        is_published=False,
        created_by=admin.id,
    )
    for q in source.questions:
        copy.questions.append(
            Question(
                type=q.type,
                question_text=q.question_text,
                order=q.order,
                points=q.points,
                languages=list(q.languages) if q.languages else None,
                starter_code=dict(q.starter_code) if q.starter_code else None,
                options=[
                    QuestionOption(option_text=o.option_text, is_correct=o.is_correct, order=o.order)
                    for o in q.options
                ],
                match_pairs=[
                    MatchPair(left_text=p.left_text, right_text=p.right_text, order=p.order) for p in q.match_pairs
                ],
                fill_blank_answers=[
                    FillBlankAnswer(blank_index=fb.blank_index, accepted_answers=list(fb.accepted_answers))
                    for fb in q.fill_blank_answers
                ],
                test_cases=[
                    TestCase(
                        input=tc.input,
                        expected_output=tc.expected_output,
                        is_sample=tc.is_sample,
                        order=tc.order,
                    )
                    for tc in q.test_cases
                ],
            )
        )
    db.add(copy)
    await log_admin_action(db, admin.id, "duplicate_exam", "exam", exam_id, f"-> new exam '{copy.title}'")
    await db.commit()
    await db.refresh(copy)
    result = await db.scalars(select(Exam).where(Exam.id == copy.id).options(QUESTIONS_OPTIONS))
    return result.one()


def _attempt_out(attempt: ExamAttempt) -> AttemptOut:
    saved_answers = (
        [AnswerIn(question_id=a.question_id, answer=a.answer_json) for a in attempt.answers if a.is_correct is None]
        if attempt.status == AttemptStatus.in_progress
        else []
    )
    return AttemptOut(
        id=attempt.id,
        exam_id=attempt.exam_id,
        user_id=attempt.user_id,
        started_at=attempt.started_at,
        submitted_at=attempt.submitted_at,
        score=attempt.score,
        max_score=attempt.max_score,
        status=attempt.status,
        flagged_question_ids=attempt.flagged_question_ids or [],
        current_index=attempt.current_index,
        saved_answers=saved_answers,
    )


@router.post("/{exam_id}/attempts", response_model=AttemptOut, status_code=status.HTTP_201_CREATED)
async def start_attempt(exam_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    exam = await _get_exam_or_404(exam_id, db)
    if not exam.is_published and user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Exam is not published")

    now = datetime.now(timezone.utc)
    if user.role != UserRole.admin:
        if exam.available_from and now < exam.available_from:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This exam opens {exam.available_from.isoformat()}",
            )
        if exam.available_until and now > exam.available_until:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This exam is no longer available")

    existing = await db.scalar(
        select(ExamAttempt)
        .where(
            ExamAttempt.exam_id == exam_id,
            ExamAttempt.user_id == user.id,
            ExamAttempt.status == AttemptStatus.in_progress,
        )
        .options(selectinload(ExamAttempt.answers))
        .order_by(ExamAttempt.started_at.desc())
    )
    if existing is not None:
        return _attempt_out(existing)

    attempt = ExamAttempt(exam_id=exam_id, user_id=user.id, status=AttemptStatus.in_progress)
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)
    return AttemptOut(
        id=attempt.id,
        exam_id=attempt.exam_id,
        user_id=attempt.user_id,
        started_at=attempt.started_at,
        submitted_at=None,
        score=None,
        max_score=None,
        status=attempt.status,
        flagged_question_ids=[],
        current_index=0,
        saved_answers=[],
    )


@router.patch("/attempts/{attempt_id}/autosave", status_code=status.HTTP_204_NO_CONTENT)
async def autosave_attempt(
    attempt_id: int,
    payload: AutosaveIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    attempt = await _get_attempt_or_404(attempt_id, db)
    if attempt.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your attempt")
    if attempt.status != AttemptStatus.in_progress:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attempt is no longer in progress")

    by_question = {a.question_id: a for a in attempt.answers}
    for ans in payload.answers:
        existing_answer = by_question.get(ans.question_id)
        if existing_answer is not None:
            existing_answer.answer_json = ans.answer
        else:
            new_answer = AttemptAnswer(question_id=ans.question_id, answer_json=ans.answer)
            attempt.answers.append(new_answer)
            by_question[ans.question_id] = new_answer

    attempt.flagged_question_ids = payload.flagged_question_ids
    attempt.current_index = payload.current_index
    await db.commit()


@router.get("/attempts/mine", response_model=list[AttemptOut])
async def list_my_attempts(
    exam_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(ExamAttempt).where(ExamAttempt.user_id == user.id).options(selectinload(ExamAttempt.answers))
    if exam_id is not None:
        query = query.where(ExamAttempt.exam_id == exam_id)
    result = await db.scalars(query.order_by(ExamAttempt.started_at.desc()))
    return [_attempt_out(a) for a in result.all()]


async def _get_attempt_or_404(attempt_id: int, db: AsyncSession) -> ExamAttempt:
    attempt = await db.get(ExamAttempt, attempt_id, options=[selectinload(ExamAttempt.answers)])
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")
    return attempt


@router.get("/attempts/{attempt_id}", response_model=AttemptResultOut)
async def get_attempt(attempt_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    attempt = await _get_attempt_or_404(attempt_id, db)
    if attempt.user_id != user.id and user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your attempt")

    answers_out = []
    if attempt.status == AttemptStatus.submitted:
        for a in attempt.answers:
            answers_out.append(
                {
                    "question_id": a.question_id,
                    "is_correct": a.is_correct,
                    "points_awarded": a.points_awarded,
                    "correct_answer": a.graded_detail or {},
                    "submitted_answer": a.answer_json,
                }
            )

    return AttemptResultOut(**_attempt_out(attempt).model_dump(), answers=answers_out)


@router.post("/attempts/{attempt_id}/submit", response_model=AttemptResultOut)
async def submit_attempt(
    attempt_id: int,
    payload: SubmitAttemptIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    attempt = await _get_attempt_or_404(attempt_id, db)
    if attempt.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your attempt")
    if attempt.status == AttemptStatus.submitted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attempt already submitted")

    badges_before = {b.code for b in await get_user_badges(db, user.id) if b.earned}

    exam = await _get_exam_or_404(attempt.exam_id, db)
    score, max_score, results = await grade_attempt(exam.questions, [a.model_dump() for a in payload.answers])

    attempt.score = score
    attempt.max_score = max_score
    attempt.status = AttemptStatus.submitted
    attempt.submitted_at = datetime.now(timezone.utc)
    for r in results:
        r["submitted_answer"] = next(
            (a.answer for a in payload.answers if a.question_id == r["question_id"]), {}
        )

    attempt.answers = [
        AttemptAnswer(
            question_id=r["question_id"],
            answer_json=r["submitted_answer"],
            is_correct=r["is_correct"],
            points_awarded=r["points_awarded"],
            graded_detail=r["correct_answer"],
        )
        for r in results
    ]
    await db.commit()

    badges_after = await get_user_badges(db, user.id)
    newly_earned = [b for b in badges_after if b.earned and b.code not in badges_before]
    for badge in newly_earned:
        await notify(db, user.id, "badge_earned", f"You earned the \"{badge.name}\" badge!", link="/progress")
    if newly_earned:
        await db.commit()

    return AttemptResultOut(**_attempt_out(attempt).model_dump(), answers=results)


@router.post("/questions/{question_id}/run", response_model=RunCodeResultOut)
async def run_against_samples(
    question_id: int,
    payload: RunCodeIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Ungraded trial run: executes the student's code against this question's
    sample test cases only (never the hidden ones) so they can sanity-check
    before submitting the whole exam. Does not touch any attempt/score."""
    question = await db.get(
        Question, question_id, options=[selectinload(Question.test_cases), selectinload(Question.exam)]
    )
    if question is None or question.type != QuestionType.coding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coding question not found")
    if not question.exam.is_published and user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Exam is not published")
    if question.languages and payload.language not in question.languages:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Language not enabled for this question")

    samples = [tc for tc in question.test_cases if tc.is_sample]
    if not samples:
        return RunCodeResultOut(test_case_results=[], passed_count=0, total_count=0)

    outcomes = await asyncio.gather(*(jdoodle.run_code(payload.language, payload.code, tc.input) for tc in samples))

    results = []
    passed_count = 0
    for tc, outcome in zip(samples, outcomes):
        actual = outcome["stdout"].strip()
        passed = outcome["error"] is None and actual == tc.expected_output.strip()
        passed_count += passed
        results.append(
            {
                "input": tc.input,
                "expected_output": tc.expected_output,
                "actual_output": outcome["stdout"],
                "passed": passed,
                "error": outcome["error"],
            }
        )

    return RunCodeResultOut(test_case_results=results, passed_count=passed_count, total_count=len(samples))
