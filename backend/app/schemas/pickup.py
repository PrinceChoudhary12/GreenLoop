"""Pydantic schemas for waste pickup requests and scheduling."""

import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from backend.app.models.enums import PickupStatus, ReportPriority, ReportStatus, WasteCategory


class PickupCreatePayload(BaseModel):
    """Payload for citizen requesting a waste pickup."""
    report_id: int = Field(..., description="ID of the waste report to be collected")
    contact_phone: Optional[str] = Field(None, max_length=50, description="Contact phone number")
    notes: Optional[str] = Field(None, max_length=1000, description="Specific instructions for the collector")
    preferred_date: Optional[datetime.date] = Field(None, description="Preferred pickup date")
    preferred_time_slot: Optional[str] = Field(None, max_length=100, description="Preferred time slot")


class PickupSchedulePayload(BaseModel):
    """Payload for administrator scheduling a pickup."""
    scheduled_date: datetime.date = Field(..., description="Scheduled date for waste pickup")
    time_slot: str = Field(..., min_length=3, max_length=100, description="Time slot window for pickup")
    collector_id: Optional[int] = Field(None, description="Optional collector ID for immediate assignment")
    notes: Optional[str] = Field(None, max_length=1000, description="Administrative scheduling notes")


class PickupAssignPayload(BaseModel):
    """Payload for assigning or reassigning a collector."""
    collector_id: int = Field(..., description="ID of the active collector to assign")


class PickupCancelPayload(BaseModel):
    """Payload for cancelling a pickup request."""
    cancellation_reason: str = Field(..., min_length=3, max_length=255, description="Reason for cancellation")


class PickupReportSummary(BaseModel):
    """Embedded report summary in pickup response."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: WasteCategory
    description: str
    location: str
    priority: ReportPriority
    status: ReportStatus
    image_path: Optional[str] = None


class PickupUserSummary(BaseModel):
    """Embedded user summary in pickup response."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str


class PickupResponse(BaseModel):
    """Complete pickup response model."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    report_id: int
    user_id: int
    collector_id: Optional[int] = None
    status: PickupStatus
    scheduled_date: Optional[datetime.datetime] = None
    time_slot: Optional[str] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None
    cancellation_reason: Optional[str] = None
    cancelled_by_id: Optional[int] = None
    completed_at: Optional[datetime.datetime] = None
    cancelled_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    report: Optional[PickupReportSummary] = None
    user: Optional[PickupUserSummary] = None
    collector: Optional[PickupUserSummary] = None
    cancelled_by: Optional[PickupUserSummary] = None
