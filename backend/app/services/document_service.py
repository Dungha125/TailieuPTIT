from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.models.document import Document
from app.models.tag import Tag
from app.schemas.document import DocumentResponse
from app.services.redis_service import redis_service
from app.utils.security import build_object_name, compute_file_hash, get_file_extension, is_image_type


def get_or_create_unclassified_tag(db: Session) -> Tag:
    tag = db.query(Tag).filter(Tag.name == settings.unclassified_tag).first()
    if not tag:
        tag = Tag(name=settings.unclassified_tag)
        db.add(tag)
        db.commit()
        db.refresh(tag)
    return tag


def document_to_response(doc: Document) -> DocumentResponse:
    return DocumentResponse(
        id=doc.id,
        title=doc.title,
        description=doc.description,
        file_url=doc.file_url,
        object_name=doc.object_name,
        bucket_name=doc.bucket_name,
        file_type=doc.file_type,
        size=doc.size,
        download_count=doc.download_count,
        visibility=doc.visibility,
        uploaded_by=doc.uploaded_by,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        tags=[{"id": t.id, "name": t.name} for t in doc.tags],
    )


def get_documents_query(db: Session, public_only: bool = True):
    query = db.query(Document).options(joinedload(Document.tags))
    if public_only:
        query = query.filter(Document.visibility.is_(True))
    return query


def paginate_documents(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    public_only: bool = True,
    tag_name: str | None = None,
    search: str | None = None,
    unclassified_only: bool = False,
) -> tuple[list[Document], int]:
    query = get_documents_query(db, public_only=public_only)

    if tag_name:
        query = query.join(Document.tags).filter(Tag.name == tag_name)

    if unclassified_only:
        unclassified = get_or_create_unclassified_tag(db)
        query = query.join(Document.tags).filter(Tag.id == unclassified.id)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(Document.title.ilike(pattern), Document.description.ilike(pattern))
        )

    total = query.count()
    items = (
        query.order_by(Document.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items, total


def find_duplicate_by_hash(db: Session, file_hash: str) -> Document | None:
    return db.query(Document).filter(Document.file_hash == file_hash).first()


def assign_tags(db: Session, document: Document, tag_ids: list[int] | None) -> None:
    document.tags.clear()
    if tag_ids:
        tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all()
        document.tags.extend(tags)
    else:
        document.tags.append(get_or_create_unclassified_tag(db))


def invalidate_caches() -> None:
    redis_service.invalidate_document_caches()
    redis_service.client.delete("tags:all")
