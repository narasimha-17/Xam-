from datetime import datetime

from pydantic import BaseModel


class ThreadCreate(BaseModel):
    subject_id: int
    topic_id: int | None = None
    title: str
    body: str


class PostCreate(BaseModel):
    body: str
    parent_post_id: int | None = None


class PostOut(BaseModel):
    id: int
    thread_id: int
    user_id: int
    author_name: str
    body: str
    parent_post_id: int | None
    created_at: datetime


class ThreadOut(BaseModel):
    id: int
    subject_id: int
    topic_id: int | None
    title: str
    created_by: int
    author_name: str
    created_at: datetime
    post_count: int
    is_locked: bool


class ThreadDetailOut(ThreadOut):
    posts: list[PostOut] = []


class ThreadLockUpdate(BaseModel):
    is_locked: bool
