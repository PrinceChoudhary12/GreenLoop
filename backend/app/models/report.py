"""Waste report database model."""

from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import BaseEntity
from backend.app.models.enums import ReportPriority, ReportStatus, WasteCategory

if TYPE_CHECKING:
    from backend.app.models.pickup import Pickup
    from backend.app.models.user import User


class WasteReport(BaseEntity):
    """Waste report submitted by a citizen."""

    __tablename__ = "waste_reports"

    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    category: Mapped[WasteCategory] = mapped_column(
        Enum(WasteCategory, native_enum=False),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    image_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus, native_enum=False),
        default=ReportStatus.SUBMITTED,
        nullable=False,
    )
    priority: Mapped[ReportPriority] = mapped_column(
        Enum(ReportPriority, native_enum=False),
        default=ReportPriority.MEDIUM,
        nullable=False,
    )

    collector_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], back_populates="reports")
    collector: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[collector_id],
    )
    pickups: Mapped[List["Pickup"]] = relationship(
        "Pickup",
        foreign_keys="[Pickup.report_id]",
        back_populates="report",
        cascade="all, delete-orphan",
        order_by="desc(Pickup.created_at)",
    )
