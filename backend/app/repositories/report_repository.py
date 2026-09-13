from typing import List, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.models.enums import ReportPriority, ReportStatus, WasteCategory
from backend.app.models.report import WasteReport
from backend.app.repositories.base import BaseRepository


class ReportRepository(BaseRepository[WasteReport]):
    """Data access repository for WasteReport entities."""

    def __init__(self, db: Session):
        super().__init__(WasteReport, db)

    def get_by_user_id(self, user_id: int, skip: int = 0, limit: int = 100) -> List[WasteReport]:
        """Fetch all reports submitted by a specific citizen, newest first."""
        stmt = (
            select(WasteReport)
            .where(WasteReport.user_id == user_id)
            .order_by(WasteReport.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def get_by_id_and_user(self, report_id: int, user_id: int) -> Optional[WasteReport]:
        """Fetch a report by ID while strictly enforcing citizen ownership."""
        stmt = select(WasteReport).where(
            WasteReport.id == report_id,
            WasteReport.user_id == user_id,
        )
        return self.db.scalars(stmt).first()

    def get_available_reports(self, skip: int = 0, limit: int = 100) -> List[WasteReport]:
        """Fetch unassigned submitted reports for collectors, ordered by priority and date."""
        stmt = (
            select(WasteReport)
            .where(
                WasteReport.collector_id.is_(None),
                WasteReport.status.in_(["SUBMITTED", "UNDER_REVIEW"]),
            )
            .order_by(WasteReport.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def get_by_collector_id(self, collector_id: int, skip: int = 0, limit: int = 100) -> List[WasteReport]:
        """Fetch all reports claimed by or assigned to a specific collector."""
        stmt = (
            select(WasteReport)
            .where(WasteReport.collector_id == collector_id)
            .order_by(WasteReport.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def get_all_reports(
        self,
        status: Optional[ReportStatus] = None,
        category: Optional[WasteCategory] = None,
        priority: Optional[ReportPriority] = None,
        collector_id: Optional[int] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[WasteReport]:
        """Fetch all reports across all users with optional filtering."""
        stmt = select(WasteReport).order_by(WasteReport.created_at.desc())
        if status is not None:
            stmt = stmt.where(WasteReport.status == status)
        if category is not None:
            stmt = stmt.where(WasteReport.category == category)
        if priority is not None:
            stmt = stmt.where(WasteReport.priority == priority)
        if collector_id is not None:
            stmt = stmt.where(WasteReport.collector_id == collector_id)
        if search:
            term = f"%{search.strip()}%"
            stmt = stmt.where((WasteReport.description.ilike(term)) | (WasteReport.location.ilike(term)))
        stmt = stmt.offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def count_reports(
        self,
        status: Optional[ReportStatus] = None,
    ) -> int:
        """Count total reports matching optional status."""
        stmt = select(func.count(WasteReport.id))
        if status is not None:
            stmt = stmt.where(WasteReport.status == status)
        return self.db.scalar(stmt) or 0
