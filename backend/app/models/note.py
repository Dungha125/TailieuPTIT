from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.database import Base


class NoteFolder(Base):
    __tablename__ = "note_folders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_id = Column(Integer, ForeignKey("note_folders.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(200), nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="note_folders")
    parent = relationship("NoteFolder", remote_side="NoteFolder.id", back_populates="children")
    children = relationship("NoteFolder", back_populates="parent", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="folder")


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    folder_id = Column(Integer, ForeignKey("note_folders.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(500), nullable=False, default="Không có tiêu đề")
    content = Column(Text, nullable=True)
    content_format = Column(String(20), default="json", nullable=False)
    is_pinned = Column(Boolean, default=False, nullable=False)
    is_archived = Column(Boolean, default=False, nullable=False)
    is_trashed = Column(Boolean, default=False, nullable=False)
    trashed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="notes")
    folder = relationship("NoteFolder", back_populates="notes")
    document_links = relationship("NoteDocumentLink", back_populates="note", cascade="all, delete-orphan")


class NoteDocumentLink(Base):
    __tablename__ = "note_document_links"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    anchor_text = Column(String(500), nullable=False)

    note = relationship("Note", back_populates="document_links")
    document = relationship("Document")
