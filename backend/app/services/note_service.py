from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models.document import Document
from app.models.note import Note, NoteDocumentLink, NoteFolder
from app.models.user import User
from app.services.redis_service import redis_service

RECENT_NOTES_KEY = "notes:recent:{user_id}"
RECENT_NOTES_TTL = 300


def _folder_owned(db: Session, user_id: int, folder_id: int) -> NoteFolder:
    folder = db.query(NoteFolder).filter(NoteFolder.id == folder_id, NoteFolder.user_id == user_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Thư mục không tồn tại")
    return folder


def _note_owned(db: Session, user_id: int, note_id: int) -> Note:
    note = (
        db.query(Note)
        .options(joinedload(Note.document_links))
        .filter(Note.id == note_id, Note.user_id == user_id)
        .first()
    )
    if not note:
        raise HTTPException(status_code=404, detail="Note không tồn tại")
    return note


def build_folder_tree(folders: list[NoteFolder]) -> list[dict]:
    by_parent: dict[int | None, list[NoteFolder]] = {}
    for f in folders:
        by_parent.setdefault(f.parent_id, []).append(f)
    for items in by_parent.values():
        items.sort(key=lambda x: (x.sort_order, x.name.lower()))

    def walk(parent_id: int | None) -> list[dict]:
        return [
            {
                "id": f.id,
                "parent_id": f.parent_id,
                "name": f.name,
                "sort_order": f.sort_order,
                "created_at": f.created_at,
                "children": walk(f.id),
            }
            for f in by_parent.get(parent_id, [])
        ]

    return walk(None)


def list_folders(db: Session, user: User) -> list[dict]:
    folders = db.query(NoteFolder).filter(NoteFolder.user_id == user.id).all()
    return build_folder_tree(folders)


def create_folder(db: Session, user: User, name: str, parent_id: int | None) -> NoteFolder:
    if parent_id is not None:
        _folder_owned(db, user.id, parent_id)
    max_order = (
        db.query(NoteFolder.sort_order)
        .filter(NoteFolder.user_id == user.id, NoteFolder.parent_id == parent_id)
        .order_by(NoteFolder.sort_order.desc())
        .first()
    )
    folder = NoteFolder(
        user_id=user.id,
        parent_id=parent_id,
        name=name.strip(),
        sort_order=(max_order[0] + 1) if max_order else 0,
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return folder


def update_folder(db: Session, user: User, folder_id: int, **kwargs) -> NoteFolder:
    folder = _folder_owned(db, user.id, folder_id)
    if kwargs.get("parent_id") is not None and kwargs["parent_id"] == folder_id:
        raise HTTPException(status_code=400, detail="Không thể đặt thư mục làm cha của chính nó")
    if kwargs.get("name") is not None:
        folder.name = kwargs["name"].strip()
    if "parent_id" in kwargs:
        pid = kwargs["parent_id"]
        if pid is not None:
            _folder_owned(db, user.id, pid)
        folder.parent_id = pid
    if kwargs.get("sort_order") is not None:
        folder.sort_order = kwargs["sort_order"]
    db.commit()
    db.refresh(folder)
    return folder


def reorder_folders(db: Session, user: User, items: list[dict]) -> None:
    for item in items:
        folder = _folder_owned(db, user.id, item["id"])
        folder.parent_id = item.get("parent_id")
        folder.sort_order = item["sort_order"]
    db.commit()


def delete_folder(db: Session, user: User, folder_id: int) -> None:
    folder = _folder_owned(db, user.id, folder_id)
    db.delete(folder)
    db.commit()


def note_to_response(note: Note, db: Session) -> dict:
    links = []
    for link in note.document_links:
        doc = db.query(Document).filter(Document.id == link.document_id).first()
        links.append(
            {
                "id": link.id,
                "document_id": link.document_id,
                "anchor_text": link.anchor_text,
                "document_title": doc.title if doc else None,
                "document_slug": doc.slug if doc else None,
                "document_available": doc is not None and doc.visibility,
            }
        )
    return {
        "id": note.id,
        "folder_id": note.folder_id,
        "title": note.title,
        "content": note.content,
        "content_format": note.content_format,
        "is_pinned": note.is_pinned,
        "is_archived": note.is_archived,
        "is_trashed": note.is_trashed,
        "created_at": note.created_at,
        "updated_at": note.updated_at,
        "document_links": links,
    }


def invalidate_recent_notes(user_id: int) -> None:
    redis_service.client.delete(RECENT_NOTES_KEY.format(user_id=user_id))


def list_notes(
    db: Session,
    user: User,
    *,
    page: int = 1,
    page_size: int = 20,
    folder_id: int | None = None,
    q: str | None = None,
    view: str = "all",
) -> tuple[list[Note], int]:
    query = db.query(Note).filter(Note.user_id == user.id)

    if view == "pinned":
        query = query.filter(Note.is_pinned.is_(True), Note.is_trashed.is_(False))
    elif view == "archived":
        query = query.filter(Note.is_archived.is_(True), Note.is_trashed.is_(False))
    elif view == "trash":
        query = query.filter(Note.is_trashed.is_(True))
    else:
        query = query.filter(Note.is_archived.is_(False), Note.is_trashed.is_(False))

    if folder_id is not None:
        query = query.filter(Note.folder_id == folder_id)

    if q and q.strip():
        pattern = f"%{q.strip()}%"
        query = query.filter(or_(Note.title.ilike(pattern), Note.content.ilike(pattern)))

    total = query.count()
    items = (
        query.options(joinedload(Note.document_links))
        .order_by(Note.is_pinned.desc(), Note.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items, total


def create_note(db: Session, user: User, **data) -> Note:
    if data.get("folder_id"):
        _folder_owned(db, user.id, data["folder_id"])
    note = Note(
        user_id=user.id,
        folder_id=data.get("folder_id"),
        title=data.get("title") or "Không có tiêu đề",
        content=data.get("content"),
        content_format="json",
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    invalidate_recent_notes(user.id)
    return note


def update_note(db: Session, user: User, note_id: int, **data) -> Note:
    note = _note_owned(db, user.id, note_id)
    if data.get("folder_id") is not None and data["folder_id"]:
        _folder_owned(db, user.id, data["folder_id"])
    for field in ("title", "folder_id", "content", "is_pinned", "is_archived"):
        if field in data and data[field] is not None:
            setattr(note, field, data[field])
    if "is_trashed" in data and data["is_trashed"] is not None:
        note.is_trashed = data["is_trashed"]
        note.trashed_at = datetime.now(timezone.utc) if data["is_trashed"] else None
        if data["is_trashed"]:
            note.is_archived = False
            note.is_pinned = False
    note.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(note)
    invalidate_recent_notes(user.id)
    return note


def delete_note(db: Session, user: User, note_id: int, permanent: bool = False) -> None:
    note = _note_owned(db, user.id, note_id)
    if permanent:
        db.delete(note)
    else:
        note.is_trashed = True
        note.trashed_at = datetime.now(timezone.utc)
    db.commit()
    invalidate_recent_notes(user.id)


def add_document_link(db: Session, user: User, note_id: int, document_id: int, anchor_text: str) -> NoteDocumentLink:
    note = _note_owned(db, user.id, note_id)
    doc = db.query(Document).filter(Document.id == document_id, Document.visibility.is_(True)).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Tài liệu không tồn tại")
    link = NoteDocumentLink(note_id=note.id, document_id=document_id, anchor_text=anchor_text.strip())
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


def get_recent_notes_cached(db: Session, user: User, limit: int = 8) -> list[dict]:
    key = RECENT_NOTES_KEY.format(user_id=user.id)
    cached = redis_service.get(key)
    if cached:
        return cached
    notes, _ = list_notes(db, user, page=1, page_size=limit, view="all")
    payload = [note_to_response(n, db) for n in notes]
    redis_service.set(key, payload, ttl=RECENT_NOTES_TTL)
    return payload
