from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.tag import TagResponse


class DocumentBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    visibility: bool = True


class DocumentUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    visibility: bool | None = None
    tag_ids: list[int] | None = None


class DocumentResponse(BaseModel):
    id: int
    title: str
    description: str | None
    file_url: str
    object_name: str
    bucket_name: str
    file_type: str
    size: int
    download_count: int
    visibility: bool
    uploaded_by: int | None
    created_at: datetime
    updated_at: datetime
    tags: list[TagResponse] = []

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    items: list[DocumentResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class UploadResponse(BaseModel):
    id: int
    title: str
    file_url: str
    message: str
    duplicate: bool = False
