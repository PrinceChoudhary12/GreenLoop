"""Waste pickup database model."""

import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import BaseEntity
from backend.app.models.enums import PickupStatus

if TYPE_CHECKING:
    from backend.app.models.report import WasteReport
    from backend.app.models.user import User


class Pickup(BaseEntity):
    """Waste pickup request and scheduling entity."""

    __tablename__ = "pickups"

    report_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("waste_reports.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    collector_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    status: Mapped[PickupStatus] = mapped_column(
        Enum(PickupStatus, native_enum=False),
        default=PickupStatus.REQUESTED,
        nullable=False,
        index=True,
    )
    scheduled_date: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    time_slot: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    contact_phone: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    cancellation_reason: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    cancelled_by_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    completed_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    cancelled_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    report: Mapped["WasteReport"] = relationship("WasteReport", foreign_keys=[report_id], back_populates="pickups")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    collector: Mapped[Optional["User"]] = relationship("User", foreign_keys=[collector_id])
    cancelled_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[cancelled_by_id])
