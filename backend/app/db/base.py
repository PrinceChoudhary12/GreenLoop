"""Database base metadata registry for migrations and initialization."""

from backend.app.models.base import Base
from backend.app.models.report import WasteReport
from backend.app.models.user import User

__all__ = ["Base", "User", "WasteReport"]
