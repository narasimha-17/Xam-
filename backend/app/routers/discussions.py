from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.discussion import DiscussionPost, DiscussionThread
from app.models.subject import Subject
from app.models.user import User, UserRole
from app.schemas.discussion import PostCreate, PostOut, ThreadCreate, ThreadDetailOut, ThreadLockUpdate, ThreadOut
from app.services.activity_log import log_admin_action

router = APIRouter(prefix="/discussions", tags=["discussions"])


def _thread_out(thread: DiscussionThread) -> ThreadOut:
    return ThreadOut(
        id=thread.id,
        subject_id=thread.subject_id,
        topic_id=thread.topic_id,
        title=thread.title,
        created_by=thread.created_by,
        author_name=thread.creator.full_name,
        created_at=thread.created_at,
        post_count=len(thread.posts),
        is_locked=thread.is_locked,
    )


def _post_out(post: DiscussionPost) -> PostOut:
    return PostOut(
        id=post.id,
        thread_id=post.thread_id,
        user_id=post.user_id,
        author_name=post.author.full_name,
        body=post.body,
        parent_post_id=post.parent_post_id,
        created_at=post.created_at,
    )


THREAD_OPTIONS = (selectinload(DiscussionThread.creator), selectinload(DiscussionThread.posts))
THREAD_DETAIL_OPTIONS = (
    selectinload(DiscussionThread.creator),
    selectinload(DiscussionThread.posts).selectinload(DiscussionPost.author),
)


@router.get("", response_model=list[ThreadOut])
async def list_threads(
    subject_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
):
    result = await db.scalars(
        select(DiscussionThread)
        .where(DiscussionThread.subject_id == subject_id)
        .options(*THREAD_OPTIONS)
        .order_by(DiscussionThread.created_at.desc())
    )
    return [_thread_out(t) for t in result.all()]


@router.post("", response_model=ThreadDetailOut, status_code=status.HTTP_201_CREATED)
async def create_thread(payload: ThreadCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    subject = await db.get(Subject, payload.subject_id)
    if subject is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    thread = DiscussionThread(
        subject_id=payload.subject_id,
        topic_id=payload.topic_id,
        title=payload.title,
        created_by=user.id,
        posts=[DiscussionPost(user_id=user.id, body=payload.body)],
    )
    db.add(thread)
    await db.commit()

    result = await db.scalars(
        select(DiscussionThread).where(DiscussionThread.id == thread.id).options(*THREAD_DETAIL_OPTIONS)
    )
    thread = result.one()
    return ThreadDetailOut(**_thread_out(thread).model_dump(), posts=[_post_out(p) for p in thread.posts])


async def _get_thread_or_404(thread_id: int, db: AsyncSession) -> DiscussionThread:
    result = await db.scalars(
        select(DiscussionThread).where(DiscussionThread.id == thread_id).options(*THREAD_DETAIL_OPTIONS)
    )
    thread = result.first()
    if thread is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    return thread


@router.get("/{thread_id}", response_model=ThreadDetailOut)
async def get_thread(thread_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    thread = await _get_thread_or_404(thread_id, db)
    return ThreadDetailOut(**_thread_out(thread).model_dump(), posts=[_post_out(p) for p in thread.posts])


@router.post("/{thread_id}/posts", response_model=PostOut, status_code=status.HTTP_201_CREATED)
async def create_post(
    thread_id: int, payload: PostCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    thread = await _get_thread_or_404(thread_id, db)
    if thread.is_locked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This thread is locked")
    post = DiscussionPost(
        thread_id=thread_id, user_id=user.id, body=payload.body, parent_post_id=payload.parent_post_id
    )
    db.add(post)
    await db.commit()
    result = await db.scalars(
        select(DiscussionPost).where(DiscussionPost.id == post.id).options(selectinload(DiscussionPost.author))
    )
    return _post_out(result.one())


@router.patch("/{thread_id}/lock", response_model=ThreadOut)
async def set_thread_locked(
    thread_id: int,
    payload: ThreadLockUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    thread = await _get_thread_or_404(thread_id, db)
    thread.is_locked = payload.is_locked
    await log_admin_action(
        db, admin.id, "lock_thread" if payload.is_locked else "unlock_thread", "discussion_thread", thread_id
    )
    await db.commit()
    return _thread_out(thread)


@router.delete("/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_thread(thread_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    thread = await _get_thread_or_404(thread_id, db)
    if thread.created_by != user.id and user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your thread")
    if user.role == UserRole.admin and thread.created_by != user.id:
        await log_admin_action(db, user.id, "delete_thread", "discussion_thread", thread_id, thread.title)
    await db.delete(thread)
    await db.commit()


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(post_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    post = await db.get(DiscussionPost, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.user_id != user.id and user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your post")
    if user.role == UserRole.admin and post.user_id != user.id:
        await log_admin_action(db, user.id, "delete_post", "discussion_post", post_id)
    await db.delete(post)
    await db.commit()
