"""Waste report schemas and request/response models."""

import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from backend.app.models.enums import ReportPriority, ReportStatus, WasteCategory


class WasteReportCreate(BaseModel):
    """Payload for submitting a new waste report."""

    category: WasteCategory = Field(..., description="Waste category")
    description: str = Field(..., min_length=5, max_length=2000, description="Description of the waste")
    location: str = Field(..., min_length=3, max_length=255, description="Human-readable location description")
    priority: ReportPriority = Field(default=ReportPriority.MEDIUM, description="Suggested collection priority")

    @field_validator("description", "location")
    @classmethod
    def sanitize_strings(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Field cannot be empty or whitespace only")
        return trimmed


class WasteReportResponse(BaseModel):
    """Detailed waste report response."""

    id: int
    user_id: int
    category: WasteCategory
    description: str
    location: str
    image_path: Optional[str] = None
    status: ReportStatus
    priority: ReportPriority
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class WasteReportSummary(BaseModel):
    """Summary representation for reports list."""

    id: int
    category: WasteCategory
    description: str
    location: str
    image_path: Optional[str] = None
    status: ReportStatus
    priority: ReportPriority
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
