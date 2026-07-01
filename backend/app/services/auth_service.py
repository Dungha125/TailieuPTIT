import logging
import re
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.constants.roles import PORTAL_ROLES, ROLE_USER
from app.models.user import User
from app.services.email_service import generate_token, send_password_reset_email
from app.services.redis_service import redis_service
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)

logger = logging.getLogger(__name__)

USERNAME_RE = re.compile(r"^[a-zA-Z0-9._-]{4,100}$")
REFRESH_TTL_SECONDS = 7 * 24 * 3600


def _normalize_username(username: str) -> str:
    return username.strip()


def register_user(
    db: Session,
    *,
    full_name: str,
    username: str,
    password: str,
) -> User:
    username = _normalize_username(username)
    if not USERNAME_RE.match(username):
        raise HTTPException(
            status_code=400,
            detail="Tên đăng nhập chỉ gồm chữ, số, dấu chấm, gạch ngang (4–100 ký tự)",
        )
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Mật khẩu tối thiểu 8 ký tự")
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=409, detail="Mã sinh viên / tên đăng nhập đã tồn tại")

    user = User(
        username=username,
        email=None,
        full_name=full_name.strip(),
        password_hash=hash_password(password),
        role=ROLE_USER,
        email_verified=True,
        verification_token=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, username: str, password: str) -> User:
    username = _normalize_username(username)
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Tên đăng nhập hoặc mật khẩu không đúng")
    if user.role in PORTAL_ROLES:
        raise HTTPException(status_code=403, detail="Tài khoản quản trị — dùng trang đăng nhập admin")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản đã bị khóa")
    return user


def authenticate_admin(db: Session, username: str, password: str) -> User:
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    return user


def issue_tokens(user: User) -> tuple[str, str]:
    access = create_access_token(
        data={"sub": str(user.id), "role": user.role, "type": "access"},
        expires_delta=timedelta(minutes=settings.jwt_expire_minutes),
    )
    jti = str(uuid.uuid4())
    refresh = create_refresh_token(
        data={"sub": str(user.id), "role": user.role, "jti": jti},
        expires_delta=timedelta(days=settings.jwt_refresh_days),
    )
    redis_service.client.setex(f"refresh:{jti}", REFRESH_TTL_SECONDS, str(user.id))
    return access, refresh


def refresh_access_token(db: Session, refresh_token: str) -> tuple[str, str]:
    payload = decode_refresh_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Refresh token không hợp lệ")
    jti = payload.get("jti")
    user_id = payload.get("sub")
    if not jti or not user_id:
        raise HTTPException(status_code=401, detail="Refresh token không hợp lệ")
    stored = redis_service.client.get(f"refresh:{jti}")
    if not stored or stored != str(user_id):
        raise HTTPException(status_code=401, detail="Refresh token đã hết hạn hoặc bị thu hồi")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Người dùng không tồn tại")

    redis_service.client.delete(f"refresh:{jti}")
    return issue_tokens(user)


def revoke_refresh_token(refresh_token: str) -> None:
    payload = decode_refresh_token(refresh_token)
    if payload and payload.get("jti"):
        redis_service.client.delete(f"refresh:{payload['jti']}")


def verify_email(db: Session, token: str) -> User:
    user = db.query(User).filter(User.verification_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Token xác thực không hợp lệ")
    user.email_verified = True
    user.verification_token = None
    db.commit()
    db.refresh(user)
    return user


def request_password_reset(db: Session, username: str) -> None:
    username = _normalize_username(username)
    user = db.query(User).filter(User.username == username).first()
    if not user or not user.email:
        return
    token = generate_token()
    user.reset_token = token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    db.commit()
    send_password_reset_email(user.email, user.full_name or username, token)


def reset_password(db: Session, token: str, new_password: str) -> None:
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Mật khẩu tối thiểu 8 ký tự")
    user = db.query(User).filter(User.reset_token == token).first()
    if not user or not user.reset_token_expires:
        raise HTTPException(status_code=400, detail="Token không hợp lệ")
    if user.reset_token_expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token đã hết hạn")
    user.password_hash = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
