from urllib.parse import quote_plus

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    environment: str = "development"
    database_url: str | None = None
    postgres_user: str = "tailieuptit"
    postgres_password: str = "tailieuptit_secret"
    postgres_db: str = "tailieuptit"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    redis_url: str = "redis://localhost:6379/0"
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin123"
    minio_secure: bool = False
    jwt_secret_key: str = "super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    jwt_refresh_days: int = 7
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    trusted_hosts: str = "*"
    max_file_size_mb: int = 50
    admin_username: str = "admin"
    admin_password: str = "admin123"

    documents_cache_ttl: int = 300
    tags_cache_ttl: int = 1800
    search_cache_ttl: int = 300
    download_rate_limit: int = 30
    download_rate_window: int = 60

    # Rate limiting (per IP, sliding window)
    rate_limit_public: int = 100
    rate_limit_login: int = 5
    rate_limit_upload: int = 10
    rate_limit_search: int = 60
    rate_limit_burst_threshold: int = 20
    rate_limit_ban_seconds: int = 1800
    rate_limit_fail_closed: bool = True

    # Login lockout
    login_max_attempts: int = 5
    login_lockout_window: int = 300
    login_ban_seconds: int = 1800

    # Security headers
    enable_hsts: bool = False
    csp_header: str = "default-src 'none'; frame-ancestors 'none'"

    # Optional Cloudflare Turnstile (login protection)
    turnstile_secret_key: str = ""

    # AES-GCM payload encryption (DevTools obfuscation)
    enable_api_payload_encryption: bool = False
    api_payload_encryption_key: str = ""

    bucket_documents: str = "public-documents"
    bucket_images: str = "public-images"
    unclassified_tag: str = "Chưa phân loại"
    storage_quota_gb: int = 60

    # SEO
    site_url: str = "http://localhost:5173"
    site_name: str = "TailieuPTIT"

    # Email (SMTP)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_use_tls: bool = True
    frontend_url: str = "http://localhost:5173"

    # Registration
    require_email_verification: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = False

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in ("production", "prod")

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        user = quote_plus(self.postgres_user)
        password = quote_plus(self.postgres_password)
        return (
            f"postgresql://{user}:{password}@{self.postgres_host}:"
            f"{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def trusted_hosts_list(self) -> list[str]:
        hosts = [h.strip() for h in self.trusted_hosts.split(",") if h.strip()]
        return hosts or ["*"]

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    @property
    def storage_quota_bytes(self) -> int:
        return self.storage_quota_gb * 1024 * 1024 * 1024


settings = Settings()
