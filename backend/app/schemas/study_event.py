from datetime import date, time

from pydantic import BaseModel


class StudyEventIn(BaseModel):
    title: str
    subject_id: int | None = None
    event_date: date
    start_time: time | None = None
    notes: str | None = None


class StudyEventOut(BaseModel):
    id: int
    title: str
    subject_id: int | None
    subject_name: str | None
    event_date: date
    start_time: time | None
    notes: str | None
