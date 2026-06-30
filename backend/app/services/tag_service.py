from fastapi import HTTPException, status
from sqlalchemy import or_, text
from sqlalchemy.orm import Session, joinedload

import logging

from app.config import settings
from app.constants.tag_categories import validate_tag_category
from app.models.document import Document
from app.models.tag import Tag
from app.services.document_service import get_or_create_unclassified_tag, invalidate_caches
from app.services.slug_service import unique_tag_slug

logger = logging.getLogger(__name__)


def run_tag_migrations(db: Session) -> None:
    db.execute(text("ALTER TABLE tags ADD COLUMN IF NOT EXISTS category VARCHAR(20)"))
    db.commit()
    logger.info("Tag category column ensured on tags table")


def _assert_mutable_tag(tag: Tag) -> None:
    if tag.name == settings.unclassified_tag:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể sửa hoặc xóa danh mục hệ thống",
        )


def _rename_classify_fields(db: Session, old_name: str, new_name: str) -> None:
    docs = db.query(Document).filter(
        or_(
            Document.tag_faculty == old_name,
            Document.tag_subject == old_name,
            Document.tag_doc_type == old_name,
            Document.tag_year == old_name,
        )
    ).all()
    for doc in docs:
        if doc.tag_faculty == old_name:
            doc.tag_faculty = new_name
        if doc.tag_subject == old_name:
            doc.tag_subject = new_name
        if doc.tag_doc_type == old_name:
            doc.tag_doc_type = new_name
        if doc.tag_year == old_name:
            doc.tag_year = new_name


def _clear_classify_fields(db: Session, name: str) -> None:
    docs = db.query(Document).filter(
        or_(
            Document.tag_faculty == name,
            Document.tag_subject == name,
            Document.tag_doc_type == name,
            Document.tag_year == name,
        )
    ).all()
    for doc in docs:
        if doc.tag_faculty == name:
            doc.tag_faculty = None
        if doc.tag_subject == name:
            doc.tag_subject = None
        if doc.tag_doc_type == name:
            doc.tag_doc_type = None
        if doc.tag_year == name:
            doc.tag_year = None


def update_tag(db: Session, tag: Tag, new_name: str, category: str) -> Tag:
    _assert_mutable_tag(tag)
    cleaned = new_name.strip()
    cat = validate_tag_category(category)
    if not cleaned:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên danh mục không hợp lệ")

    name_changed = cleaned != tag.name
    category_changed = cat != tag.category
    if not name_changed and not category_changed:
        return tag

    if name_changed:
        existing = db.query(Tag).filter(Tag.name == cleaned, Tag.id != tag.id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tên danh mục đã tồn tại")
        old_name = tag.name
        tag.name = cleaned
        tag.slug = unique_tag_slug(db, cleaned, exclude_id=tag.id)
        _rename_classify_fields(db, old_name, cleaned)

    tag.category = cat
    db.commit()
    db.refresh(tag)
    invalidate_caches()
    return tag


def delete_tag(db: Session, tag: Tag) -> None:
    _assert_mutable_tag(tag)
    old_name = tag.name
    linked_doc_ids = [doc.id for doc in tag.documents]
    _clear_classify_fields(db, old_name)
    db.delete(tag)
    db.flush()

    if linked_doc_ids:
        unclassified = get_or_create_unclassified_tag(db)
        docs = (
            db.query(Document)
            .options(joinedload(Document.tags))
            .filter(Document.id.in_(linked_doc_ids))
            .all()
        )
        for doc in docs:
            if not doc.tags:
                doc.tags.append(unclassified)

    db.commit()
    invalidate_caches()
