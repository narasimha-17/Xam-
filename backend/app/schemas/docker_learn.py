from pydantic import BaseModel


class DockerLevelCompleteIn(BaseModel):
    level_id: str
    xp: int


class DockerProgressOut(BaseModel):
    completed_level_ids: list[str] = []
    total_xp: int = 0
