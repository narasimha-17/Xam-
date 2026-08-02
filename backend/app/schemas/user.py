from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from app.models.user import UserRole


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone_number: str
    location: str
    institution: str

    @field_validator("full_name", "phone_number", "location", "institution")
    @classmethod
    def not_blank(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("This field is required")
        return stripped


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    phone_number: str | None
    location: str | None
    institution: str | None
    role: UserRole
    is_active: bool
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: str | None = None
    phone_number: str | None = None
    location: str | None = None
    institution: str | None = None
    current_password: str | None = None
    new_password: str | None = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserRoleUpdate(BaseModel):
    role: UserRole


class UserActiveUpdate(BaseModel):
    is_active: bool


class AdminResetPasswordOut(BaseModel):
    temporary_password: str


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str
