"""Notification database model."""

import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import BaseEntity
from backend.app.models.enums import NotificationType

if TYPE_CHECKING:
    from backend.app.models.user import User


class Notification(BaseEntity):
    """User-targeted in-app notification entity."""

    __tablename__ = "notifications"

    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    actor_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, native_enum=False),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )
    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    entity_type: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        index=True,
    )
    entity_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        index=True,
    )
    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        index=True,
        nullable=False,
    )
    read_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    actor: Mapped[Optional["User"]] = relationship("User", foreign_keys=[actor_id])
