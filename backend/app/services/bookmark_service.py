from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.bookmark import BookmarkFolder, DocumentBookmark, DocumentView
from app.models.document import Document
from app.models.note import Note, NoteFolder
from app.models.user import User
from app.services.document_service import document_to_response
from app.services.note_service import get_recent_notes_cached, note_to_response, list_notes


def list_bookmark_folders(db: Session, user: User) -> list[BookmarkFolder]:
    return db.query(BookmarkFolder).filter(BookmarkFolder.user_id == user.id).order_by(BookmarkFolder.name).all()


def create_bookmark_folder(db: Session, user: User, name: str) -> BookmarkFolder:
    folder = BookmarkFolder(user_id=user.id, name=name.strip())
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return folder


def delete_bookmark_folder(db: Session, user: User, folder_id: int) -> None:
    folder = db.query(BookmarkFolder).filter(BookmarkFolder.id == folder_id, BookmarkFolder.user_id == user.id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Thư mục bookmark không tồn tại")
    db.delete(folder)
    db.commit()


def bookmark_to_dict(bookmark: DocumentBookmark, doc: Document | None) -> dict:
    return {
        "id": bookmark.id,
        "document_id": bookmark.document_id,
        "folder_id": bookmark.folder_id,
        "created_at": bookmark.created_at,
        "document_title": doc.title if doc else None,
        "document_slug": doc.slug if doc else None,
        "file_type": doc.file_type if doc else None,
    }


def list_bookmark_document_ids(db: Session, user: User) -> list[int]:
    rows = (
        db.query(DocumentBookmark.document_id)
        .filter(DocumentBookmark.user_id == user.id)
        .all()
    )
    return [row[0] for row in rows]


def list_bookmarks(db: Session, user: User, folder_id: int | None = None) -> list[dict]:
    query = db.query(DocumentBookmark).filter(DocumentBookmark.user_id == user.id)
    if folder_id is not None:
        query = query.filter(DocumentBookmark.folder_id == folder_id)
    bookmarks = query.order_by(DocumentBookmark.created_at.desc()).all()
    result = []
    for bm in bookmarks:
        doc = db.query(Document).filter(Document.id == bm.document_id).first()
        result.append(bookmark_to_dict(bm, doc))
    return result


def add_bookmark(db: Session, user: User, document_id: int, folder_id: int | None = None) -> DocumentBookmark:
    doc = db.query(Document).filter(Document.id == document_id, Document.visibility.is_(True)).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Tài liệu không tồn tại")
    existing = (
        db.query(DocumentBookmark)
        .filter(DocumentBookmark.user_id == user.id, DocumentBookmark.document_id == document_id)
        .first()
    )
    if existing:
        return existing
    if folder_id:
        folder = db.query(BookmarkFolder).filter(BookmarkFolder.id == folder_id, BookmarkFolder.user_id == user.id).first()
        if not folder:
            raise HTTPException(status_code=404, detail="Thư mục bookmark không tồn tại")
    bm = DocumentBookmark(user_id=user.id, document_id=document_id, folder_id=folder_id)
    db.add(bm)
    db.commit()
    db.refresh(bm)
    return bm


def remove_bookmark(db: Session, user: User, document_id: int) -> None:
    bm = (
        db.query(DocumentBookmark)
        .filter(DocumentBookmark.user_id == user.id, DocumentBookmark.document_id == document_id)
        .first()
    )
    if bm:
        db.delete(bm)
        db.commit()


def record_document_view(db: Session, user: User, document_id: int) -> None:
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        return
    row = (
        db.query(DocumentView)
        .filter(DocumentView.user_id == user.id, DocumentView.document_id == document_id)
        .first()
    )
    if row:
        row.viewed_at = datetime.now(timezone.utc)
    else:
        db.add(DocumentView(user_id=user.id, document_id=document_id))
    db.commit()


def get_dashboard(db: Session, user: User) -> dict:
    note_count = db.query(Note).filter(Note.user_id == user.id, Note.is_trashed.is_(False)).count()
    folder_count = db.query(NoteFolder).filter(NoteFolder.user_id == user.id).count()
    bookmark_count = db.query(DocumentBookmark).filter(DocumentBookmark.user_id == user.id).count()

    recent_notes = get_recent_notes_cached(db, user, limit=6)

    views = (
        db.query(DocumentView)
        .filter(DocumentView.user_id == user.id)
        .order_by(DocumentView.viewed_at.desc())
        .limit(8)
        .all()
    )
    recent_documents = []
    for v in views:
        doc = db.query(Document).filter(Document.id == v.document_id).first()
        if doc and doc.visibility:
            recent_documents.append(
                {
                    "id": doc.id,
                    "title": doc.title,
                    "slug": doc.slug,
                    "file_type": doc.file_type,
                    "viewed_at": v.viewed_at,
                }
            )

    bookmarks = list_bookmarks(db, user)[:8]

    return {
        "note_count": note_count,
        "folder_count": folder_count,
        "bookmark_count": bookmark_count,
        "recent_notes": recent_notes,
        "recent_documents": recent_documents,
        "bookmarked_documents": bookmarks,
    }
