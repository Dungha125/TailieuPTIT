from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.constants.roles import PORTAL_ROLES, ROLE_ADMIN
from app.database import get_db
from app.models.user import User
from app.utils.security import decode_access_token

security_scheme = HTTPBearer()


def _resolve_user(db: Session, sub: str) -> User | None:
    if sub.isdigit():
        user = db.query(User).filter(User.id == int(sub)).first()
        if user:
            return user
    return db.query(User).filter(User.username == sub).first()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = _resolve_user(db, str(sub))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None


def require_role(*roles: str):
    allowed = set(roles)

    def _checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return _checker


def require_portal_user(user: User = Depends(get_current_user)) -> User:
    if user.role not in PORTAL_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Portal access required")
    return user


def require_editor_or_admin(user: User = Depends(require_portal_user)) -> User:
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != ROLE_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


def require_verified_user(user: User = Depends(get_current_user)) -> User:
    if not user.email_verified and user.role not in PORTAL_ROLES:
        raise HTTPException(status_code=403, detail="Email chưa được xác thực")
    return user
