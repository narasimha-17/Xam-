from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.proctoring import ProctorEventType


class ProctorEventIn(BaseModel):
    event_type: ProctorEventType
    snapshot_base64: str | None = None  # only used for event_type == webcam_snapshot


class ProctorEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_type: ProctorEventType
    occurred_at: datetime


class ProctorEventAdminOut(ProctorEventOut):
    has_snapshot: bool


class ProctorSummaryOut(BaseModel):
    attempt_id: int
    tab_switch_count: int = 0
    fullscreen_exit_count: int = 0
    copy_attempt_count: int = 0
    paste_attempt_count: int = 0
    webcam_snapshot_count: int = 0
    screenshot_attempt_count: int = 0
    no_face_detected_count: int = 0
    multiple_faces_count: int = 0
    total_events: int = 0
