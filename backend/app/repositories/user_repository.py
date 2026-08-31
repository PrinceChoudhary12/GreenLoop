"""User repository for database persistence."""

from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

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
