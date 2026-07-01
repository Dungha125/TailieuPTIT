from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.constants.roles import PORTAL_ROLES
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    ProfileUpdateRequest,
    RefreshTokenRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserLoginRequest,
    UserResponse,
    VerifyEmailRequest,
)
from app.services.auth_service import (
    authenticate_admin,
    authenticate_user,
    issue_tokens,
    refresh_access_token,
    register_user,
    request_password_reset,
    reset_password,
    revoke_refresh_token,
    verify_email,
)
from app.services.rate_limit_service import rate_limit_service
from app.utils.client import get_client_ip
from app.utils.security import create_access_token, verify_password
from app.utils.turnstile import verify_turnstile

router = APIRouter(prefix="/auth", tags=["Auth"])


def _token_response(user: User) -> TokenResponse:
    access, refresh = issue_tokens(user)
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    ip = get_client_ip(request)
    if rate_limit_service.is_banned(ip):
        raise HTTPException(status_code=403, detail="Too many requests. Try again later.")
    if not await verify_turnstile(payload.captcha_token, ip):
        raise HTTPException(status_code=400, detail="Captcha verification failed")
    allowed, _ = rate_limit_service.check_sliding_window(f"register:{ip}", 3, 3600)
    if not allowed:
        raise HTTPException(status_code=429, detail="Quá nhiều lần đăng ký. Thử lại sau.")
    user = register_user(
        db, full_name=payload.full_name, username=payload.username, password=payload.password
    )
    return user


@router.post("/login", response_model=TokenResponse)
async def admin_login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    ip = get_client_ip(request)
    if rate_limit_service.is_banned(ip):
        raise HTTPException(status_code=403, detail="Too many failed attempts. Try again later.")
    if not await verify_turnstile(payload.captcha_token, ip):
        rate_limit_service.log_security_event("captcha_fail", ip, payload.username)
        raise HTTPException(status_code=400, detail="Captcha verification failed")

    user = authenticate_admin(db, payload.username, payload.password)
    if user.role not in PORTAL_ROLES:
        raise HTTPException(status_code=403, detail="Portal access required")

    rate_limit_service.clear_login_failures(ip)
    rate_limit_service.log_security_event("login_success", ip, user.username)
    token = create_access_token(
        data={"sub": str(user.id), "role": user.role},
        expires_delta=timedelta(minutes=settings.jwt_expire_minutes),
    )
    return TokenResponse(access_token=token)


@router.post("/login/user", response_model=TokenResponse)
async def user_login(payload: UserLoginRequest, request: Request, db: Session = Depends(get_db)):
    ip = get_client_ip(request)
    if rate_limit_service.is_banned(ip):
        raise HTTPException(status_code=403, detail="Too many failed attempts. Try again later.")
    if not await verify_turnstile(payload.captcha_token, ip):
        raise HTTPException(status_code=400, detail="Captcha verification failed")

    try:
        user = authenticate_user(db, payload.username, payload.password)
    except HTTPException:
        rate_limit_service.record_login_failure(ip)
        raise

    rate_limit_service.clear_login_failures(ip)
    return _token_response(user)


@router.post("/login/email", response_model=TokenResponse, deprecated=True)
async def user_login_legacy(payload: UserLoginRequest, request: Request, db: Session = Depends(get_db)):
    """Giữ tương thích — dùng /auth/login/user."""
    return await user_login(payload, request, db)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    access, refresh = refresh_access_token(db, payload.refresh_token)
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: LogoutRequest):
    if payload.refresh_token:
        revoke_refresh_token(payload.refresh_token)


@router.post("/verify-email", response_model=UserResponse)
def verify_email_endpoint(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    return verify_email(db, payload.token)


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
def forgot_password(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    ip = get_client_ip(request)
    allowed, _ = rate_limit_service.check_sliding_window(f"forgot:{ip}", 5, 3600)
    if not allowed:
        raise HTTPException(status_code=429, detail="Quá nhiều yêu cầu. Thử lại sau.")
    request_password_reset(db, payload.username)


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password_endpoint(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset_password(db, payload.token, payload.password)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip()
    db.commit()
    db.refresh(current_user)
    return current_user
