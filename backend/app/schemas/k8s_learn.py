from pydantic import BaseModel


class K8sLevelCompleteIn(BaseModel):
    level_id: str
    xp: int


class K8sProgressOut(BaseModel):
    completed_level_ids: list[str] = []
    total_xp: int = 0
