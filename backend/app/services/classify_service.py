from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.config import settings

logger = logging.getLogger(__name__)

from app.models.document import Document
from app.models.tag import Tag
from app.services.document_service import get_documents_query, get_or_create_unclassified_tag
from app.utils.slugify import slugify


def _label(value: str | None, fallback: str = "Khác") -> str:
    text = (value or "").strip()
    return text or fallback


def run_classify_migrations(db: Session) -> None:
    from sqlalchemy import text

    for col, col_type in (
        ("tag_faculty", "VARCHAR(200)"),
        ("tag_subject", "VARCHAR(200)"),
        ("tag_doc_type", "VARCHAR(100)"),
        ("tag_year", "VARCHAR(10)"),
    ):
        db.execute(
            text(f"ALTER TABLE documents ADD COLUMN IF NOT EXISTS {col} {col_type}")
        )
    db.commit()
    logger.info("Classify columns ensured on documents table")


def sync_legacy_tags_from_classify(db: Session, doc: Document) -> None:
    names: list[str] = []
    seen: set[str] = set()
    for value in (doc.tag_faculty, doc.tag_subject, doc.tag_doc_type, doc.tag_year):
        text = (value or "").strip()
        if not text or text in seen or text == settings.unclassified_tag:
            continue
        seen.add(text)
        names.append(text)

    doc.tags.clear()
    if not names:
        doc.tags.append(get_or_create_unclassified_tag(db))
        return

    matched = db.query(Tag).filter(Tag.name.in_(names)).all()
    by_name = {tag.name: tag for tag in matched}
    for name in names:
        tag = by_name.get(name)
        if tag:
            doc.tags.append(tag)

    if not doc.tags:
        doc.tags.append(get_or_create_unclassified_tag(db))


def legacy_tag_ids(doc: Document) -> list[int]:
    return sorted(t.id for t in doc.tags if t.name != settings.unclassified_tag)


def sync_classify_subject_from_legacy_tags(doc: Document) -> None:
    legacy = [t for t in doc.tags if t.name != settings.unclassified_tag]
    doc.tag_subject = legacy[0].name if legacy else None


def apply_classify_to_document(
    doc: Document,
    *,
    faculty: str | None = None,
    subject: str | None = None,
    doc_type: str | None = None,
    year: str | None = None,
) -> None:
    if faculty is not None:
        doc.tag_faculty = faculty.strip() or None
    if subject is not None:
        doc.tag_subject = subject.strip() or None
    if doc_type is not None:
        doc.tag_doc_type = doc_type.strip() or None
    if year is not None:
        doc.tag_year = year.strip() or None


def _resolve_slug_label_map(db: Session) -> dict[str, dict[str, str]]:
    docs = get_documents_query(db).all()
    maps: dict[str, dict[str, str]] = {
        "faculty": {},
        "subject": {},
        "type": {},
        "year": {},
    }
    for doc in docs:
        pairs = (
            ("faculty", doc.tag_faculty),
            ("subject", doc.tag_subject),
            ("type", doc.tag_doc_type),
            ("year", doc.tag_year),
        )
        for level, value in pairs:
            label = _label(value)
            maps[level][slugify(label)] = label
    return maps


def resolve_classify_slug(db: Session, level: str, slug: str | None) -> str | None:
    if not slug:
        return None
    label_map = _resolve_slug_label_map(db)
    return label_map.get(level, {}).get(slug)


def build_taxonomy_tree(db: Session) -> list[dict]:
    docs = get_documents_query(db).all()
    root: dict = {}

    for doc in docs:
        faculty = _label(doc.tag_faculty)
        subject = _label(doc.tag_subject)
        doc_type = _label(doc.tag_doc_type)
        year = _label(doc.tag_year)

        f_slug = slugify(faculty)
        s_slug = slugify(subject)
        t_slug = slugify(doc_type)
        y_slug = slugify(year)

        f_node = root.setdefault(
            f_slug,
            {"level": "faculty", "slug": f_slug, "label": faculty, "count": 0, "_children": {}},
        )
        f_node["count"] += 1

        s_node = f_node["_children"].setdefault(
            s_slug,
            {"level": "subject", "slug": s_slug, "label": subject, "count": 0, "_children": {}},
        )
        s_node["count"] += 1

        t_node = s_node["_children"].setdefault(
            t_slug,
            {"level": "type", "slug": t_slug, "label": doc_type, "count": 0, "_children": {}},
        )
        t_node["count"] += 1

        y_node = t_node["_children"].setdefault(
            y_slug,
            {"level": "year", "slug": y_slug, "label": year, "count": 0, "_children": {}},
        )
        y_node["count"] += 1

    def serialize(node_map: dict) -> list[dict]:
        items = sorted(node_map.values(), key=lambda n: n["label"].lower())
        result = []
        for item in items:
            children_map = item.pop("_children", {})
            item["children"] = serialize(children_map)
            result.append(item)
        return result

    return serialize(root)


def backfill_classify_from_legacy(db: Session) -> int:
    updated = 0
    docs = db.query(Document).all()
    for doc in docs:
        if doc.tag_faculty and doc.tag_subject:
            continue
        legacy = [t for t in doc.tags if t.name != settings.unclassified_tag]
        if legacy and not doc.tag_subject:
            doc.tag_subject = legacy[0].name
        if not doc.tag_faculty:
            doc.tag_faculty = "PTIT"
        if not doc.tag_doc_type:
            title_lower = (doc.title or "").lower()
            if "đề thi" in title_lower or "de thi" in title_lower:
                doc.tag_doc_type = "Đề thi"
            elif "slide" in title_lower:
                doc.tag_doc_type = "Slide"
            elif "bài giảng" in title_lower or "bai giang" in title_lower:
                doc.tag_doc_type = "Bài giảng"
            else:
                doc.tag_doc_type = "Tài liệu"
        if not doc.tag_year and doc.created_at:
            doc.tag_year = str(doc.created_at.year)
        updated += 1
    if updated:
        db.commit()
    return updated
