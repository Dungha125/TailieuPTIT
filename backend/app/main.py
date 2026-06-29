import logging
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import document, tag, user  # noqa: F401
from app.models.tag import Tag
from app.models.user import User
from app.routers import admin, auth, documents
from app.services.document_service import get_or_create_unclassified_tag
from app.services.minio_service import minio_service
from app.utils.security import hash_password

logger = logging.getLogger(__name__)


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
    app = FastAPI(
        title="TailieuPTIT API",
        description="Public document management system",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router)
    app.include_router(documents.router)
    app.include_router(admin.router)

    @app.on_event("startup")
    def on_startup():
        wait_for_db()
        Base.metadata.create_all(bind=engine)
        minio_service.ensure_buckets()
        seed_admin()
        logger.info("Application started")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()
