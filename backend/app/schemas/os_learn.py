from pydantic import BaseModel


class OsLevelCompleteIn(BaseModel):
    level_id: str
    xp: int


class OsProgressOut(BaseModel):
    completed_level_ids: list[str] = []
    total_xp: int = 0
