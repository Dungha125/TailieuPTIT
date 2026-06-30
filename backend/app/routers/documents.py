from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from minio.error import S3Error
from sqlalchemy.orm import Session
import io
import logging

from app.config import settings
from app.database import get_db
from app.dependencies import require_admin
from app.models.document import Document
from app.models.tag import Tag
from app.models.user import User
from app.schemas.document import DocumentListResponse, DocumentResponse, DocumentUpdate, UploadResponse
from app.schemas.tag import TagCreate, TagListResponse, TagResponse
from app.services.document_service import (
    assign_tags,
    document_to_response,
    find_duplicate_by_hash,
    get_documents_query,
    get_related_documents,
    invalidate_caches,
    paginate_documents,
)
from app.services.classify_service import build_taxonomy_tree
from app.services.slug_service import unique_document_slug
from app.services.minio_service import minio_service
from app.services.redis_service import redis_service
from app.utils.security import content_disposition_header, sanitize_filename
from app.utils.client import get_client_ip

router = APIRouter(prefix="/documents", tags=["Public Documents"])
logger = logging.getLogger(__name__)


def _load_document_file(doc: Document) -> tuple[bytes, str | None]:
    try:
        return minio_service.get_file(doc.bucket_name, doc.object_name)
    except S3Error as e:
        logger.error("MinIO get_object failed for doc %s: %s", doc.id, e)
        if e.code in {"NoSuchKey", "NoSuchObject", "NoSuchBucket"}:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found in storage",
            ) from e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Storage error",
        ) from e


def _cache_key(prefix: str, **kwargs) -> str:
    parts = [prefix] + [f"{k}={v}" for k, v in sorted(kwargs.items())]
    return ":".join(parts)


@router.get("", response_model=DocumentListResponse)
def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    faculty: str | None = None,
    subject: str | None = None,
    type: str | None = Query(None, alias="type"),
    year: str | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    cache_key = _cache_key(
        "documents",
        page=page,
        page_size=page_size,
        faculty=faculty or "",
        subject=subject or "",
        type=type or "",
        year=year or "",
        q=q or "",
    )
    cached = redis_service.get(cache_key)
    if cached:
        return cached

    items, total = paginate_documents(
        db,
        page=page,
        page_size=page_size,
        search=q,
        faculty=faculty,
        subject=subject,
        doc_type=type,
        year=year,
    )
    response = DocumentListResponse(
        items=[document_to_response(d) for d in items],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )
    redis_service.set(cache_key, response.model_dump(), ttl=settings.documents_cache_ttl)
    return response


@router.get("/taxonomy")
def get_taxonomy(db: Session = Depends(get_db)):
    cached = redis_service.get("taxonomy:tree")
    if cached:
        return cached
    tree = build_taxonomy_tree(db)
    payload = {"tree": tree}
    redis_service.set("taxonomy:tree", payload, ttl=settings.tags_cache_ttl)
    return payload


