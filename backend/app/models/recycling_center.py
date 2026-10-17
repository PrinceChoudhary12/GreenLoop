"""Recycling center database model."""

from typing import Optional
from sqlalchemy import Boolean, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import BaseEntity


class RecyclingCenter(BaseEntity):
    """A physical recycling center that accepts waste for processing."""

    __tablename__ = "recycling_centers"

    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(254), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    # Accepted categories stored as comma-separated string, e.g. "PLASTIC,GLASS,METAL"
    accepted_categories: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    opening_hours: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
