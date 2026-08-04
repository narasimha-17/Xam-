from pydantic import BaseModel


class SqlLevelCompleteIn(BaseModel):
    level_id: str
    xp: int


class SqlProgressOut(BaseModel):
    completed_level_ids: list[str] = []
    total_xp: int = 0
