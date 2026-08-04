from datetime import datetime

from pydantic import BaseModel


class PostOut(BaseModel):
    id: int
    thread_id: int
    user_id: int
    author_name: str
    body: str
    parent_post_id: int | None
    image_url: str | None
    created_at: datetime


class ThreadOut(BaseModel):
    id: int
    subject_id: int
    topic_id: int | None
    title: str
    created_by: int
    author_name: str
    created_at: datetime
    last_activity_at: datetime
    post_count: int
    preview: str
    is_locked: bool


class ThreadDetailOut(ThreadOut):
    posts: list[PostOut] = []


class ThreadLockUpdate(BaseModel):
    is_locked: bool
