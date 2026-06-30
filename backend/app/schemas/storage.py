from pydantic import BaseModel


class StorageStatsResponse(BaseModel):
    used_bytes: int
    total_bytes: int
    used_percent: float
    file_count: int
