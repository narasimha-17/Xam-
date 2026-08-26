from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.course import Course, CourseVideo
from app.models.user import User
from app.schemas.course import (
    CourseAdminOut,
    CourseDetailOut,
    CourseIn,
    CourseOut,
    CourseVideoIn,
    CourseVideoOut,
)

router = APIRouter(prefix="/courses", tags=["courses"])


async def _video_counts(db: AsyncSession) -> dict[int, int]:
    result = await db.execute(select(CourseVideo.course_id, func.count(CourseVideo.id)).group_by(CourseVideo.course_id))
    return dict(result.all())


def _course_out(course: Course, video_count: int, admin: bool) -> CourseOut | CourseAdminOut:
    cls = CourseAdminOut if admin else CourseOut
    return cls(
        id=course.id,
        title=course.title,
        description=course.description,
        created_at=course.created_at,
        video_count=video_count,
        **({"is_active": course.is_active} if admin else {}),
    )


@router.get("", response_model=list[CourseOut])
async def list_courses(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    courses = (await db.scalars(select(Course).where(Course.is_active.is_(True)).order_by(Course.created_at.desc()))).all()
    counts = await _video_counts(db)
    return [_course_out(c, counts.get(c.id, 0), admin=False) for c in courses]


@router.get("/admin/all", response_model=list[CourseAdminOut])
async def admin_list_courses(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    courses = (await db.scalars(select(Course).order_by(Course.created_at.desc()))).all()
    counts = await _video_counts(db)
    return [_course_out(c, counts.get(c.id, 0), admin=True) for c in courses]


@router.get("/{course_id}", response_model=CourseDetailOut)
async def get_course(course_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    course = await db.get(Course, course_id)
    if course is None or (not course.is_active and user.role != "admin"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    videos = (
        await db.scalars(select(CourseVideo).where(CourseVideo.course_id == course_id).order_by(CourseVideo.order))
    ).all()
    return CourseDetailOut(
        id=course.id,
        title=course.title,
        description=course.description,
        is_active=course.is_active,
        created_at=course.created_at,
        videos=list(videos),
    )


@router.post("/admin", response_model=CourseAdminOut, status_code=status.HTTP_201_CREATED)
async def create_course(payload: CourseIn, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    course = Course(**payload.model_dump())
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return _course_out(course, 0, admin=True)


@router.patch("/admin/{course_id}", response_model=CourseAdminOut)
async def update_course(
    course_id: int, payload: CourseIn, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
):
    course = await db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    for field, value in payload.model_dump().items():
        setattr(course, field, value)
    await db.commit()
    await db.refresh(course)
    counts = await _video_counts(db)
    return _course_out(course, counts.get(course.id, 0), admin=True)


@router.delete("/admin/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(course_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    course = await db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    await db.delete(course)
    await db.commit()


@router.post("/admin/{course_id}/videos", response_model=CourseVideoOut, status_code=status.HTTP_201_CREATED)
async def create_course_video(
    course_id: int, payload: CourseVideoIn, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
):
    course = await db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    video = CourseVideo(course_id=course_id, **payload.model_dump())
    db.add(video)
    await db.commit()
    await db.refresh(video)
    return video


@router.patch("/admin/videos/{video_id}", response_model=CourseVideoOut)
async def update_course_video(
    video_id: int, payload: CourseVideoIn, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
):
    video = await db.get(CourseVideo, video_id)
    if video is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    for field, value in payload.model_dump().items():
        setattr(video, field, value)
    await db.commit()
    await db.refresh(video)
    return video


@router.delete("/admin/videos/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course_video(video_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    video = await db.get(CourseVideo, video_id)
    if video is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    await db.delete(video)
    await db.commit()
