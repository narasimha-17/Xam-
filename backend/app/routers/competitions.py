import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.competition import CompetitionAnswer, CompetitionParticipant, CompetitionRoom, CompetitionStatus
from app.models.exam import Exam, Question, QuestionType
from app.models.user import User
from app.schemas.competition import (
    CompetitionAnswerIn,
    CompetitionAnswerResultOut,
    CompetitionCreateIn,
    CompetitionJoinIn,
    CompetitionOptionOut,
    CompetitionQuestionOut,
    CompetitionStateOut,
    ParticipantOut,
)

router = APIRouter(prefix="/competitions", tags=["competitions"])

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # excludes ambiguous chars (I, O, 0, 1)


async def _generate_unique_code(db: AsyncSession) -> str:
    for _ in range(20):
        code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(6))
        existing = await db.scalar(select(CompetitionRoom).where(CompetitionRoom.code == code))
        if existing is None:
            return code
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not generate a room code")


async def _get_room_or_404(room_id: int, db: AsyncSession) -> CompetitionRoom:
    room = await db.get(CompetitionRoom, room_id)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Competition room not found")
    return room


async def _build_state_out(room: CompetitionRoom, user: User, db: AsyncSession) -> CompetitionStateOut:
    exam = await db.get(Exam, room.exam_id)

    participants_result = await db.execute(
        select(CompetitionParticipant, User.full_name)
        .join(User, User.id == CompetitionParticipant.user_id)
        .where(CompetitionParticipant.room_id == room.id)
        .order_by(CompetitionParticipant.score.desc())
    )
    participants = [
        ParticipantOut(id=p.id, user_id=p.user_id, full_name=name, score=p.score)
        for p, name in participants_result.all()
    ]

    my_participant = await db.scalar(
        select(CompetitionParticipant).where(
            CompetitionParticipant.room_id == room.id, CompetitionParticipant.user_id == user.id
        )
    )
    my_participant_id = my_participant.id if my_participant else None

    current_question = None
    has_answered_current = False
    answered_count = 0
    if room.status == CompetitionStatus.active and 0 <= room.current_question_index < len(room.question_ids):
        current_question_id = room.question_ids[room.current_question_index]
        question = await db.get(Question, current_question_id, options=[selectinload(Question.options)])
        if question is not None:
            current_question = CompetitionQuestionOut(
                id=question.id,
                question_text=question.question_text,
                points=question.points,
                options=[
                    CompetitionOptionOut(id=o.id, option_text=o.option_text, order=o.order)
                    for o in sorted(question.options, key=lambda o: o.order)
                ],
            )
        answered_count = await db.scalar(
            select(func.count())
            .select_from(CompetitionAnswer)
            .join(CompetitionParticipant, CompetitionParticipant.id == CompetitionAnswer.participant_id)
            .where(
                CompetitionParticipant.room_id == room.id,
                CompetitionAnswer.question_id == current_question_id,
            )
        )
        if my_participant_id is not None:
            existing_answer = await db.scalar(
                select(CompetitionAnswer).where(
                    CompetitionAnswer.participant_id == my_participant_id,
                    CompetitionAnswer.question_id == current_question_id,
                )
            )
            has_answered_current = existing_answer is not None

    return CompetitionStateOut(
        id=room.id,
        code=room.code,
        exam_title=exam.title if exam else "",
        status=room.status,
        current_question_index=room.current_question_index,
        total_questions=len(room.question_ids),
        time_limit_seconds=room.time_limit_seconds,
        question_started_at=room.question_started_at,
        current_question=current_question,
        participants=participants,
        is_host=room.host_id == user.id,
        my_participant_id=my_participant_id,
        has_answered_current=has_answered_current,
        answered_count=answered_count or 0,
    )


@router.post("", response_model=CompetitionStateOut, status_code=status.HTTP_201_CREATED)
async def create_room(
    payload: CompetitionCreateIn, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)
):
    exam = await db.get(Exam, payload.exam_id, options=[selectinload(Exam.questions)])
    if exam is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

    mcq_questions = sorted(
        (q for q in exam.questions if q.type == QuestionType.mcq), key=lambda q: q.order
    )
    if not mcq_questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="This exam has no MCQ questions to compete with"
        )

    code = await _generate_unique_code(db)
    room = CompetitionRoom(
        code=code,
        exam_id=exam.id,
        host_id=admin.id,
        question_ids=[q.id for q in mcq_questions],
        time_limit_seconds=max(5, min(120, payload.time_limit_seconds)),
    )
    db.add(room)
    await db.commit()
    await db.refresh(room)
    return await _build_state_out(room, admin, db)


