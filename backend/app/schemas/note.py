from datetime import datetime

from pydantic import BaseModel, Field


class NoteFolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    parent_id: int | None = None


class NoteFolderUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    parent_id: int | None = None
    sort_order: int | None = None


class NoteFolderReorderItem(BaseModel):
    id: int
    parent_id: int | None = None
    sort_order: int


class NoteFolderReorderRequest(BaseModel):
    items: list[NoteFolderReorderItem]


class NoteFolderResponse(BaseModel):
    id: int
    parent_id: int | None
    name: str
    sort_order: int
    created_at: datetime
    children: list["NoteFolderResponse"] = []

    class Config:
        from_attributes = True


NoteFolderResponse.model_rebuild()


class NoteCreate(BaseModel):
    title: str = Field(default="Không có tiêu đề", max_length=500)
    folder_id: int | None = None
    content: str | None = None


class NoteUpdate(BaseModel):
    title: str | None = Field(None, max_length=500)
    folder_id: int | None = None
    content: str | None = None
    is_pinned: bool | None = None
    is_archived: bool | None = None
    is_trashed: bool | None = None


class NoteDocumentLinkCreate(BaseModel):
    document_id: int
    anchor_text: str = Field(..., min_length=1, max_length=500)


class NoteDocumentLinkResponse(BaseModel):
    id: int
    document_id: int
    anchor_text: str
    document_title: str | None = None
    document_slug: str | None = None
    document_available: bool = True


class NoteResponse(BaseModel):
    id: int
    folder_id: int | None
    title: str
    content: str | None
    content_format: str
    is_pinned: bool
    is_archived: bool
    is_trashed: bool
    trashed_at: datetime | None = None
    trash_days_remaining: int | None = None
    created_at: datetime
    updated_at: datetime
    document_links: list[NoteDocumentLinkResponse] = []


class NoteQuota(BaseModel):
    active_count: int
    max_count: int
    storage_warning: bool
    can_create: bool


class NoteListResponse(BaseModel):
    items: list[NoteResponse]
    total: int
    page: int
    page_size: int
    has_more: bool
    quota: NoteQuota
