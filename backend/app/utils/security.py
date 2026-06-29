import hashlib
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.jwt_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None


def compute_file_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def get_file_extension(filename: str) -> str:
    if "." in filename:
        return filename.rsplit(".", 1)[-1].lower()
    return ""


def is_image_type(file_type: str, filename: str) -> bool:
    image_exts = {"jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"}
    return file_type in image_exts or get_file_extension(filename) in image_exts


def build_object_name(filename: str) -> str:
    import uuid

    now = datetime.now(timezone.utc)
    safe_name = filename.replace(" ", "_")
    return f"{now.year}/{now.month:02d}/{now.day:02d}/{uuid.uuid4()}_{safe_name}"
