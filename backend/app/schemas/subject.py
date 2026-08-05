from pydantic import BaseModel, ConfigDict

from app.models.user import EducationLevel


class TopicCreate(BaseModel):
    name: str


class TopicOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    subject_id: int
    name: str


class SubjectCreate(BaseModel):
    name: str
    description: str | None = None
    education_level: EducationLevel | None = None


class SubjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    education_level: EducationLevel | None = None
    clear_education_level: bool = False


class SubjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    education_level: EducationLevel | None
    created_by: int
    topics: list[TopicOut] = []
    exam_count: int = 0
    pdf_count: int = 0
