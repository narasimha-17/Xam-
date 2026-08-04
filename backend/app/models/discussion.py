from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class DiscussionThread(Base):
    __tablename__ = "discussion_threads"

    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    topic_id: Mapped[int | None] = mapped_column(ForeignKey("topics.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    is_locked: Mapped[bool] = mapped_column(nullable=False, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    posts: Mapped[list["DiscussionPost"]] = relationship(
        back_populates="thread", cascade="all, delete-orphan", order_by="DiscussionPost.created_at"
    )
    creator: Mapped["User"] = relationship(foreign_keys=[created_by])


class DiscussionPost(Base):
    __tablename__ = "discussion_posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    thread_id: Mapped[int] = mapped_column(ForeignKey("discussion_threads.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    parent_post_id: Mapped[int | None] = mapped_column(ForeignKey("discussion_posts.id", ondelete="CASCADE"), nullable=True)
    image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    thread: Mapped["DiscussionThread"] = relationship(back_populates="posts")
    author: Mapped["User"] = relationship(foreign_keys=[user_id])
