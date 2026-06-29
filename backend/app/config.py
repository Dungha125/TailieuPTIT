from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://tailieuptit:tailieuptit_secret@localhost:5432/tailieuptit"
    redis_url: str = "redis://localhost:6379/0"
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin123"
    minio_secure: bool = False
    jwt_secret_key: str = "super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    max_file_size_mb: int = 50
    admin_username: str = "admin"
    admin_password: str = "admin123"

    documents_cache_ttl: int = 300
    tags_cache_ttl: int = 1800
    search_cache_ttl: int = 300
    download_rate_limit: int = 30
    download_rate_window: int = 60

    bucket_documents: str = "public-documents"
    bucket_images: str = "public-images"
    unclassified_tag: str = "Chưa phân loại"

    class Config:
        env_file = ".env"
        case_sensitive = False

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024


settings = Settings()
