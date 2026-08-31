"""User schemas and request/response models."""

import datetime
import re
from pydantic import BaseModel, ConfigDict, Field, field_validator
from backend.app.models.enums import UserRole


class UserRegister(BaseModel):
    """Citizen registration payload."""

    name: str = Field(..., min_length=2, max_length=100, description="Full name")
    email: str = Field(..., max_length=255, description="Valid email address")
    password: str = Field(..., min_length=8, max_length=128, description="Password (min 8 characters)")
    password_confirm: str = Field(..., min_length=8, max_length=128, description="Password confirmation")

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        name = v.strip()
        if not name:
            raise ValueError("Name cannot be empty or whitespace only")
        return name

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        email = v.strip().lower()
        # Basic RFC-5322 compatible email validation
        email_regex = r"^[\w\.\+\-]+@([\w\-]+\.)+[a-zA-Z]{2,}$"
        if not re.match(email_regex, email):
            raise ValueError("Please provide a valid email address")
        return email

    @field_validator("password_confirm")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v


class UserLogin(BaseModel):
    """User login credentials payload."""

    email: str = Field(..., description="Registered email address")
    password: str = Field(..., description="Password")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class UserResponse(BaseModel):
    """Public user profile response."""

    id: int
    name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    """Authentication token response with user profile."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse
