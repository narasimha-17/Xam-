from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.exam import Exam
from app.models.pdf import Pdf
from app.models.subject import Subject, Topic
from app.models.user import User, UserRole
from app.schemas.subject import SubjectCreate, SubjectOut, SubjectUpdate, TopicCreate, TopicOut

router = APIRouter(prefix="/subjects", tags=["subjects"])


async def _with_counts(subjects: list[Subject], db: AsyncSession) -> list[SubjectOut]:
    exam_counts = dict((await db.execute(select(Exam.subject_id, func.count(Exam.id)).group_by(Exam.subject_id))).all())
    pdf_counts = dict((await db.execute(select(Pdf.subject_id, func.count(Pdf.id)).group_by(Pdf.subject_id))).all())
    return [
        SubjectOut(
            id=s.id,
            name=s.name,
            description=s.description,
            education_level=s.education_level,
            created_by=s.created_by,
            topics=[TopicOut.model_validate(t) for t in s.topics],
            exam_count=exam_counts.get(s.id, 0),
            pdf_count=pdf_counts.get(s.id, 0),
        )
        for s in subjects
    ]


@router.get("", response_model=list[SubjectOut])
async def list_subjects(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    query = select(Subject).options(selectinload(Subject.topics)).order_by(Subject.name)
    if user.role != UserRole.admin:
        # A subject with no education_level set is visible to everyone; otherwise it must match
        # the student's own level.
        query = query.where(
            (Subject.education_level.is_(None)) | (Subject.education_level == user.education_level)
        )
    result = await db.scalars(query)
    return await _with_counts(list(result.all()), db)


@router.post("", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
async def create_subject(
    payload: SubjectCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)
):
    subject = Subject(
        name=payload.name,
        description=payload.description,
        education_level=payload.education_level,
        created_by=admin.id,
    )
    db.add(subject)
    await db.commit()
    await db.refresh(subject, attribute_names=["topics"])
    return (await _with_counts([subject], db))[0]


async def _get_subject_or_404(subject_id: int, db: AsyncSession) -> Subject:
    subject = await db.scalar(
        select(Subject).where(Subject.id == subject_id).options(selectinload(Subject.topics))
    )
    if subject is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    return subject


@router.get("/{subject_id}", response_model=SubjectOut)
async def get_subject(subject_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    subject = await _get_subject_or_404(subject_id, db)
    return (await _with_counts([subject], db))[0]


@router.patch("/{subject_id}", response_model=SubjectOut)
async def update_subject(
    subject_id: int,
    payload: SubjectUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    subject = await _get_subject_or_404(subject_id, db)
    if payload.name is not None:
        subject.name = payload.name
    if payload.description is not None:
        subject.description = payload.description
    if payload.clear_education_level:
        subject.education_level = None
    elif payload.education_level is not None:
        subject.education_level = payload.education_level
    await db.commit()
    await db.refresh(subject, attribute_names=["topics"])
    return (await _with_counts([subject], db))[0]


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(subject_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    subject = await _get_subject_or_404(subject_id, db)
    await db.delete(subject)
    await db.commit()


@router.post("/{subject_id}/topics", response_model=TopicOut, status_code=status.HTTP_201_CREATED)
async def create_topic(
    subject_id: int, payload: TopicCreate, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
):
    await _get_subject_or_404(subject_id, db)
    topic = Topic(subject_id=subject_id, name=payload.name)
    db.add(topic)
    await db.commit()
    await db.refresh(topic)
    return topic


@router.delete("/topics/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topic(topic_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    topic = await db.get(Topic, topic_id)
    if topic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")
    await db.delete(topic)
    await db.commit()
