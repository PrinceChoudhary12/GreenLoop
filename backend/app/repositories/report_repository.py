"""WasteReport repository for database persistence."""

from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

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
