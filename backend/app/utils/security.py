import hashlib
import re
import unicodedata
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALLOWED_EXTENSIONS = frozenset({
    "pdf", "doc", "docx", "zip", "jpg", "jpeg", "png", "gif", "webp",
})
BLOCKED_EXTENSIONS = frozenset({
    "php", "phtml", "js", "jsx", "ts", "tsx", "sh", "bash", "exe", "bat",
    "cmd", "ps1", "vbs", "jar", "msi", "dll", "so", "html", "htm", "svg",
})
MAGIC_SIGNATURES: list[tuple[bytes, set[str]]] = [
    (b"%PDF", {"pdf"}),
    (b"PK\x03\x04", {"zip", "docx"}),
    (b"\xff\xd8\xff", {"jpg", "jpeg"}),
    (b"\x89PNG\r\n\x1a\n", {"png"}),
    (b"GIF87a", {"gif"}),
    (b"GIF89a", {"gif"}),
    (b"RIFF", {"webp"}),
]


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    to_encode.setdefault("type", "access")
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.jwt_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    to_encode["type"] = "refresh"
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(days=settings.jwt_refresh_days)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("type") not in (None, "access"):
            return None
        return payload
    except JWTError:
        return None


def decode_refresh_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "refresh":
            return None
        return payload
    except JWTError:
        return None


def compute_file_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def get_file_extension(filename: str) -> str:
    if "." in filename:
        return filename.rsplit(".", 1)[-1].lower()
    return ""


def is_image_type(file_type: str, filename: str) -> bool:
    image_exts = {"jpg", "jpeg", "png", "gif", "webp", "bmp"}
    return file_type in image_exts or get_file_extension(filename) in image_exts


def build_object_name(filename: str) -> str:
    import uuid

    now = datetime.now(timezone.utc)
    ext = get_file_extension(filename)
    safe_ext = re.sub(r"[^a-z0-9]", "", ext)[:10]
    return f"{now.year}/{now.month:02d}/{now.day:02d}/{uuid.uuid4()}.{safe_ext or 'bin'}"


def sanitize_filename(filename: str) -> str:
    if not filename:
        return "download"
    normalized = unicodedata.normalize("NFKD", filename)
    ascii_name = normalized.encode("ascii", "ignore").decode("ascii")
    name = re.sub(r"[^\w.\-()]", "_", ascii_name)
    name = re.sub(r"_+", "_", name).strip("._")
    return (name[:200] or "download")


def content_disposition_header(disposition: str, filename: str) -> str:
    """Build ASCII-safe Content-Disposition (RFC 5987 for Unicode names)."""
    safe = sanitize_filename(filename)
    encoded = quote(filename, safe="")
    return f'{disposition}; filename="{safe}"; filename*=UTF-8\'\'{encoded}'


def validate_upload_file(filename: str, content: bytes) -> tuple[bool, str]:
    ext = get_file_extension(filename)
    if not ext:
        return False, "File must have an extension"
    if ext in BLOCKED_EXTENSIONS:
        return False, f"File type .{ext} is not allowed"
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Extension .{ext} is not in the allowlist"

    if len(content) < 4:
        return False, "File is too small or empty"

    for signature, allowed_exts in MAGIC_SIGNATURES:
        if content.startswith(signature):
            if ext in allowed_exts or (ext == "doc" and signature == b"PK\x03\x04"):
                return True, ""
            return False, "File content does not match extension"

    if ext == "pdf":
        return False, "Invalid PDF file"
    if ext in {"jpg", "jpeg", "png", "gif", "webp"}:
        return False, "Invalid image file"

    return True, ""
