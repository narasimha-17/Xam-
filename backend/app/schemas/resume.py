from datetime import datetime

from pydantic import BaseModel, ConfigDict


class EducationEntry(BaseModel):
    institution: str
    degree: str = ""
    field: str = ""
    start: str = ""
    end: str = ""
    gpa: str = ""


class ExperienceEntry(BaseModel):
    company: str
    role: str = ""
    start: str = ""
    end: str = ""
    description: str = ""


class ProjectEntry(BaseModel):
    title: str
    description: str = ""
    tech_stack: str = ""
    link: str = ""


class ResumeIn(BaseModel):
    full_name: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    summary: str = ""
    education: list[EducationEntry] = []
    experience: list[ExperienceEntry] = []
    projects: list[ProjectEntry] = []
    skills: list[str] = []
    certifications: list[str] = []


class ResumeOut(ResumeIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    updated_at: datetime


class ResumeScoreIn(BaseModel):
    job_id: int | None = None


class ResumeScoreOut(BaseModel):
    score: int | None = None
    matched_keywords: list[str] = []
    missing_keywords: list[str] = []
    feedback: list[str] = []
    error: str | None = None
