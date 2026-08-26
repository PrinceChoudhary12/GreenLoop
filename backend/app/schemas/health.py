"""Schemas for health check endpoints."""

from typing import Dict, Optional
from pydantic import BaseModel, Field


class ServiceComponentHealth(BaseModel):
    """Health status of an individual dependency/subsystem."""

    status: str = Field(..., description="Component status: healthy, degraded, or unhealthy")
    details: Optional[str] = Field(None, description="Optional diagnostic or latency notes")


class HealthResponse(BaseModel):
    """Overall application health check response."""

    status: str = Field(..., description="Overall status: healthy, degraded, or unhealthy")
    app_name: str = Field(..., description="Application name")
    version: str = Field(..., description="Application semantic version")
    environment: str = Field(..., description="Current deployment environment")
    components: Dict[str, ServiceComponentHealth] = Field(
        default_factory=dict, description="Detailed component health statuses"
    )
