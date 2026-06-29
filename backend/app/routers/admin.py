from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import require_admin
from app.models.document import Document
from app.models.tag import Tag
from app.models.user import User
from app.schemas.document import DocumentResponse, DocumentUpdate, UploadResponse
from app.schemas.tag import TagCreate, TagResponse
from app.services.document_service import (
    assign_tags,
    document_to_response,
    find_duplicate_by_hash,
    invalidate_caches,
)
from app.services.minio_service import minio_service
from app.services.redis_service import redis_service
from app.utils.security import build_object_name, compute_file_hash, get_file_extension, is_image_type

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/upload", response_model=list[UploadResponse])
async def upload_documents(
    files: list[UploadFile] = File(...),
    title: str = Form(""),
    description: str = Form(""),
    visibility: bool = Form(True),
    tag_ids: str = Form(""),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    parsed_tag_ids: list[int] = []
    if tag_ids.strip():
        parsed_tag_ids = [int(t.strip()) for t in tag_ids.split(",") if t.strip().isdigit()]

    results: list[UploadResponse] = []

    for file in files:
        content = await file.read()
        if len(content) > settings.max_file_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File {file.filename} exceeds max size of {settings.max_file_size_mb}MB",
            )

        file_hash = compute_file_hash(content)
        existing = find_duplicate_by_hash(db, file_hash)
        if existing:
            results.append(
                UploadResponse(
                    id=existing.id,
                    title=existing.title,
                    file_url=existing.file_url,
                    message="Duplicate file detected",
                    duplicate=True,
                )
            )
            continue

        ext = get_file_extension(file.filename or "")
        file_type = ext or (file.content_type or "unknown")
        bucket = (
            settings.bucket_images
            if is_image_type(file_type, file.filename or "")
            else settings.bucket_documents
        )
        object_name = build_object_name(file.filename or "file")

        minio_service.upload_file(
            bucket,
            object_name,
            content,
            file.content_type or "application/octet-stream",
        )

        doc_title = (
            title.strip()
            if title.strip() and len(files) == 1
            else (file.filename or "Untitled")
        )
        document = Document(
            title=doc_title,
            description=description or None,
            object_name=object_name,
            bucket_name=bucket,
            file_type=file_type,
            file_hash=file_hash,
            size=len(content),
            visibility=visibility,
            uploaded_by=current_user.id,
        )
        db.add(document)
        db.flush()
        assign_tags(db, document, parsed_tag_ids if parsed_tag_ids else None)
        db.commit()
        db.refresh(document)

        redis_service.add_recent_upload(document.id)
        invalidate_caches()

        results.append(
            UploadResponse(
                id=document.id,
                title=document.title,
                file_url=document.file_url,
                message="Upload successful",
                duplicate=False,
            )
        )

    return results


@router.post("/tags", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
def create_tag(
    payload: TagCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    existing = db.query(Tag).filter(Tag.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tag already exists")

    tag = Tag(name=payload.name)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    redis_service.client.delete("tags:all")
    return tag


@router.get("/documents", response_model=list[DocumentResponse])
def admin_list_documents(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from app.services.document_service import get_documents_query

    docs = get_documents_query(db, public_only=False).order_by(Document.created_at.desc()).all()
    return [document_to_response(d) for d in docs]


@router.put("/documents/{doc_id}", response_model=DocumentResponse)
def update_document(
    doc_id: int,
    payload: DocumentUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if payload.title is not None:
        doc.title = payload.title
    if payload.description is not None:
        doc.description = payload.description
    if payload.visibility is not None:
        doc.visibility = payload.visibility
    if payload.tag_ids is not None:
        assign_tags(db, doc, payload.tag_ids)

    db.commit()
    db.refresh(doc)
    invalidate_caches()
    return document_to_response(doc)


@router.delete("/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    doc_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    minio_service.delete_file(doc.bucket_name, doc.object_name)
    db.delete(doc)
    db.commit()
    invalidate_caches()