@router.post("/join", response_model=CompetitionStateOut)
async def join_room(payload: CompetitionJoinIn, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    code = payload.code.strip().upper()
    room = await db.scalar(select(CompetitionRoom).where(CompetitionRoom.code == code))
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No competition found with that code")
    if room.status != CompetitionStatus.waiting:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This competition has already started")

    existing = await db.scalar(
        select(CompetitionParticipant).where(
            CompetitionParticipant.room_id == room.id, CompetitionParticipant.user_id == user.id
        )
    )
    if existing is None:
        db.add(CompetitionParticipant(room_id=room.id, user_id=user.id))
        await db.commit()

    return await _build_state_out(room, user, db)


@router.get("/{room_id}", response_model=CompetitionStateOut)
async def get_room_state(room_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    room = await _get_room_or_404(room_id, db)
    return await _build_state_out(room, user, db)


@router.post("/{room_id}/start", response_model=CompetitionStateOut)
async def start_room(room_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    room = await _get_room_or_404(room_id, db)
    if room.host_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the host can start this competition")
    if room.status != CompetitionStatus.waiting:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This competition already started")

    room.status = CompetitionStatus.active
    room.current_question_index = 0
    room.question_started_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(room)
    return await _build_state_out(room, user, db)


@router.post("/{room_id}/next", response_model=CompetitionStateOut)
async def next_question(room_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    room = await _get_room_or_404(room_id, db)
    if room.host_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the host can control this competition")
    if room.status != CompetitionStatus.active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This competition isn't active")

    room.current_question_index += 1
    if room.current_question_index >= len(room.question_ids):
        room.status = CompetitionStatus.finished
        room.question_started_at = None
    else:
        room.question_started_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(room)
    return await _build_state_out(room, user, db)


@router.post("/{room_id}/answer", response_model=CompetitionAnswerResultOut)
async def submit_answer(
    room_id: int,
    payload: CompetitionAnswerIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    room = await _get_room_or_404(room_id, db)
    if room.status != CompetitionStatus.active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This competition isn't active")

    participant = await db.scalar(
        select(CompetitionParticipant).where(
            CompetitionParticipant.room_id == room.id, CompetitionParticipant.user_id == user.id
        )
    )
    if participant is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You haven't joined this competition")

    if (
        room.current_question_index >= len(room.question_ids)
        or room.question_ids[room.current_question_index] != payload.question_id
    ):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That question is no longer active")

    existing = await db.scalar(
        select(CompetitionAnswer).where(
            CompetitionAnswer.participant_id == participant.id, CompetitionAnswer.question_id == payload.question_id
        )
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You already answered this question")

    question = await db.get(Question, payload.question_id, options=[selectinload(Question.options)])
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    selected = next((o for o in question.options if o.id == payload.selected_option_id), None)
    if selected is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid option")
    correct_option = next((o for o in question.options if o.is_correct), None)

    is_correct = selected.is_correct
    points_awarded = 0.0
    if is_correct:
        elapsed = 0.0
        if room.question_started_at is not None:
            started = room.question_started_at
            if started.tzinfo is None:
                started = started.replace(tzinfo=timezone.utc)
            elapsed = max(0.0, (datetime.now(timezone.utc) - started).total_seconds())
        speed_ratio = max(0.0, min(1.0, (room.time_limit_seconds - elapsed) / room.time_limit_seconds))
        points_awarded = round(question.points * (0.5 + 0.5 * speed_ratio), 2)

    db.add(
        CompetitionAnswer(
            participant_id=participant.id,
            question_id=payload.question_id,
            selected_option_id=payload.selected_option_id,
            is_correct=is_correct,
            points_awarded=points_awarded,
        )
    )
    participant.score += points_awarded
    await db.commit()

    return CompetitionAnswerResultOut(
        is_correct=is_correct,
        points_awarded=points_awarded,
        correct_option_id=correct_option.id if correct_option else payload.selected_option_id,
    )
