import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.middleware import (
    PayloadEncryptionMiddleware,
    RateLimitMiddleware,
    RequestLoggingMiddleware,
    SecurityHeadersMiddleware,
)
from app.models import bookmark, document, note, tag, user  # noqa: F401
from app.models.tag import Tag
from app.models.user import User
from app.routers import admin, auth, bookmarks, documents, notes, seo
from app.services.document_service import get_or_create_unclassified_tag
from app.services.minio_service import minio_service
from app.utils.security import hash_password

logger = logging.getLogger(__name__)


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_bytes: int):
        super().__init__(app)
        self.max_bytes = max_bytes

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_bytes:
            from starlette.responses import JSONResponse

            return JSONResponse(
                status_code=413,
                content={"detail": f"Request body too large (max {settings.max_file_size_mb}MB)"},
            )
        return await call_next(request)


def seed_admin():
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.username == settings.admin_username).first()
        if not admin_user:
            admin_user = User(
                username=settings.admin_username,
                password_hash=hash_password(settings.admin_password),
                role="admin",
            )
            db.add(admin_user)
            db.commit()
            logger.info("Default admin user created")

        get_or_create_unclassified_tag(db)
    finally:
        db.close()


def wait_for_db(max_retries: int = 30, delay: float = 2.0):
    from sqlalchemy import text

    for i in range(max_retries):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return
        except Exception:
            logger.warning("Waiting for database... attempt %d/%d", i + 1, max_retries)
            time.sleep(delay)
    raise RuntimeError("Could not connect to database")


def create_app() -> FastAPI:
    docs_url = None if settings.is_production else "/docs"
    redoc_url = None if settings.is_production else "/redoc"
    openapi_url = None if settings.is_production else "/openapi.json"

    app = FastAPI(
        title="TailieuPTIT API",
        description="Public document management system",
        version="1.0.0",
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
    )

    if settings.trusted_hosts_list != ["*"]:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts_list)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-Request-Id",
            "X-Idempotency-Key",
            "X-Encrypted",
        ],
        expose_headers=["X-Encrypted", "X-Request-Id", "Retry-After"],
    )
    app.add_middleware(PayloadEncryptionMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(BodySizeLimitMiddleware, max_bytes=settings.max_file_size_bytes * 12)

    app.include_router(auth.router)
    app.include_router(documents.router)
    app.include_router(notes.router)
    app.include_router(bookmarks.router)
    app.include_router(admin.router)
    app.include_router(seo.router)

    @app.on_event("startup")
    def on_startup():
        wait_for_db()
        Base.metadata.create_all(bind=engine)
        minio_service.ensure_buckets()
        db = SessionLocal()
        try:
            from app.routers.seo import run_seo_migrations

            run_seo_migrations(db)
        except Exception as e:
            logger.warning("SEO migration skipped or failed: %s", e)
            db.rollback()
        finally:
            db.close()

        db = SessionLocal()
        try:
            from app.services.classify_service import (
                backfill_classify_from_legacy,
                run_classify_migrations,
            )

            run_classify_migrations(db)
            try:
                count = backfill_classify_from_legacy(db)
                if count:
                    logger.info("Classify backfill updated %s documents", count)
            except Exception as e:
                logger.warning("Classify backfill skipped or failed: %s", e)
                db.rollback()
        except Exception as e:
            logger.error("Classify migration failed: %s", e)
            db.rollback()
        finally:
            db.close()

        db = SessionLocal()
        try:
            from app.services.tag_service import run_tag_migrations

            run_tag_migrations(db)
        except Exception as e:
            logger.error("Tag migration failed: %s", e)
            db.rollback()
        finally:
            db.close()

        db = SessionLocal()
        try:
            from app.services.user_migrations import run_notes_migrations, run_user_migrations

            run_user_migrations(db)
            run_notes_migrations(db)
        except Exception as e:
            logger.error("User/notes migration failed: %s", e)
            db.rollback()
        finally:
            db.close()

        if not settings.is_production:
            seed_admin()
        elif settings.admin_password and settings.admin_password != "admin123":
            seed_admin()
        logger.info("Application started (env=%s)", settings.environment)

    @app.get("/health")
    def health():
        from app.utils import payload_crypto

        return {
            "status": "ok",
            "payload_encryption_enabled": payload_crypto.is_enabled(),
        }

    return app


app = create_app()
