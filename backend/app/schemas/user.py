from pydantic import BaseModel, Field, field_validator

from app.constants.roles import ALLOWED_ROLES


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=6, max_length=200)
    role: str = Field(default="editor")

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        if value not in ALLOWED_ROLES:
            raise ValueError(f"role must be one of: {', '.join(ALLOWED_ROLES)}")
        return value


class UserUpdate(BaseModel):
    password: str | None = Field(default=None, min_length=6, max_length=200)
    role: str | None = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str | None) -> str | None:
        if value is not None and value not in ALLOWED_ROLES:
            raise ValueError(f"role must be one of: {', '.join(ALLOWED_ROLES)}")
        return value


class UserAdminResponse(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True
