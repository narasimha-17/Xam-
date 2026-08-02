from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PdfOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    subject_id: int
    topic_id: int | None
    title: str
    uploaded_by: int
    uploaded_at: datetime
