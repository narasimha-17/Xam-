from datetime import datetime

from pydantic import BaseModel


class FeedbackOut(BaseModel):
    id: int
    description: str
    rating: int
    image_url: str | None
    created_at: datetime


class FeedbackAdminOut(FeedbackOut):
    user_id: int
    user_name: str
    user_email: str
