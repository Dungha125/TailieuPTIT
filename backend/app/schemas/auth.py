from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=200)
    captcha_token: str | None = None


class UserLoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=200)
    captcha_token: str | None = None


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=200)
    username: str = Field(..., min_length=4, max_length=100)
    password: str = Field(..., min_length=8, max_length=200)
    confirm_password: str = Field(..., min_length=8, max_length=200)
    captcha_token: str | None = None

    @model_validator(mode="after")
    def check_passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Mật khẩu xác nhận không khớp")
        return self


class ForgotPasswordRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10)
    password: str = Field(..., min_length=8, max_length=200)
    confirm_password: str = Field(..., min_length=8, max_length=200)

    @model_validator(mode="after")
    def check_passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Mật khẩu xác nhận không khớp")
        return self


class VerifyEmailRequest(BaseModel):
    token: str = Field(..., min_length=10)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=200)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    username: str
    email: str | None = None
    full_name: str | None = None
    role: str
    email_verified: bool = False

    class Config:
        from_attributes = True
