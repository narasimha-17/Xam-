from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.job import JobPosting
from app.models.user import User
from app.schemas.job import JobPostingAdminOut, JobPostingIn, JobPostingOut

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=list[JobPostingOut])
async def list_jobs(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.scalars(
        select(JobPosting).where(JobPosting.is_active.is_(True)).order_by(JobPosting.created_at.desc())
    )
    return result.all()


@router.get("/{job_id}", response_model=JobPostingOut)
async def get_job(job_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    job = await db.get(JobPosting, job_id)
    if job is None or not job.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job posting not found")
    return job


@router.get("/admin/all", response_model=list[JobPostingAdminOut])
async def admin_list_jobs(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.scalars(select(JobPosting).order_by(JobPosting.created_at.desc()))
    return result.all()


@router.post("/admin", response_model=JobPostingAdminOut, status_code=status.HTTP_201_CREATED)
async def create_job(payload: JobPostingIn, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    job = JobPosting(**payload.model_dump(), posted_by=admin.id)
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


@router.patch("/admin/{job_id}", response_model=JobPostingAdminOut)
async def update_job(
    job_id: int, payload: JobPostingIn, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
):
    job = await db.get(JobPosting, job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job posting not found")
    for field, value in payload.model_dump().items():
        setattr(job, field, value)
    await db.commit()
    await db.refresh(job)
    return job


@router.delete("/admin/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(job_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    job = await db.get(JobPosting, job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job posting not found")
    await db.delete(job)
    await db.commit()
