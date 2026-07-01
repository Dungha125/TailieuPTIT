from datetime import datetime

from pydantic import BaseModel, Field


class BookmarkFolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)


class BookmarkFolderResponse(BaseModel):
    id: int
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


class BookmarkCreate(BaseModel):
    document_id: int
    folder_id: int | None = None


class BookmarkResponse(BaseModel):
    id: int
    document_id: int
    folder_id: int | None
    created_at: datetime
    document_title: str | None = None
    document_slug: str | None = None
    file_type: str | None = None


class DashboardResponse(BaseModel):
    note_count: int
    folder_count: int
    bookmark_count: int
    recent_notes: list[dict]
    recent_documents: list[dict]
    bookmarked_documents: list[dict]
