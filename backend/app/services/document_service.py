from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.models.document import Document
from app.models.tag import Tag
from app.schemas.classify import DocumentTagMetadata
from app.schemas.document import DocumentResponse
from app.services.redis_service import redis_service


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
        slug=doc.slug,
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
        tags=DocumentTagMetadata(
            faculty=doc.tag_faculty,
            subject=doc.tag_subject,
            doc_type=doc.tag_doc_type,
            year=doc.tag_year,
        ),
        legacy_tags=[{"id": t.id, "name": t.name, "slug": t.slug} for t in doc.tags],
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
    faculty: str | None = None,
    subject: str | None = None,
    doc_type: str | None = None,
    year: str | None = None,
) -> tuple[list[Document], int]:
    query = get_documents_query(db, public_only=public_only)

    if tag_name:
        query = query.join(Document.tags).filter(Tag.name == tag_name)

    if unclassified_only:
        unclassified = get_or_create_unclassified_tag(db)
        query = query.join(Document.tags).filter(Tag.id == unclassified.id)

    faculty_label = None
    subject_label = None
    type_label = None
    year_label = None
    if faculty or subject or doc_type or year:
        from app.services.classify_service import resolve_classify_slug

        faculty_label = resolve_classify_slug(db, "faculty", faculty)
        subject_label = resolve_classify_slug(db, "subject", subject)
        type_label = resolve_classify_slug(db, "type", doc_type)
        year_label = resolve_classify_slug(db, "year", year)

    if faculty_label:
        query = query.filter(Document.tag_faculty == faculty_label)
    if subject_label:
        query = query.filter(Document.tag_subject == subject_label)
    if type_label:
        query = query.filter(Document.tag_doc_type == type_label)
    if year_label:
        query = query.filter(Document.tag_year == year_label)

    if search:
        pattern = f"%{search}%"
        tag_doc_ids = (
            db.query(Document.id)
            .join(Document.tags)
            .filter(Tag.name.ilike(pattern))
            .distinct()
        )
        query = query.filter(
            or_(
                Document.title.ilike(pattern),
                Document.description.ilike(pattern),
                Document.tag_faculty.ilike(pattern),
                Document.tag_subject.ilike(pattern),
                Document.tag_doc_type.ilike(pattern),
                Document.tag_year.ilike(pattern),
                Document.id.in_(tag_doc_ids),
            )
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
    redis_service.client.delete("seo:sitemap")
    redis_service.client.delete("taxonomy:tree")


def get_related_documents(db: Session, doc: Document, limit: int = 8) -> list[Document]:
    tag_ids = [t.id for t in doc.tags]
    if not tag_ids:
        return (
            get_documents_query(db)
            .filter(Document.id != doc.id)
            .order_by(Document.download_count.desc())
            .limit(limit)
            .all()
        )

    related = (
        get_documents_query(db)
        .join(Document.tags)
        .filter(Tag.id.in_(tag_ids), Document.id != doc.id)
        .order_by(Document.download_count.desc())
        .limit(limit * 2)
        .all()
    )

    seen = set()
    unique: list[Document] = []
    for item in related:
        if item.id in seen:
            continue
        seen.add(item.id)
        unique.append(item)
        if len(unique) >= limit:
            break
    return unique
