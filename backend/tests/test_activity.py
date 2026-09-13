"""Tests for Activity & Audit Logging System (Milestone 06)."""

import uuid
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.security import create_access_token, get_password_hash
from backend.app.models.enums import ActivityAction, UserRole, WasteCategory
from backend.app.models.report import WasteReport
from backend.app.models.user import User


def _create_user(db: Session, role: UserRole, prefix: str = "user", is_active: bool = True) -> tuple[User, str]:
    """Helper to create a user and valid JWT token."""
    unique_email = f"{prefix}_{uuid.uuid4().hex[:6]}@greenloop.local"
    user = User(
        name=f"{prefix.capitalize()} Test",
        email=unique_email,
        password_hash=get_password_hash("Password123!"),
        role=role,
        is_active=is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(subject=str(user.id), role=role.value)
    return user, token


def test_citizen_activity_stream(client: TestClient, db_session: Session) -> None:
    """Test citizen can retrieve their personal activity logs."""
    citizen, token = _create_user(db_session, UserRole.CITIZEN, "citizen_act")

    # Create report to generate activity
    client.post(
        "/api/v1/reports",
        data={
            "category": "METAL",
            "description": "Scrap metal behind building.",
            "location": "Warehouse Lane #3",
            "priority": "MEDIUM",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    res = client.get("/api/v1/activity/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["total"] >= 1
    actions = [item["action"] for item in data["items"]]
    assert "REPORT_CREATED" in actions


def test_collector_activity_stream(client: TestClient, db_session: Session) -> None:
    """Test collector can retrieve activity concerning their work."""
    citizen, cit_token = _create_user(db_session, UserRole.CITIZEN, "cit")
    collector, col_token = _create_user(db_session, UserRole.COLLECTOR, "col")

    # Citizen creates report
    res_rep = client.post(
        "/api/v1/reports",
        data={
            "category": "PAPER",
            "description": "Old magazines and cardboard.",
            "location": "Library Alley",
            "priority": "LOW",
        },
        headers={"Authorization": f"Bearer {cit_token}"},
    )
    report_id = res_rep.json()["id"]

    # Collector claims report
    claim_res = client.post(
        f"/api/v1/collectors/reports/{report_id}/claim",
        headers={"Authorization": f"Bearer {col_token}"},
    )
    assert claim_res.status_code == status.HTTP_200_OK

    # Collector fetches activity
    col_act = client.get("/api/v1/activity/collector", headers={"Authorization": f"Bearer {col_token}"})
    assert col_act.status_code == status.HTTP_200_OK
    items = col_act.json()["items"]
    assert any(item["action"] == "REPORT_CLAIMED" and item["entity_id"] == report_id for item in items)


def test_admin_audit_logs_access_and_filters(client: TestClient, db_session: Session) -> None:
    """Test admin access to system-wide audit logs with filters."""
    admin, adm_token = _create_user(db_session, UserRole.ADMIN, "admin_audit")
    target_user, _ = _create_user(db_session, UserRole.CITIZEN, "target")

    # Admin toggles user status
    toggle_res = client.patch(
        f"/api/v1/admin/users/{target_user.id}/status",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {adm_token}"},
    )
    assert toggle_res.status_code == status.HTTP_200_OK

    # Admin retrieves audit logs filtered by action
    audit_res = client.get(
        "/api/v1/activity/admin?action=USER_DEACTIVATED",
        headers={"Authorization": f"Bearer {adm_token}"},
    )
    assert audit_res.status_code == status.HTTP_200_OK
    items = audit_res.json()["items"]
    assert len(items) >= 1
    assert items[0]["action"] == "USER_DEACTIVATED"
    assert items[0]["entity_id"] == target_user.id


def test_activity_access_control(client: TestClient, db_session: Session) -> None:
    """Test role enforcement across activity endpoints."""
    citizen, cit_token = _create_user(db_session, UserRole.CITIZEN, "cit_acl")
    collector, col_token = _create_user(db_session, UserRole.COLLECTOR, "col_acl")

    # Citizen trying to access admin audit logs
    res_cit_adm = client.get("/api/v1/activity/admin", headers={"Authorization": f"Bearer {cit_token}"})
    assert res_cit_adm.status_code == status.HTTP_403_FORBIDDEN

    # Citizen trying to access collector activity
    res_cit_col = client.get("/api/v1/activity/collector", headers={"Authorization": f"Bearer {cit_token}"})
    assert res_cit_col.status_code == status.HTTP_403_FORBIDDEN

    # Collector trying to access admin audit logs
    res_col_adm = client.get("/api/v1/activity/admin", headers={"Authorization": f"Bearer {col_token}"})
    assert res_col_adm.status_code == status.HTTP_403_FORBIDDEN
