from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CompanyIn(BaseModel):
    name: str
    description: str | None = None


class CompanyOut(BaseModel):
    id: int
    name: str
    description: str | None
    is_active: bool
    created_at: datetime
    coding_count: int
    aptitude_count: int
    technical_count: int
    is_subscribed: bool


class CompanyAptitudeIn(BaseModel):
    question_text: str
    options: list[str] = Field(min_length=2, max_length=6)
    correct_index: int
    explanation: str | None = None
    order: int = 0


class CompanyAptitudeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    company_id: int
    question_text: str
    options: list[str]
    order: int


class CompanyAptitudeAdminOut(CompanyAptitudeOut):
    correct_index: int
    explanation: str | None


class CompanyAptitudeAttemptIn(BaseModel):
    selected_index: int


class CompanyAptitudeAttemptResult(BaseModel):
    is_correct: bool
    correct_index: int
    explanation: str | None


class CompanyTechnicalIn(BaseModel):
    question_text: str
    key_points: list[str] = []
    order: int = 0


class CompanyTechnicalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    company_id: int
    question_text: str
    key_points: list[str]
    order: int


class CompanyCodingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    difficulty: str
    tags: list[str]
