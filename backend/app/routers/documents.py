from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

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
    invalidate_caches,
    paginate_documents,
)
from app.services.minio_service import minio_service
from app.services.redis_service import redis_service
from app.utils.security import build_object_name, compute_file_hash, get_file_extension, is_image_type

router = APIRouter(prefix="/documents", tags=["Public Documents"])


def _cache_key(prefix: str, **kwargs) -> str:
    parts = [prefix] + [f"{k}={v}" for k, v in sorted(kwargs.items())]
    return ":".join(parts)


@router.get("", response_model=DocumentListResponse)
def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    cache_key = _cache_key("documents", page=page, page_size=page_size)
    cached = redis_service.get(cache_key)
    if cached:
        return cached

    items, total = paginate_documents(db, page=page, page_size=page_size)
    response = DocumentListResponse(
        items=[document_to_response(d) for d in items],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )
    redis_service.set(cache_key, response.model_dump(), ttl=settings.documents_cache_ttl)
    return response


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

    tags = db.query(Tag).order_by(Tag.name).all()
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
    db: Session = Depends(get_db),
):
    client_ip = "global"
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

    data, content_type = minio_service.get_file(doc.bucket_name, doc.object_name)
    filename = doc.object_name.rsplit("/", 1)[-1]
    if "_" in filename:
        filename = filename.split("_", 1)[1]

    return StreamingResponse(
        io.BytesIO(data),
        media_type=content_type or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/preview/{doc_id}/stream")
def preview_stream(doc_id: int, db: Session = Depends(get_db)):
    doc = get_documents_query(db).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    data, content_type = minio_service.get_file(doc.bucket_name, doc.object_name)
    filename = doc.object_name.rsplit("/", 1)[-1]
    if "_" in filename:
        filename = filename.split("_", 1)[1]

    return StreamingResponse(
        io.BytesIO(data),
        media_type=content_type or "application/octet-stream",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
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
