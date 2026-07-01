from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    full_name = Column(String(200), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="user", nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    verification_token = Column(String(64), nullable=True, index=True)
    reset_token = Column(String(64), nullable=True, index=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    documents = relationship("Document", back_populates="uploader")
    note_folders = relationship("NoteFolder", back_populates="user", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="user", cascade="all, delete-orphan")
    bookmarks = relationship("DocumentBookmark", back_populates="user", cascade="all, delete-orphan")
    bookmark_folders = relationship("BookmarkFolder", back_populates="user", cascade="all, delete-orphan")
    document_views = relationship("DocumentView", back_populates="user", cascade="all, delete-orphan")
