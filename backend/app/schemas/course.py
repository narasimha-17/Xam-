from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CourseIn(BaseModel):
    title: str
    description: str | None = None
    is_active: bool = True


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str | None
    created_at: datetime
    video_count: int


class CourseAdminOut(CourseOut):
    is_active: bool


class CourseVideoIn(BaseModel):
    title: str
    youtube_url: str
    order: int = 0


class CourseVideoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    youtube_url: str
    order: int


class CourseDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str | None
    is_active: bool
    created_at: datetime
    videos: list[CourseVideoOut]
