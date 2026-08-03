from pydantic import BaseModel


class GitLevelCompleteIn(BaseModel):
    level_id: str
    xp: int


class GitProgressOut(BaseModel):
    completed_level_ids: list[str] = []
    total_xp: int = 0
