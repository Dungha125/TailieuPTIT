from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.constants.tag_categories import validate_tag_category
from app.database import get_db
from app.dependencies import require_admin, require_editor_or_admin
from app.models.document import Document
from app.models.tag import Tag
from app.models.user import User
from app.schemas.document import DocumentResponse, DocumentUpdate, UploadResponse
from app.schemas.storage import StorageStatsResponse
from app.schemas.tag import TagCreate, TagResponse, TagUpdate
from app.schemas.user import UserAdminResponse, UserCreate, UserUpdate
from app.services.classify_service import (
    apply_classify_to_document,
    sync_legacy_tags_from_classify,
)
from app.services.document_service import (
    document_to_response,
    find_duplicate_by_hash,
    invalidate_caches,
)
from app.services.minio_service import minio_service
from app.services.redis_service import redis_service
from app.services.slug_service import unique_document_slug, unique_tag_slug
from app.services.tag_service import delete_tag, update_tag
from app.utils.security import (
    build_object_name,
    compute_file_hash,
    get_file_extension,
    hash_password,
    is_image_type,
    sanitize_filename,
    validate_upload_file,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/upload", response_model=list[UploadResponse])
async def upload_documents(
    files: list[UploadFile] = File(...),
    title: str = Form(""),
    description: str = Form(""),
    visibility: bool = Form(True),
    faculty: str = Form(""),
    subject: str = Form(""),
    doc_type: str = Form(""),
    year: str = Form(""),
    current_user: User = Depends(require_editor_or_admin),
    db: Session = Depends(get_db),
):
    results: list[UploadResponse] = []

    for file in files:
        content = await file.read()
        if len(content) > settings.max_file_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File {file.filename} exceeds max size of {settings.max_file_size_mb}MB",
            )

        valid, reason = validate_upload_file(file.filename or "", content)
        if not valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File rejected: {reason}",
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
            slug=unique_document_slug(db, doc_title),
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
        apply_classify_to_document(
            document,
            faculty=faculty or None,
            subject=subject or None,
            doc_type=doc_type or None,
            year=year or None,
        )
        sync_legacy_tags_from_classify(db, document)
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
    current_user: User = Depends(require_editor_or_admin),
    db: Session = Depends(get_db),
):
    existing = db.query(Tag).filter(Tag.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tag already exists")

    tag = Tag(
        name=payload.name,
        slug=unique_tag_slug(db, payload.name),
        category=validate_tag_category(payload.category),
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    redis_service.client.delete("tags:all")
    return tag


@router.put("/tags/{tag_id}", response_model=TagResponse)
def update_tag_endpoint(
    tag_id: int,
    payload: TagUpdate,
    current_user: User = Depends(require_editor_or_admin),
    db: Session = Depends(get_db),
):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    return update_tag(db, tag, payload.name, payload.category)


@router.delete("/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag_endpoint(
    tag_id: int,
    current_user: User = Depends(require_editor_or_admin),
    db: Session = Depends(get_db),
):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    delete_tag(db, tag)


@router.get("/storage", response_model=StorageStatsResponse)
def get_storage_stats(
    current_user: User = Depends(require_editor_or_admin),
    db: Session = Depends(get_db),
):
    row = db.query(
        func.coalesce(func.sum(Document.size), 0),
        func.count(Document.id),
    ).one()
    used_bytes = int(row[0])
    file_count = int(row[1])
    total_bytes = settings.storage_quota_bytes
    used_percent = round((used_bytes / total_bytes) * 100, 2) if total_bytes else 0.0
    return StorageStatsResponse(
        used_bytes=used_bytes,
        total_bytes=total_bytes,
        used_percent=min(used_percent, 100.0),
        file_count=file_count,
    )


@router.get("/documents", response_model=list[DocumentResponse])
def admin_list_documents(
    current_user: User = Depends(require_editor_or_admin),
    db: Session = Depends(get_db),
):
    from app.services.document_service import get_documents_query

    docs = get_documents_query(db, public_only=False).order_by(Document.created_at.desc()).all()
    return [document_to_response(d) for d in docs]


@router.put("/documents/{doc_id}", response_model=DocumentResponse)
def update_document(
    doc_id: int,
    payload: DocumentUpdate,
    current_user: User = Depends(require_editor_or_admin),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if payload.title is not None:
        doc.title = payload.title
        doc.slug = unique_document_slug(db, payload.title, exclude_id=doc.id)
    if payload.description is not None:
        doc.description = payload.description
    if payload.visibility is not None:
        doc.visibility = payload.visibility
    apply_classify_to_document(
        doc,
        faculty=payload.faculty,
        subject=payload.subject,
        doc_type=payload.doc_type,
        year=payload.year,
    )
    sync_legacy_tags_from_classify(db, doc)

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


@router.get("/users", response_model=list[UserAdminResponse])
def list_users(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.username).all()
    return users


@router.post("/users", response_model=UserAdminResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}", response_model=UserAdminResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.role is not None:
        if user.id == current_user.id and payload.role != current_user.role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change your own role",
            )
        if user.role == "admin" and payload.role != "admin":
            admin_count = db.query(User).filter(User.role == "admin").count()
            if admin_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot demote the last admin",
                )
        user.role = payload.role

    if payload.password:
        user.password_hash = hash_password(payload.password)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.role == "admin":
        admin_count = db.query(User).filter(User.role == "admin").count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last admin",
            )

    db.delete(user)
    db.commit()
