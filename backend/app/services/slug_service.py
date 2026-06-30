from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.tag import Tag
from app.utils.slugify import slugify


def unique_document_slug(db: Session, title: str, exclude_id: int | None = None) -> str:
    base = slugify(title)
    candidate = base
    counter = 1
    while True:
        query = db.query(Document).filter(Document.slug == candidate)
        if exclude_id:
            query = query.filter(Document.id != exclude_id)
        if not query.first():
            return candidate
        counter += 1
        candidate = f"{base}-{counter}"


def unique_tag_slug(db: Session, name: str, exclude_id: int | None = None) -> str:
    base = slugify(name, max_length=100)
    candidate = base
    counter = 1
    while True:
        query = db.query(Tag).filter(Tag.slug == candidate)
        if exclude_id:
            query = query.filter(Tag.id != exclude_id)
        if not query.first():
            return candidate
        counter += 1
        candidate = f"{base}-{counter}"
