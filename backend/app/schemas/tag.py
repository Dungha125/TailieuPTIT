from datetime import datetime

from pydantic import BaseModel, Field


class TagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: str = Field(..., min_length=1, max_length=20)


class TagUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: str = Field(..., min_length=1, max_length=20)


class TagResponse(BaseModel):
    id: int
    name: str
    slug: str | None = None
    category: str | None = None

    class Config:
        from_attributes = True


class TagListResponse(BaseModel):
    items: list[TagResponse]
    total: int
