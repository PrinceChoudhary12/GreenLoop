"""User database model."""

from typing import List, TYPE_CHECKING
from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import BaseEntity
from backend.app.models.enums import UserRole

if TYPE_CHECKING:
    from backend.app.models.report import WasteReport


class User(BaseEntity):
    """User account entity for GreenLoop."""

    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False),
        default=UserRole.CITIZEN,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    reports: Mapped[List["WasteReport"]] = relationship(
        "WasteReport",
        foreign_keys="[WasteReport.user_id]",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="desc(WasteReport.created_at)",
    )
