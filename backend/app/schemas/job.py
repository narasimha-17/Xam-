from datetime import datetime

from pydantic import BaseModel, ConfigDict


class JobPostingIn(BaseModel):
    title: str
    company_name: str
    job_type: str = "full_time"
    location: str | None = None
    is_remote: bool = False
    description: str
    min_qualification: str | None = None
    package: str | None = None
    application_link: str | None = None
    application_deadline: datetime | None = None
    is_active: bool = True


class JobPostingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    company_name: str
    job_type: str
    location: str | None
    is_remote: bool
    description: str
    min_qualification: str | None
    package: str | None
    application_link: str | None
    application_deadline: datetime | None
    created_at: datetime


class JobPostingAdminOut(JobPostingOut):
    is_active: bool
