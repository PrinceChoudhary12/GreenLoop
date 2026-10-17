"""Service layer for messaging business logic and authorization enforcement."""

from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.models.user import User
from backend.app.models.enums import UserRole
from backend.app.repositories.messaging_repository import MessagingRepository
from backend.app.schemas.messaging import (
    ConversationCreate,
    ConversationListResponse,
    ConversationSummary,
    MessageListResponse,
    MessageResponse,
    ParticipantResponse,
    UnreadMessageCountResponse,
)
from backend.app.services.notification_service import NotificationService


class MessagingService:
    """Service handling conversation initiation, messaging permissions, and notifications."""

    @staticmethod
    def validate_conversation_permission(current_user: User, recipient: User) -> None:
        """Enforce strict role-based messaging policies."""
        if current_user.id == recipient.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot start a conversation with yourself.",
            )

        if not recipient.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target recipient user account is inactive.",
            )

        # ADMIN can contact anyone
        if current_user.role == UserRole.ADMIN:
            return

        # CITIZEN can contact COLLECTOR or ADMIN
        if current_user.role == UserRole.CITIZEN:
            if recipient.role not in (UserRole.COLLECTOR, UserRole.ADMIN):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Citizens can only contact Collectors or Administrators.",
                )
            return

        # COLLECTOR can contact CITIZEN or ADMIN
        if current_user.role == UserRole.COLLECTOR:
            if recipient.role not in (UserRole.CITIZEN, UserRole.ADMIN):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Collectors can only contact Citizens or Administrators.",
                )
            return

    @staticmethod
    def list_user_conversations(db: Session, current_user: User) -> ConversationListResponse:
        """List all conversations where current_user is a participant."""
        conversations = MessagingRepository.get_user_conversations(db=db, user_id=current_user.id)

        summaries: List[ConversationSummary] = []
        total_unread_all = 0

        for conv in conversations:
            part_responses: List[ParticipantResponse] = []
            for p in conv.participants:
                part_responses.append(
                    ParticipantResponse(
                        user_id=p.user.id,
                        name=p.user.name,
                        role=p.user.role.value if hasattr(p.user.role, 'value') else str(p.user.role),
                        email=p.user.email,
                        last_read_at=p.last_read_at,
                    )
                )

            # Last message
            messages, _ = MessagingRepository.get_conversation_messages(
                db=db, conversation_id=conv.id, skip=0, limit=1
            )
            last_msg_resp: Optional[MessageResponse] = None
            if conv.messages:
                last_msg = conv.messages[-1]
                last_msg_resp = MessageResponse(
                    id=last_msg.id,
                    conversation_id=last_msg.conversation_id,
                    sender_id=last_msg.sender_id,
                    sender_name=last_msg.sender.name if last_msg.sender else "Unknown",
                    sender_role=last_msg.sender.role.value if last_msg.sender and hasattr(last_msg.sender.role, 'value') else "USER",
                    body=last_msg.body,
                    is_read=last_msg.is_read,
                    created_at=last_msg.created_at,
                )

            conv_unread = MessagingRepository.get_unread_count_for_conversation(
                db=db, conversation_id=conv.id, user_id=current_user.id
            )
            total_unread_all += conv_unread

            summaries.append(
                ConversationSummary(
                    id=conv.id,
                    entity_type=conv.entity_type,
                    entity_id=conv.entity_id,
                    title=conv.title,
                    created_at=conv.created_at,
                    updated_at=conv.updated_at,
                    participants=part_responses,
                    last_message=last_msg_resp,
                    unread_count=conv_unread,
                )
            )

        return ConversationListResponse(
            items=summaries,
            total=len(summaries),
            total_unread_messages=total_unread_all,
        )

    @staticmethod
    def get_or_create_conversation(
        db: Session, current_user: User, data: ConversationCreate
    ) -> ConversationSummary:
        """Find an existing direct conversation or create a new one with authorization checks."""
        recipient = db.query(User).filter(User.id == data.recipient_id).first()
        if not recipient:
            raise HTTPException(
                status_code=status.HTTP_440_NOT_FOUND if hasattr(status, 'HTTP_440_NOT_FOUND') else status.HTTP_404_NOT_FOUND,
                detail="Recipient user not found.",
            )

        MessagingService.validate_conversation_permission(current_user=current_user, recipient=recipient)

        # Check existing conversation
        existing = MessagingRepository.find_existing_direct_conversation(
            db=db,
            user1_id=current_user.id,
            user2_id=recipient.id,
            entity_type=data.entity_type,
            entity_id=data.entity_id,
        )

        conv = existing
        if not conv:
            title = data.title or f"Chat with {recipient.name}"
            conv = MessagingRepository.create_conversation(
                db=db,
                participant_user_ids=[current_user.id, recipient.id],
                entity_type=data.entity_type,
                entity_id=data.entity_id,
                title=title,
            )

        # Send initial message if provided
        if data.initial_message and data.initial_message.strip():
            MessagingService.send_message(
                db=db,
                current_user=current_user,
                conversation_id=conv.id,
                body=data.initial_message.strip(),
            )

        # Re-fetch formatted summary
        convs = MessagingService.list_user_conversations(db=db, current_user=current_user)
        for s in convs.items:
            if s.id == conv.id:
                return s

        # Fallback return
        part_responses = [
            ParticipantResponse(
                user_id=p.user.id,
                name=p.user.name,
                role=p.user.role.value if hasattr(p.user.role, 'value') else str(p.user.role),
                email=p.user.email,
                last_read_at=p.last_read_at,
            )
            for p in conv.participants
        ]
        return ConversationSummary(
            id=conv.id,
            entity_type=conv.entity_type,
            entity_id=conv.entity_id,
            title=conv.title,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            participants=part_responses,
            last_message=None,
            unread_count=0,
        )

    @staticmethod
    def get_conversation_messages(
        db: Session, current_user: User, conversation_id: int, skip: int = 0, limit: int = 50
    ) -> MessageListResponse:
        """Fetch paginated message history for a conversation after verifying participant access."""
        if not MessagingRepository.is_participant(db=db, conversation_id=conversation_id, user_id=current_user.id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied.",
            )

        # Mark read for current user
        MessagingRepository.mark_as_read(db=db, conversation_id=conversation_id, user_id=current_user.id)

        messages, total = MessagingRepository.get_conversation_messages(
            db=db, conversation_id=conversation_id, skip=skip, limit=limit
        )

        msg_items: List[MessageResponse] = []
        for m in messages:
            msg_items.append(
                MessageResponse(
                    id=m.id,
                    conversation_id=m.conversation_id,
                    sender_id=m.sender_id,
                    sender_name=m.sender.name if m.sender else "Unknown",
                    sender_role=m.sender.role.value if m.sender and hasattr(m.sender.role, 'value') else "USER",
                    body=m.body,
                    is_read=m.is_read,
                    created_at=m.created_at,
                )
            )

        return MessageListResponse(
            items=msg_items,
            total=total,
            skip=skip,
            limit=limit,
            has_more=(skip + limit) < total,
        )

    @staticmethod
    def send_message(
        db: Session, current_user: User, conversation_id: int, body: str
    ) -> MessageResponse:
        """Send a message to an authorized conversation and trigger in-app notification for recipient(s)."""
        trimmed_body = body.strip()
        if not trimmed_body:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message body cannot be empty.",
            )

        conv = MessagingRepository.get_conversation_by_id(db=db, conversation_id=conversation_id)
        if not conv or not MessagingRepository.is_participant(db=db, conversation_id=conversation_id, user_id=current_user.id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied.",
            )

        # Add message
        msg = MessagingRepository.add_message(
            db=db, conversation_id=conversation_id, sender_id=current_user.id, body=trimmed_body
        )

        # Notify other participants
        for p in conv.participants:
            if p.user_id != current_user.id:
                try:
                    NotificationService.create_notification(
                        db=db,
                        user_id=p.user_id,
                        actor_id=current_user.id,
                        type="NEW_MESSAGE",
                        title=f"New Message from {current_user.name}",
                        message=f"{current_user.name}: {trimmed_body[:60]}{'...' if len(trimmed_body) > 60 else ''}",
                        entity_type="conversation",
                        entity_id=conversation_id,
                    )
                except Exception:
                    # Ignore notification failures to avoid failing the message send transaction
                    pass

        return MessageResponse(
            id=msg.id,
            conversation_id=msg.conversation_id,
            sender_id=msg.sender_id,
            sender_name=current_user.name,
            sender_role=current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role),
            body=msg.body,
            is_read=msg.is_read,
            created_at=msg.created_at,
        )

    @staticmethod
    def mark_conversation_read(db: Session, current_user: User, conversation_id: int) -> dict:
        """Mark all messages as read for participant in conversation."""
        if not MessagingRepository.is_participant(db=db, conversation_id=conversation_id, user_id=current_user.id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied.",
            )

        marked_count = MessagingRepository.mark_as_read(db=db, conversation_id=conversation_id, user_id=current_user.id)
        return {"success": True, "marked_count": marked_count}

    @staticmethod
    def get_unread_count(db: Session, current_user: User) -> UnreadMessageCountResponse:
        """Get total unread message count across all conversations."""
        count = MessagingRepository.get_total_unread_messages_count(db=db, user_id=current_user.id)
        return UnreadMessageCountResponse(unread_count=count)
