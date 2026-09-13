"""Enumerations for GreenLoop domain models."""

import enum


class UserRole(str, enum.Enum):
    """User authorization roles."""
    CITIZEN = "CITIZEN"
    COLLECTOR = "COLLECTOR"
    ADMIN = "ADMIN"


class WasteCategory(str, enum.Enum):
    """Controlled waste classification categories."""
    GENERAL = "GENERAL"
    PLASTIC = "PLASTIC"
    PAPER = "PAPER"
    GLASS = "GLASS"
    METAL = "METAL"
    E_WASTE = "E_WASTE"
    ORGANIC = "ORGANIC"
    HAZARDOUS = "HAZARDOUS"
    OTHER = "OTHER"


class ReportStatus(str, enum.Enum):
    """Controlled waste report lifecycle statuses."""
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    RESOLVED = "RESOLVED"


class ReportPriority(str, enum.Enum):
    """Priority levels for waste collection dispatch."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class PickupStatus(str, enum.Enum):
    """Controlled waste pickup lifecycle statuses."""
    REQUESTED = "REQUESTED"
    SCHEDULED = "SCHEDULED"
    ASSIGNED = "ASSIGNED"
    ACCEPTED = "ACCEPTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