@router.get("/search", response_model=DocumentListResponse)
def search_documents(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    cache_key = _cache_key("search", q=q, page=page, page_size=page_size)
    cached = redis_service.get(cache_key)
    if cached:
        return cached

    items, total = paginate_documents(db, page=page, page_size=page_size, search=q)
    response = DocumentListResponse(
        items=[document_to_response(d) for d in items],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )
    redis_service.set(cache_key, response.model_dump(), ttl=settings.search_cache_ttl)
    return response


@router.get("/unclassified", response_model=DocumentListResponse)
def unclassified_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    items, total = paginate_documents(
        db, page=page, page_size=page_size, unclassified_only=True
    )
    return DocumentListResponse(
        items=[document_to_response(d) for d in items],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/tag/{tag_name}", response_model=DocumentListResponse)
def documents_by_tag(
    tag_name: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    items, total = paginate_documents(db, page=page, page_size=page_size, tag_name=tag_name)
    return DocumentListResponse(
        items=[document_to_response(d) for d in items],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/tags/all", response_model=TagListResponse)
def list_tags(db: Session = Depends(get_db)):
    cached = redis_service.get("tags:all")
    if cached:
        return cached

    tags = (
        db.query(Tag)
        .order_by(Tag.category.asc().nulls_last(), Tag.name.asc())
        .all()
    )
    response = TagListResponse(
        items=[TagResponse.model_validate(t) for t in tags],
        total=len(tags),
    )
    redis_service.set("tags:all", response.model_dump(), ttl=settings.tags_cache_ttl)
    return response


@router.get("/hot", response_model=list[DocumentResponse])
def hot_documents(db: Session = Depends(get_db)):
    hot_ids = redis_service.get_hot_downloads(10)
    if not hot_ids:
        docs = (
            get_documents_query(db)
            .order_by(Document.download_count.desc())
            .limit(10)
            .all()
        )
    else:
        docs = (
            get_documents_query(db)
            .filter(Document.id.in_(hot_ids))
            .all()
        )
        docs.sort(key=lambda d: hot_ids.index(d.id) if d.id in hot_ids else 999)
    return [document_to_response(d) for d in docs]


@router.get("/recent", response_model=list[DocumentResponse])
def recent_documents(db: Session = Depends(get_db)):
    recent_ids = redis_service.get_recent_uploads(10)
    if recent_ids:
        docs = get_documents_query(db).filter(Document.id.in_(recent_ids)).all()
        docs.sort(key=lambda d: recent_ids.index(d.id) if d.id in recent_ids else 999)
    else:
        docs = (
            get_documents_query(db)
            .order_by(Document.created_at.desc())
            .limit(10)
            .all()
        )
    return [document_to_response(d) for d in docs]


@router.get("/download/{doc_id}")
def download_document(
    doc_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    client_ip = get_client_ip(request)
    rate_key = f"rate:download:{client_ip}"
    if not redis_service.check_rate_limit(
        rate_key, settings.download_rate_limit, settings.download_rate_window
    ):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")

    doc = get_documents_query(db).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    doc.download_count += 1
    db.commit()
    redis_service.increment_hot_download(doc_id)

    data, content_type = _load_document_file(doc)
    ext = doc.file_type or "bin"
    filename = sanitize_filename(f"{doc.title}.{ext}")

    return StreamingResponse(
        io.BytesIO(data),
        media_type=content_type or "application/octet-stream",
        headers={"Content-Disposition": content_disposition_header("attachment", f"{doc.title}.{ext}")},
    )


@router.get("/preview/{doc_id}/stream")
def preview_stream(doc_id: int, db: Session = Depends(get_db)):
    doc = get_documents_query(db).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    data, content_type = _load_document_file(doc)
    ext = doc.file_type or "bin"

    return StreamingResponse(
        io.BytesIO(data),
        media_type=content_type or "application/octet-stream",
        headers={"Content-Disposition": content_disposition_header("inline", f"{doc.title}.{ext}")},
    )


@router.get("/preview/{doc_id}")
def preview_document(doc_id: int, db: Session = Depends(get_db)):
    doc = get_documents_query(db).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    return {
        "preview_url": f"/documents/preview/{doc_id}/stream",
        "file_type": doc.file_type,
    }


@router.get("/category/{tag_slug}", response_model=DocumentListResponse)
def documents_by_tag_slug(
    tag_slug: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    tag = db.query(Tag).filter(Tag.slug == tag_slug).first()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    items, total = paginate_documents(db, page=page, page_size=page_size, tag_name=tag.name)
    return DocumentListResponse(
        items=[document_to_response(d) for d in items],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/by-slug/{slug}", response_model=DocumentResponse)
def get_document_by_slug(slug: str, db: Session = Depends(get_db)):
    doc = get_documents_query(db).filter(Document.slug == slug).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document_to_response(doc)


@router.get("/{doc_id}/related", response_model=list[DocumentResponse])
def related_documents(doc_id: int, db: Session = Depends(get_db)):
    doc = get_documents_query(db).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    related = get_related_documents(db, doc, limit=8)
    return [document_to_response(d) for d in related]


@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(doc_id: int, db: Session = Depends(get_db)):
    cache_key = f"doc:{doc_id}"
    cached = redis_service.get(cache_key)
    if cached:
        return cached

    doc = get_documents_query(db).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    response = document_to_response(doc)
    redis_service.set(cache_key, response.model_dump(), ttl=settings.documents_cache_ttl)
    return response
