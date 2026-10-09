"""Direct messaging API endpoints for authenticated users."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.core.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.messaging import (
    ConversationCreate,
    ConversationListResponse,
    ConversationSummary,
    MessageCreate,
    MessageListResponse,
    MessageResponse,
    UnreadMessageCountResponse,
)
from backend.app.services.messaging_service import MessagingService

router = APIRouter(prefix="/messaging", tags=["Direct Messaging"])


@router.get(
    "/conversations",
    response_model=ConversationListResponse,
    status_code=status.HTTP_200_OK,
    summary="List User Conversations",
    description="Retrieve all direct conversations for the authenticated user.",
)
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationListResponse:
    """List conversations for current user."""
    return MessagingService.list_user_conversations(db=db, current_user=current_user)


@router.post(
    "/conversations",
    response_model=ConversationSummary,
    status_code=status.HTTP_201_CREATED,
    summary="Initiate or Retrieve Conversation",
    description="Start a direct conversation with a recipient user based on role messaging rules.",
)
def create_conversation(
    payload: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationSummary:
    """Initiate a conversation with recipient user."""
    return MessagingService.get_or_create_conversation(db=db, current_user=current_user, data=payload)


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=MessageListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Conversation Message History",
    description="Fetch paginated message history for an authorized conversation thread.",
)
def get_messages(
    conversation_id: int,
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=50, ge=1, le=100, description="Pagination limit (max 100)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageListResponse:
    """Get message history for conversation."""
    return MessagingService.get_conversation_messages(
        db=db, current_user=current_user, conversation_id=conversation_id, skip=skip, limit=limit
    )


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send Message to Conversation",
    description="Send a text message in an authorized conversation thread.",
)
def send_message(
    conversation_id: int,
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Send text message."""
    return MessagingService.send_message(
        db=db, current_user=current_user, conversation_id=conversation_id, body=payload.body
    )


@router.post(
    "/conversations/{conversation_id}/read",
    status_code=status.HTTP_200_OK,
    summary="Mark Conversation as Read",
    description="Mark all unread messages in conversation as read.",
)
def mark_conversation_read(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Mark conversation messages as read."""
    return MessagingService.mark_conversation_read(
        db=db, current_user=current_user, conversation_id=conversation_id
    )


@router.get(
    "/unread-count",
    response_model=UnreadMessageCountResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Total Unread Messages Count",
    description="Retrieve unread message count across all conversations.",
)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UnreadMessageCountResponse:
    """Get unread message count."""
    return MessagingService.get_unread_count(db=db, current_user=current_user)
