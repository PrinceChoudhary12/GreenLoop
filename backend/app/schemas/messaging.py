"""Pydantic schemas for messaging endpoints."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    """Schema for sending a new text message."""

    body: str = Field(..., min_length=1, max_length=2000, description="Message text content")


class MessageResponse(BaseModel):
    """Schema for a single message item."""

    id: int
    conversation_id: int
    sender_id: int
    sender_name: str
    sender_role: str
    body: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class MessageListResponse(BaseModel):
    """Paginated list of messages within a conversation."""

    items: List[MessageResponse]
    total: int
    skip: int
    limit: int
    has_more: bool


class ParticipantResponse(BaseModel):
    """Participant user summary in a conversation."""

    user_id: int
    name: str
    role: str
    email: str
    last_read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ConversationCreate(BaseModel):
    """Payload to initiate or retrieve a direct conversation."""

    recipient_id: int = Field(..., description="Target recipient user ID")
    entity_type: Optional[str] = Field(default=None, description="'report', 'pickup', or 'direct'")
    entity_id: Optional[int] = Field(default=None, description="Related entity ID")
    title: Optional[str] = Field(default=None, max_length=200, description="Optional subject title")
    initial_message: Optional[str] = Field(default=None, max_length=2000, description="Optional first message")


class ConversationSummary(BaseModel):
    """Summary of a conversation for list view."""

    id: int
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    title: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    participants: List[ParticipantResponse]
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0

    class Config:
        from_attributes = True


class ConversationListResponse(BaseModel):
    """Response containing list of user conversations."""

    items: List[ConversationSummary]
    total: int
    total_unread_messages: int


class UnreadMessageCountResponse(BaseModel):
    """Total unread message count across all conversations."""

    unread_count: int
