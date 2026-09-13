"""Activity log database model."""

from typing import Optional, TYPE_CHECKING
from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import BaseEntity
from backend.app.models.enums import ActivityAction

if TYPE_CHECKING:
    from backend.app.models.user import User


class ActivityLog(BaseEntity):
    """System-wide immutable activity audit log entity."""

    __tablename__ = "activity_logs"

    actor_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    action: Mapped[ActivityAction] = mapped_column(
        Enum(ActivityAction, native_enum=False),
        index=True,
        nullable=False,
    )
    entity_type: Mapped[str] = mapped_column(
        String(50),
        index=True,
        nullable=False,
    )
    entity_id: Mapped[int] = mapped_column(
        Integer,
        index=True,
        nullable=False,
    )
    target_user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    details: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Relationships
    actor: Mapped[Optional["User"]] = relationship("User", foreign_keys=[actor_id])
    target_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[target_user_id])
