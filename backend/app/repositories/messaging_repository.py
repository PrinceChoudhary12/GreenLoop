"""Repository for messaging database operations."""

from datetime import datetime
from typing import List, Optional, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.models.messaging import Conversation, ConversationParticipant, Message
from backend.app.models.user import User


class MessagingRepository:
    """Encapsulates data access logic for conversations, participants, and messages."""

    @staticmethod
    def is_participant(db: Session, conversation_id: int, user_id: int) -> bool:
        """Check whether a user is a participant in the given conversation."""
        return (
            db.query(ConversationParticipant)
            .filter(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.user_id == user_id,
            )
            .first()
            is not None
        )

    @staticmethod
    def get_user_conversations(db: Session, user_id: int) -> List[Conversation]:
        """Fetch all conversations for a specific user ordered by last updated."""
        subquery = (
            db.query(ConversationParticipant.conversation_id)
            .filter(ConversationParticipant.user_id == user_id)
            .scalar_subquery()
        )
        return (
            db.query(Conversation)
            .filter(Conversation.id.in_(subquery))
            .order_by(Conversation.updated_at.desc())
            .all()
        )

    @staticmethod
    def get_conversation_by_id(db: Session, conversation_id: int) -> Optional[Conversation]:
        """Retrieve a conversation by its primary ID."""
        return db.query(Conversation).filter(Conversation.id == conversation_id).first()

    @staticmethod
    def find_existing_direct_conversation(
        db: Session,
        user1_id: int,
        user2_id: int,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
    ) -> Optional[Conversation]:
        """Find an existing conversation between two users with matching entity filter if provided."""
        # Find conversation IDs where user1 is participant
        c1_ids = [
            cp.conversation_id
            for cp in db.query(ConversationParticipant.conversation_id)
            .filter(ConversationParticipant.user_id == user1_id)
            .all()
        ]
        if not c1_ids:
            return None

        # Filter those IDs where user2 is also a participant
        query = (
            db.query(Conversation)
            .join(ConversationParticipant)
            .filter(
                Conversation.id.in_(c1_ids),
                ConversationParticipant.user_id == user2_id,
            )
        )

        if entity_type and entity_id:
            query = query.filter(
                Conversation.entity_type == entity_type,
                Conversation.entity_id == entity_id,
            )

        return query.first()

    @staticmethod
    def create_conversation(
        db: Session,
        participant_user_ids: List[int],
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        title: Optional[str] = None,
    ) -> Conversation:
        """Create a new conversation and attach participants."""
        now = datetime.utcnow()
        conv = Conversation(
            entity_type=entity_type,
            entity_id=entity_id,
            title=title,
            created_at=now,
            updated_at=now,
        )
        db.add(conv)
        db.flush()

        for u_id in set(participant_user_ids):
            part = ConversationParticipant(
                conversation_id=conv.id,
                user_id=u_id,
                joined_at=now,
                last_read_at=now,
            )
            db.add(part)

        db.commit()
        db.refresh(conv)
        return conv

    @staticmethod
    def get_conversation_messages(
        db: Session, conversation_id: int, skip: int = 0, limit: int = 50
    ) -> Tuple[List[Message], int]:
        """Retrieve paginated messages for a conversation, ordered chronologically."""
        query = db.query(Message).filter(Message.conversation_id == conversation_id)
        total = query.count()
        messages = query.order_by(Message.created_at.asc()).offset(skip).limit(limit).all()
        return messages, total

    @staticmethod
    def add_message(db: Session, conversation_id: int, sender_id: int, body: str) -> Message:
        """Add a new text message to a conversation and update conversation timestamp."""
        now = datetime.utcnow()
        msg = Message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            body=body,
            is_read=False,
            created_at=now,
        )
        db.add(msg)

        # Update conversation updated_at
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conv:
            conv.updated_at = now

        db.commit()
        db.refresh(msg)
        return msg

    @staticmethod
    def mark_as_read(db: Session, conversation_id: int, user_id: int) -> int:
        """Mark unread messages in conversation as read for the user and update participant last_read_at."""
        now = datetime.utcnow()
        part = (
            db.query(ConversationParticipant)
            .filter(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.user_id == user_id,
            )
            .first()
        )
        if part:
            part.last_read_at = now

        # Mark unread messages sent by others in this conversation as read
        updated_rows = (
            db.query(Message)
            .filter(
                Message.conversation_id == conversation_id,
                Message.sender_id != user_id,
                Message.is_read == False,  # noqa: E712
            )
            .update({Message.is_read: True}, synchronize_session=False)
        )
        db.commit()
        return updated_rows

    @staticmethod
    def get_unread_count_for_conversation(db: Session, conversation_id: int, user_id: int) -> int:
        """Get unread message count for a single user in a conversation."""
        return (
            db.query(Message)
            .filter(
                Message.conversation_id == conversation_id,
                Message.sender_id != user_id,
                Message.is_read == False,  # noqa: E712
            )
            .count()
        )

    @staticmethod
    def get_total_unread_messages_count(db: Session, user_id: int) -> int:
        """Get total count of unread messages for a user across all their conversations."""
        conv_ids = [
            cp.conversation_id
            for cp in db.query(ConversationParticipant.conversation_id)
            .filter(ConversationParticipant.user_id == user_id)
            .all()
        ]
        if not conv_ids:
            return 0

        return (
            db.query(Message)
            .filter(
                Message.conversation_id.in_(conv_ids),
                Message.sender_id != user_id,
                Message.is_read == False,  # noqa: E712
            )
            .count()
        )
