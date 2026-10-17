"""SQLAlchemy models for user location tracking and geospatial metadata."""

from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, Float, ForeignKey, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import BaseEntity


class UserLocation(BaseEntity):
    """Stores user location consent state and last known GPS coordinates."""

    __tablename__ = "user_locations"

    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_sharing_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationship
    user = relationship("User")
