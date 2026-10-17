"""Repository for database search queries across waste reports and pickup tasks."""

from typing import List
from sqlalchemy import String, cast, or_
from sqlalchemy.orm import Session, joinedload

from backend.app.models.enums import UserRole
from backend.app.models.pickup import Pickup
from backend.app.models.report import WasteReport
from backend.app.models.user import User


class SearchRepository:
    """Repository handling role-scoped parameterized searches."""

    @staticmethod
    def search_reports(db: Session, user: User, query: str, limit: int = 10) -> List[WasteReport]:
        """Search waste reports with strict role authorization."""
        clean_query = query.strip()
        if not clean_query:
            return []

        search_pattern = f"%{clean_query}%"

        # Base filters: title/description, location, category enum string, or numeric ID match
        filters = [
            WasteReport.description.ilike(search_pattern),
            WasteReport.location.ilike(search_pattern),
            cast(WasteReport.category, String).ilike(search_pattern),
            cast(WasteReport.status, String).ilike(search_pattern),
        ]

        if clean_query.isdigit():
            filters.append(WasteReport.id == int(clean_query))

        stmt = db.query(WasteReport).filter(or_(*filters))

        # Role-based authorization scoping
        if user.role == UserRole.CITIZEN:
            stmt = stmt.filter(WasteReport.user_id == user.id)
        elif user.role == UserRole.COLLECTOR:
            stmt = stmt.filter(
                or_(
                    WasteReport.collector_id == user.id,
                    WasteReport.collector_id.is_(None),
                )
            )

        return stmt.order_by(WasteReport.updated_at.desc()).limit(limit).all()

    @staticmethod
    def search_pickups(db: Session, user: User, query: str, limit: int = 10) -> List[Pickup]:
        """Search pickup requests with strict role authorization."""
        clean_query = query.strip()
        if not clean_query:
            return []

        search_pattern = f"%{clean_query}%"

        filters = [
            Pickup.notes.ilike(search_pattern),
            Pickup.time_slot.ilike(search_pattern),
            Pickup.contact_phone.ilike(search_pattern),
            cast(Pickup.status, String).ilike(search_pattern),
            Pickup.report.has(WasteReport.location.ilike(search_pattern)),
            Pickup.report.has(WasteReport.description.ilike(search_pattern)),
        ]

        if clean_query.isdigit():
            filters.append(Pickup.id == int(clean_query))

        stmt = db.query(Pickup).options(joinedload(Pickup.report)).filter(or_(*filters))

        # Role-based authorization scoping
        if user.role == UserRole.CITIZEN:
            stmt = stmt.filter(Pickup.user_id == user.id)
        elif user.role == UserRole.COLLECTOR:
            stmt = stmt.filter(
                or_(
                    Pickup.collector_id == user.id,
                    Pickup.collector_id.is_(None),
                )
            )

        return stmt.order_by(Pickup.updated_at.desc()).limit(limit).all()
