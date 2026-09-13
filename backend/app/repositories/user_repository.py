"""User repository for database persistence."""

from typing import Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.models.enums import UserRole
from backend.app.models.user import User
from backend.app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Data access repository for User entities."""

    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_email(self, email: str) -> Optional[User]:
        """Fetch a user by unique lowercase email."""
        stmt = select(User).where(User.email == email.strip().lower())
        return self.db.scalars(stmt).first()

    def get_all(
        self,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[User]:
        """Fetch paginated users filtered by role, active status, or search term."""
        stmt = select(User).order_by(User.created_at.desc())
        if role is not None:
            stmt = stmt.where(User.role == role)
        if is_active is not None:
            stmt = stmt.where(User.is_active == is_active)
        if search:
            term = f"%{search.strip()}%"
            stmt = stmt.where((User.name.ilike(term)) | (User.email.ilike(term)))
        stmt = stmt.offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def count_users(
        self,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
    ) -> int:
        """Count users matching optional role and active status criteria."""
        stmt = select(func.count(User.id))
        if role is not None:
            stmt = stmt.where(User.role == role)
        if is_active is not None:
            stmt = stmt.where(User.is_active == is_active)
        return self.db.scalar(stmt) or 0

    def get_collectors(self, active_only: bool = True) -> list[User]:
        """Fetch all collectors for task assignment lookup."""
        stmt = select(User).where(User.role == UserRole.COLLECTOR)
        if active_only:
            stmt = stmt.where(User.is_active == True)
        stmt = stmt.order_by(User.name.asc())
        return list(self.db.scalars(stmt).all())
