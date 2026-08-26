from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.job import JobPosting
from app.models.resume import Resume
from app.models.user import User
from app.schemas.resume import ResumeIn, ResumeOut, ResumeScoreIn, ResumeScoreOut
from app.services import ollama

router = APIRouter(prefix="/resume", tags=["resume"])


def _require_ai_enabled() -> None:
    if not settings.ai_features_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Resume scoring isn't available in this environment.",
        )


async def _get_own_resume(db: AsyncSession, user: User) -> Resume | None:
    return await db.scalar(select(Resume).where(Resume.user_id == user.id))


def _resume_text(resume: Resume) -> str:
    lines = [resume.full_name, resume.summary, ""]
    if resume.skills:
        lines.append("Skills: " + ", ".join(resume.skills))
    for edu in resume.education:
        lines.append(f"Education: {edu.get('degree', '')} {edu.get('field', '')} — {edu.get('institution', '')}")
    for exp in resume.experience:
        lines.append(f"Experience: {exp.get('role', '')} at {exp.get('company', '')} — {exp.get('description', '')}")
    for proj in resume.projects:
        lines.append(f"Project: {proj.get('title', '')} ({proj.get('tech_stack', '')}) — {proj.get('description', '')}")
    if resume.certifications:
        lines.append("Certifications: " + ", ".join(resume.certifications))
    return "\n".join(line for line in lines if line)


@router.get("/me", response_model=ResumeOut)
async def get_my_resume(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    resume = await _get_own_resume(db, user)
    if resume is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No resume yet")
    return resume


@router.put("/me", response_model=ResumeOut)
async def save_my_resume(
    payload: ResumeIn, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    resume = await _get_own_resume(db, user)
    data = payload.model_dump(mode="json")
    if resume is None:
        resume = Resume(user_id=user.id, **data)
        db.add(resume)
    else:
        for field, value in data.items():
            setattr(resume, field, value)
    await db.commit()
    await db.refresh(resume)
    return resume


@router.post("/score", response_model=ResumeScoreOut)
async def score_my_resume(
    payload: ResumeScoreIn, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    _require_ai_enabled()
    resume = await _get_own_resume(db, user)
    if resume is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Save your resume before scoring it")

    job_description = None
    if payload.job_id is not None:
        job = await db.get(JobPosting, payload.job_id)
        if job is not None:
            job_description = job.description

    outcome = await ollama.score_resume(_resume_text(resume), job_description)
    if outcome["error"]:
        return ResumeScoreOut(error=outcome["error"])

    data = outcome["data"] or {}
    return ResumeScoreOut(
        score=data.get("score"),
        matched_keywords=data.get("matched_keywords") or [],
        missing_keywords=data.get("missing_keywords") or [],
        feedback=data.get("feedback") or [],
    )
