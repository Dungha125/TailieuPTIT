from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.tag import document_tags


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    object_name = Column(String(500), nullable=False)
    bucket_name = Column(String(100), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_hash = Column(String(64), nullable=True, index=True)
    size = Column(Integer, default=0)
    download_count = Column(Integer, default=0)
    visibility = Column(Boolean, default=True, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    uploader = relationship("User", back_populates="documents")
    tags = relationship("Tag", secondary=document_tags, back_populates="documents")

    @property
    def file_url(self) -> str:
        return f"/{self.bucket_name}/{self.object_name}"
