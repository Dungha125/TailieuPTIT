from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.document import Document
from app.models.user import User
from app.schemas.note import (
    NoteCreate,
    NoteDocumentLinkCreate,
    NoteDocumentLinkResponse,
    NoteFolderCreate,
    NoteFolderReorderRequest,
    NoteFolderResponse,
    NoteFolderUpdate,
    NoteListResponse,
    NoteQuota,
    NoteResponse,
    NoteUpdate,
)
from app.services import note_service

router = APIRouter(prefix="/notes", tags=["Notes"])


@router.get("/folders", response_model=list[NoteFolderResponse])
def get_folders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return note_service.list_folders(db, current_user)


@router.post("/folders", response_model=NoteFolderResponse, status_code=201)
def create_folder(
    payload: NoteFolderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    folder = note_service.create_folder(db, current_user, payload.name, payload.parent_id)
    return {
        "id": folder.id,
        "parent_id": folder.parent_id,
        "name": folder.name,
        "sort_order": folder.sort_order,
        "created_at": folder.created_at,
        "children": [],
    }


@router.put("/folders/{folder_id}", response_model=NoteFolderResponse)
def update_folder(
    folder_id: int,
    payload: NoteFolderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    folder = note_service.update_folder(
        db,
        current_user,
        folder_id,
        name=payload.name,
        parent_id=payload.parent_id,
        sort_order=payload.sort_order,
    )
    return {
        "id": folder.id,
        "parent_id": folder.parent_id,
        "name": folder.name,
        "sort_order": folder.sort_order,
        "created_at": folder.created_at,
        "children": [],
    }


@router.put("/folders/reorder")
def reorder_folders(
    payload: NoteFolderReorderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note_service.reorder_folders(db, current_user, [i.model_dump() for i in payload.items])
    return {"ok": True}


@router.delete("/folders/{folder_id}", status_code=204)
def delete_folder(
    folder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note_service.delete_folder(db, current_user, folder_id)


@router.get("/quota", response_model=NoteQuota)
def get_note_quota(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return note_service.get_note_quota(db, current_user)


@router.get("", response_model=NoteListResponse)
def list_notes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    folder_id: int | None = None,
    q: str | None = None,
    view: str = Query("all", pattern="^(all|pinned|trash)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items, total = note_service.list_notes(
        db, current_user, page=page, page_size=page_size, folder_id=folder_id, q=q, view=view
    )
    return NoteListResponse(
        items=[note_service.note_to_response(n, db) for n in items],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
        quota=note_service.get_note_quota(db, current_user),
    )


@router.post("", response_model=NoteResponse, status_code=201)
def create_note(
    payload: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = note_service.create_note(db, current_user, **payload.model_dump())
    return note_service.note_to_response(note, db)


@router.get("/{note_id}", response_model=NoteResponse)
def get_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = note_service._note_owned(db, current_user.id, note_id)
    return note_service.note_to_response(note, db)


@router.put("/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: int,
    payload: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = note_service.update_note(db, current_user, note_id, **payload.model_dump(exclude_unset=True))
    return note_service.note_to_response(note, db)


@router.post("/{note_id}/restore", response_model=NoteResponse)
def restore_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = note_service.restore_note(db, current_user, note_id)
    return note_service.note_to_response(note, db)


@router.delete("/{note_id}", status_code=204)
def delete_note(
    note_id: int,
    permanent: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note_service.delete_note(db, current_user, note_id, permanent=permanent)


@router.post("/{note_id}/links", response_model=NoteDocumentLinkResponse, status_code=201)
def add_document_link(
    note_id: int,
    payload: NoteDocumentLinkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    link = note_service.add_document_link(
        db, current_user, note_id, payload.document_id, payload.anchor_text
    )
    doc = db.query(Document).filter(Document.id == link.document_id).first()
    return {
        "id": link.id,
        "document_id": link.document_id,
        "anchor_text": link.anchor_text,
        "document_title": doc.title if doc else None,
        "document_slug": doc.slug if doc else None,
        "document_available": bool(doc and doc.visibility),
    }
