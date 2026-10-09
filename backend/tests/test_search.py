"""Pytest test suite for role-aware global search."""

import uuid
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.security import create_access_token, get_password_hash
from backend.app.models.enums import PickupStatus, ReportPriority, ReportStatus, UserRole, WasteCategory
from backend.app.models.pickup import Pickup
from backend.app.models.report import WasteReport
from backend.app.models.user import User


def _create_user(db: Session, role: UserRole, prefix: str = "user") -> tuple[User, str]:
    """Helper to create a user and valid JWT token."""
    unique_email = f"{prefix}_{uuid.uuid4().hex[:6]}@greenloop.local"
    user = User(
        name=f"{prefix.capitalize()} Test",
        email=unique_email,
        password_hash=get_password_hash("Password123!"),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(subject=str(user.id), role=role.value)
    return user, token


def test_search_requires_authentication(client: TestClient):
    """Verify global search returns 401 for unauthenticated requests."""
    res = client.get("/api/v1/search?q=plastic")
    assert res.status_code == 401


def test_search_short_query_returns_empty(client: TestClient, db_session: Session):
    """Verify queries under 2 characters return 0 results cleanly."""
    citizen, token = _create_user(db_session, UserRole.CITIZEN, "citizen_short")
    res = client.get("/api/v1/search?q=a", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["total_results"] == 0
    assert data["results"] == []


def test_search_citizen_role_isolation(client: TestClient, db_session: Session):
    """Verify citizen search returns only their own permitted reports and pickups."""
    citizen1, token1 = _create_user(db_session, UserRole.CITIZEN, "citizen1")
    citizen2, token2 = _create_user(db_session, UserRole.CITIZEN, "citizen2")

    report1 = WasteReport(
        user_id=citizen1.id,
        category=WasteCategory.PLASTIC,
        description="Citizen plastic bottle heap near library",
        location="Library Square",
        status=ReportStatus.SUBMITTED,
        priority=ReportPriority.MEDIUM,
    )
    report2 = WasteReport(
        user_id=citizen2.id,
        category=WasteCategory.PLASTIC,
        description="Other citizen plastic dumping",
        location="Park Avenue",
        status=ReportStatus.SUBMITTED,
        priority=ReportPriority.HIGH,
    )
    db_session.add_all([report1, report2])
    db_session.commit()
    db_session.refresh(report1)
    db_session.refresh(report2)

    # Citizen 1 searches for "plastic"
    res = client.get("/api/v1/search?q=plastic", headers={"Authorization": f"Bearer {token1}"})
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["total_results"] == 1
    assert data["results"][0]["entity_id"] == report1.id
    assert "Library Square" in data["results"][0]["subtitle"]


def test_search_admin_broad_visibility(client: TestClient, db_session: Session):
    """Verify admin role can discover matching operational reports across all users."""
    admin, adm_token = _create_user(db_session, UserRole.ADMIN, "admin_user")
    citizen1, _ = _create_user(db_session, UserRole.CITIZEN, "cit1")
    citizen2, _ = _create_user(db_session, UserRole.CITIZEN, "cit2")

    report1 = WasteReport(
        user_id=citizen1.id,
        category=WasteCategory.HAZARDOUS,
        description="Hazardous chemical spill site A",
        location="Industrial Park",
        status=ReportStatus.SUBMITTED,
        priority=ReportPriority.HIGH,
    )
    report2 = WasteReport(
        user_id=citizen2.id,
        category=WasteCategory.HAZARDOUS,
        description="Hazardous paint drums site B",
        location="Docklands",
        status=ReportStatus.SUBMITTED,
        priority=ReportPriority.HIGH,
    )
    db_session.add_all([report1, report2])
    db_session.commit()

    res = client.get("/api/v1/search?q=Hazardous", headers={"Authorization": f"Bearer {adm_token}"})
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["total_results"] >= 2
    entity_ids = [item["entity_id"] for item in data["results"]]
    assert report1.id in entity_ids
    assert report2.id in entity_ids


def test_search_pickups_matching(client: TestClient, db_session: Session):
    """Verify search matches pickup requests by notes and location."""
    citizen, token = _create_user(db_session, UserRole.CITIZEN, "pickup_cit")
    report = WasteReport(
        user_id=citizen.id,
        category=WasteCategory.ORGANIC,
        description="Compost heap pickup",
        location="Green Street 12",
        status=ReportStatus.SUBMITTED,
    )
    db_session.add(report)
    db_session.commit()
    db_session.refresh(report)

    pickup = Pickup(
        report_id=report.id,
        user_id=citizen.id,
        status=PickupStatus.REQUESTED,
        time_slot="Morning 09:00 - 12:00",
        notes="Special garden compost bags",
    )
    db_session.add(pickup)
    db_session.commit()
    db_session.refresh(pickup)

    res = client.get("/api/v1/search?q=compost", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["total_results"] >= 1
    titles = [item["title"] for item in data["results"]]
    assert any(f"Pickup #{pickup.id}" in title for title in titles)
