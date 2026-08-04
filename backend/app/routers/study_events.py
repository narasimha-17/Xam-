from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.study_event import StudyEvent
from app.models.subject import Subject
from app.models.user import User
from app.schemas.study_event import StudyEventIn, StudyEventOut
from app.services.notifications import notify

router = APIRouter(prefix="/study-events", tags=["study-events"])


async def _event_out(db: AsyncSession, event: StudyEvent) -> StudyEventOut:
    subject_name = None
    if event.subject_id is not None:
        subject = await db.get(Subject, event.subject_id)
        subject_name = subject.name if subject else None
    return StudyEventOut(
        id=event.id,
        title=event.title,
        subject_id=event.subject_id,
        subject_name=subject_name,
        event_date=event.event_date,
        start_time=event.start_time,
        notes=event.notes,
    )


async def _notify_due_today(db: AsyncSession, user_id: int) -> None:
    """Fires an in-app notification for any of today's study events not yet notified —
    called opportunistically whenever the planner is loaded, since there's no background scheduler."""
    today = date.today()
    result = await db.scalars(
        select(StudyEvent).where(
            StudyEvent.user_id == user_id, StudyEvent.event_date == today, StudyEvent.notified.is_(False)
        )
    )
    due_events = list(result.all())
    if not due_events:
        return
    for event in due_events:
        time_str = f" at {event.start_time.strftime('%H:%M')}" if event.start_time else ""
        await notify(db, user_id, "study_reminder", f'Study session today{time_str}: "{event.title}"', link="/planner")
        event.notified = True
    await db.commit()


@router.get("", response_model=list[StudyEventOut])
async def list_study_events(
    from_date: date | None = None,
    to_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await _notify_due_today(db, user.id)

    # Defaults to a small look-back window (not just today) so a slight client/server clock or
    # timezone skew near midnight can't make a just-created "today" event vanish from the view.
    start = from_date or (date.today() - timedelta(days=3))
    end = to_date or (date.today() + timedelta(days=30))
    result = await db.scalars(
        select(StudyEvent)
        .where(StudyEvent.user_id == user.id, StudyEvent.event_date >= start, StudyEvent.event_date <= end)
        .order_by(StudyEvent.event_date.asc(), StudyEvent.start_time.asc())
    )
    return [await _event_out(db, e) for e in result.all()]


@router.post("", response_model=StudyEventOut, status_code=status.HTTP_201_CREATED)
async def create_study_event(
    payload: StudyEventIn, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    event = StudyEvent(user_id=user.id, **payload.model_dump())
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return await _event_out(db, event)


async def _get_event_or_404(event_id: int, db: AsyncSession, user: User) -> StudyEvent:
    event = await db.get(StudyEvent, event_id)
    if event is None or event.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study event not found")
    return event


@router.patch("/{event_id}", response_model=StudyEventOut)
async def update_study_event(
    event_id: int, payload: StudyEventIn, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    event = await _get_event_or_404(event_id, db, user)
    for field, value in payload.model_dump().items():
        setattr(event, field, value)
    event.notified = False
    await db.commit()
    await db.refresh(event)
    return await _event_out(db, event)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_study_event(
    event_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    event = await _get_event_or_404(event_id, db, user)
    await db.delete(event)
    await db.commit()
