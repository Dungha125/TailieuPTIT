from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.classify import DocumentTagMetadata
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
    faculty: str | None = Field(None, max_length=200)
    subject: str | None = Field(None, max_length=200)
    doc_type: str | None = Field(None, max_length=100)
    year: str | None = Field(None, max_length=10)


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str | None = None
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
    tags: DocumentTagMetadata
    legacy_tags: list[TagResponse] = Field(default_factory=list)


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
