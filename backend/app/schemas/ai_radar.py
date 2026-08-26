from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AiRadarItemIn(BaseModel):
    title: str
    url: str
    source: str | None = None
    snippet: str | None = None
    summary: str | None = None
    use_cases: str | None = None


class AiRadarItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    url: str
    source: str | None
    snippet: str | None
    query: str
    summary: str | None
    use_cases: str | None
    is_manual: bool
    found_at: datetime


class AiRadarRunResult(BaseModel):
    added: int
    error: str | None = None
