from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.bookmark import (
    BookmarkCreate,
    BookmarkFolderCreate,
    BookmarkFolderResponse,
    BookmarkResponse,
    DashboardResponse,
)
from app.services import bookmark_service

router = APIRouter(tags=["Bookmarks & Dashboard"])


@router.get("/me/dashboard", response_model=DashboardResponse)
def get_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return bookmark_service.get_dashboard(db, current_user)


@router.get("/bookmarks/folders", response_model=list[BookmarkFolderResponse])
def list_bookmark_folders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return bookmark_service.list_bookmark_folders(db, current_user)


@router.post("/bookmarks/folders", response_model=BookmarkFolderResponse, status_code=201)
def create_bookmark_folder(
    payload: BookmarkFolderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return bookmark_service.create_bookmark_folder(db, current_user, payload.name)


@router.delete("/bookmarks/folders/{folder_id}", status_code=204)
def delete_bookmark_folder(
    folder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bookmark_service.delete_bookmark_folder(db, current_user, folder_id)


@router.get("/bookmarks", response_model=list[BookmarkResponse])
def list_bookmarks(
    folder_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return bookmark_service.list_bookmarks(db, current_user, folder_id)


@router.post("/bookmarks", response_model=BookmarkResponse, status_code=201)
def add_bookmark(
    payload: BookmarkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bm = bookmark_service.add_bookmark(db, current_user, payload.document_id, payload.folder_id)
    from app.models.document import Document

    doc = db.query(Document).filter(Document.id == bm.document_id).first()
    return bookmark_service.bookmark_to_dict(bm, doc)


@router.delete("/bookmarks/{document_id}", status_code=204)
def remove_bookmark(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bookmark_service.remove_bookmark(db, current_user, document_id)


@router.post("/documents/{document_id}/view", status_code=204)
def record_view(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bookmark_service.record_document_view(db, current_user, document_id)
