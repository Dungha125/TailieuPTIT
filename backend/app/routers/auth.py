from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse
from app.services.rate_limit_service import rate_limit_service
from app.utils.client import get_client_ip
from app.utils.security import create_access_token, verify_password
from app.utils.turnstile import verify_turnstile

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    ip = get_client_ip(request)

    if rate_limit_service.is_banned(ip):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Too many failed attempts. Try again later.",
        )

    if not await verify_turnstile(payload.captcha_token, ip):
        rate_limit_service.log_security_event("captcha_fail", ip, payload.username)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Captcha verification failed",
        )

    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        rate_limit_service.record_login_failure(ip)
        rate_limit_service.log_security_event("login_fail", ip, payload.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    rate_limit_service.clear_login_failures(ip)
    rate_limit_service.log_security_event("login_success", ip, user.username)

    token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=timedelta(minutes=settings.jwt_expire_minutes),
    )
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
