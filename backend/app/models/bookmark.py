from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.database import Base


class BookmarkFolder(Base):
    __tablename__ = "bookmark_folders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="bookmark_folders")
    bookmarks = relationship("DocumentBookmark", back_populates="folder")


class DocumentBookmark(Base):
    __tablename__ = "document_bookmarks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    folder_id = Column(Integer, ForeignKey("bookmark_folders.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("user_id", "document_id", name="uq_user_document_bookmark"),)

    user = relationship("User", back_populates="bookmarks")
    document = relationship("Document")
    folder = relationship("BookmarkFolder", back_populates="bookmarks")


class DocumentView(Base):
    __tablename__ = "document_views"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    viewed_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint("user_id", "document_id", name="uq_user_document_view"),)

    user = relationship("User", back_populates="document_views")
    document = relationship("Document")
