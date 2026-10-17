"""Database base metadata registry for migrations and initialization."""

from backend.app.models.activity import ActivityLog
from backend.app.models.base import Base
from backend.app.models.location import UserLocation
from backend.app.models.messaging import Conversation, ConversationParticipant, Message
from backend.app.models.notification import Notification
from backend.app.models.pickup import Pickup
from backend.app.models.recycling_center import RecyclingCenter
from backend.app.models.report import WasteReport
from backend.app.models.user import User

__all__ = [
    "Base",
    "User",
    "WasteReport",
    "Pickup",
    "Notification",
    "ActivityLog",
    "Conversation",
    "ConversationParticipant",
    "Message",
    "UserLocation",
    "RecyclingCenter",
]
