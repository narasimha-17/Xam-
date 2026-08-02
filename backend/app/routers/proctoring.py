import base64
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.exam import ExamAttempt
from app.models.proctoring import ProctorEvent, ProctorEventType
from app.models.user import User
from app.schemas.proctoring import ProctorEventAdminOut, ProctorEventIn, ProctorEventOut, ProctorSummaryOut

router = APIRouter(prefix="/proctoring", tags=["proctoring"])

SNAPSHOT_DIR = "uploads/proctoring"
MAX_SNAPSHOT_BYTES = 5 * 1024 * 1024  # 5 MB


async def _get_attempt_for_owner_or_admin(attempt_id: int, db: AsyncSession, user: User) -> ExamAttempt:
    attempt = await db.get(ExamAttempt, attempt_id)
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")
    if attempt.user_id != user.id and user.role.value != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your attempt")
    return attempt


@router.post("/attempts/{attempt_id}/events", response_model=ProctorEventOut, status_code=status.HTTP_201_CREATED)
async def log_proctor_event(
    attempt_id: int,
    payload: ProctorEventIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    attempt = await db.get(ExamAttempt, attempt_id)
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")
    if attempt.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your attempt")

    snapshot_path = None
    if payload.snapshot_base64:
        raw = payload.snapshot_base64
        if "," in raw and raw.strip().startswith("data:"):
            raw = raw.split(",", 1)[1]
        try:
            decoded = base64.b64decode(raw)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid snapshot encoding")
        if len(decoded) > MAX_SNAPSHOT_BYTES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Snapshot exceeds 5MB limit")

        attempt_dir = os.path.join(SNAPSHOT_DIR, str(attempt_id))
        os.makedirs(attempt_dir, exist_ok=True)
        stored_name = f"{uuid.uuid4().hex}.jpg"
        snapshot_path = os.path.join(attempt_dir, stored_name)
        with open(snapshot_path, "wb") as f:
            f.write(decoded)

    event = ProctorEvent(attempt_id=attempt_id, event_type=payload.event_type, snapshot_path=snapshot_path)
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


def _empty_summary(attempt_id: int) -> ProctorSummaryOut:
    return ProctorSummaryOut(attempt_id=attempt_id)


@router.get("/attempts/{attempt_id}/summary", response_model=ProctorSummaryOut)
async def get_proctor_summary(
    attempt_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    await _get_attempt_for_owner_or_admin(attempt_id, db, user)
    result = await db.scalars(select(ProctorEvent).where(ProctorEvent.attempt_id == attempt_id))
    events = result.all()

    summary = _empty_summary(attempt_id)
    summary.total_events = len(events)
    for e in events:
        if e.event_type == ProctorEventType.tab_switch:
            summary.tab_switch_count += 1
        elif e.event_type == ProctorEventType.fullscreen_exit:
            summary.fullscreen_exit_count += 1
        elif e.event_type == ProctorEventType.copy_attempt:
            summary.copy_attempt_count += 1
        elif e.event_type == ProctorEventType.paste_attempt:
            summary.paste_attempt_count += 1
        elif e.event_type == ProctorEventType.webcam_snapshot:
            summary.webcam_snapshot_count += 1
        elif e.event_type == ProctorEventType.screenshot_attempt:
            summary.screenshot_attempt_count += 1
        elif e.event_type == ProctorEventType.no_face_detected:
            summary.no_face_detected_count += 1
    return summary


@router.get("/attempts/{attempt_id}/events", response_model=list[ProctorEventAdminOut])
async def list_proctor_events(attempt_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.scalars(
        select(ProctorEvent).where(ProctorEvent.attempt_id == attempt_id).order_by(ProctorEvent.occurred_at.asc())
    )
    events = result.all()
    return [
        ProctorEventAdminOut(
            id=e.id, event_type=e.event_type, occurred_at=e.occurred_at, has_snapshot=e.snapshot_path is not None
        )
        for e in events
    ]


@router.get("/events/{event_id}/snapshot")
async def get_proctor_snapshot(event_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    event = await db.get(ProctorEvent, event_id)
    if event is None or not event.snapshot_path or not os.path.exists(event.snapshot_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snapshot not found")
    return FileResponse(event.snapshot_path, media_type="image/jpeg")
