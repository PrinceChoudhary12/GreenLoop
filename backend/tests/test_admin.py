"""Tests for Admin Management endpoints and workflows (Milestone 04)."""

import uuid
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.security import create_access_token, get_password_hash
from backend.app.models.enums import ReportPriority, ReportStatus, UserRole, WasteCategory
from backend.app.models.report import WasteReport
from backend.app.models.user import User


def _create_admin(db: Session, email_prefix: str = "admin") -> tuple[User, str]:
    """Helper to create an admin user and JWT token."""
    unique_email = f"{email_prefix}_{uuid.uuid4().hex[:6]}@greenloop.local"
    user = User(
        name="Chief Administrator",
        email=unique_email,
        password_hash=get_password_hash("AdminPass123!"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(subject=str(user.id), role=UserRole.ADMIN.value)
    return user, token


def _create_citizen(db: Session, email_prefix: str = "citizen") -> tuple[User, str]:
    """Helper to create a citizen user and JWT token."""
    unique_email = f"{email_prefix}_{uuid.uuid4().hex[:6]}@greenloop.local"
    user = User(
        name="Citizen User",
        email=unique_email,
        password_hash=get_password_hash("Password123!"),
        role=UserRole.CITIZEN,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(subject=str(user.id), role=UserRole.CITIZEN.value)
    return user, token


def _create_collector(db: Session, email_prefix: str = "collector") -> tuple[User, str]:
    """Helper to create a collector user and JWT token."""
    unique_email = f"{email_prefix}_{uuid.uuid4().hex[:6]}@greenloop.local"
    user = User(
        name="Collector User",
        email=unique_email,
        password_hash=get_password_hash("Password123!"),
        role=UserRole.COLLECTOR,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(subject=str(user.id), role=UserRole.COLLECTOR.value)
    return user, token


def test_admin_metrics_access(client: TestClient, db_session: Session):
    """Admin can fetch aggregated system metrics."""
    admin_user, admin_token = _create_admin(db_session, "metrics_admin")
    citizen_user, _ = _create_citizen(db_session, "metrics_citizen")
    collector_user, _ = _create_collector(db_session, "metrics_collector")

    # Create sample report
    r1 = WasteReport(
        user_id=citizen_user.id,
        category=WasteCategory.PLASTIC,
        description="Bottles in park",
        location="Park Sector 4",
        status=ReportStatus.SUBMITTED,
        priority=ReportPriority.HIGH,
    )
    db_session.add(r1)
    db_session.commit()

    response = client.get(
        "/api/v1/admin/metrics",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["total_users"] >= 3
    assert data["total_citizens"] >= 1
    assert data["total_collectors"] >= 1
    assert data["total_reports"] >= 1
    assert data["submitted_reports"] >= 1


def test_admin_list_users_with_filters(client: TestClient, db_session: Session):
    """Admin can list and filter users by role and search query."""
    admin_user, admin_token = _create_admin(db_session, "filter_admin")
    citizen_user, _ = _create_citizen(db_session, "filter_alice")
    collector_user, _ = _create_collector(db_session, "filter_bob")

    # 1. Filter by CITIZEN
    res_citizen = client.get(
        "/api/v1/admin/users?role=CITIZEN",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_citizen.status_code == status.HTTP_200_OK
    citizens = res_citizen.json()
    assert all(u["role"] == "CITIZEN" for u in citizens)
    assert any(u["email"] == citizen_user.email for u in citizens)

    # 2. Search query
    res_search = client.get(
        f"/api/v1/admin/users?search={collector_user.email}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_search.status_code == status.HTTP_200_OK
    found = res_search.json()
    assert len(found) == 1
    assert found[0]["email"] == collector_user.email


def test_admin_toggle_user_status_and_deactivation_enforcement(client: TestClient, db_session: Session):
    """Admin can deactivate a user, and deactivated users are denied access."""
    admin_user, admin_token = _create_admin(db_session, "status_admin")
    citizen_user, citizen_token = _create_citizen(db_session, "status_citizen")

    # 1. Deactivate citizen
    patch_res = client.patch(
        f"/api/v1/admin/users/{citizen_user.id}/status",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"is_active": False},
    )
    assert patch_res.status_code == status.HTTP_200_OK
    assert patch_res.json()["is_active"] is False

    # 2. Deactivated citizen attempts to access /reports -> 403 ACCOUNT_INACTIVE
    citizen_res = client.get(
        "/api/v1/reports",
        headers={"Authorization": f"Bearer {citizen_token}"},
    )
    assert citizen_res.status_code == status.HTTP_403_FORBIDDEN
    assert citizen_res.json()["error"]["code"] == "ACCOUNT_INACTIVE"

    # 3. Reactivate citizen
    reactivate_res = client.patch(
        f"/api/v1/admin/users/{citizen_user.id}/status",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"is_active": True},
    )
    assert reactivate_res.status_code == status.HTTP_200_OK
    assert reactivate_res.json()["is_active"] is True

    # 4. Citizen access restored
    restored_res = client.get(
        "/api/v1/reports",
        headers={"Authorization": f"Bearer {citizen_token}"},
    )
    assert restored_res.status_code == status.HTTP_200_OK


def test_admin_cannot_deactivate_self(client: TestClient, db_session: Session):
    """Admin is blocked from self-deactivation."""
    admin_user, admin_token = _create_admin(db_session, "self_deact_admin")

    response = client.patch(
        f"/api/v1/admin/users/{admin_user.id}/status",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"is_active": False},
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["error"]["code"] == "ADMIN_SELF_DEACTIVATION_FORBIDDEN"


def test_admin_list_all_reports_and_assign(client: TestClient, db_session: Session):
    """Admin can view all reports and assign an open report to a collector."""
    admin_user, admin_token = _create_admin(db_session, "assign_admin")
    citizen_user, _ = _create_citizen(db_session, "assign_citizen")
    collector_user, _ = _create_collector(db_session, "assign_collector")

    # Create report
    report = WasteReport(
        user_id=citizen_user.id,
        category=WasteCategory.E_WASTE,
        description="Broken electronics at community center",
        location="Community Center North",
        status=ReportStatus.SUBMITTED,
        priority=ReportPriority.MEDIUM,
    )
    db_session.add(report)
    db_session.commit()
    db_session.refresh(report)

    # 1. Admin views all reports
    res_list = client.get(
        "/api/v1/admin/reports",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_list.status_code == status.HTTP_200_OK
    reports = res_list.json()
    assert any(r["id"] == report.id for r in reports)

    # 2. Admin assigns report to collector
    res_assign = client.post(
        f"/api/v1/admin/reports/{report.id}/assign",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"collector_id": collector_user.id},
    )
    assert res_assign.status_code == status.HTTP_200_OK
    data = res_assign.json()
    assert data["collector_id"] == collector_user.id
    assert data["collector_name"] == collector_user.name
    assert data["status"] == "UNDER_REVIEW"


def test_admin_override_report_status(client: TestClient, db_session: Session):
    """Admin can override report status."""
    admin_user, admin_token = _create_admin(db_session, "override_admin")
    citizen_user, _ = _create_citizen(db_session, "override_citizen")

    report = WasteReport(
        user_id=citizen_user.id,
        category=WasteCategory.ORGANIC,
        description="Compost overflow",
        location="Green Garden 12",
        status=ReportStatus.UNDER_REVIEW,
        priority=ReportPriority.LOW,
    )
    db_session.add(report)
    db_session.commit()
    db_session.refresh(report)

    response = client.patch(
        f"/api/v1/admin/reports/{report.id}/status",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "RESOLVED"},
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == "RESOLVED"


def test_non_admin_forbidden_on_admin_endpoints(client: TestClient, db_session: Session):
    """Citizens and collectors are rejected with 403 on admin routes."""
    _, citizen_token = _create_citizen(db_session, "forbidden_citizen")
    _, collector_token = _create_collector(db_session, "forbidden_collector")

    for token in [citizen_token, collector_token]:
        res_metrics = client.get(
            "/api/v1/admin/metrics",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res_metrics.status_code == status.HTTP_403_FORBIDDEN
        assert res_metrics.json()["error"]["code"] == "FORBIDDEN_ROLE"

        res_users = client.get(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res_users.status_code == status.HTTP_403_FORBIDDEN
        assert res_users.json()["error"]["code"] == "FORBIDDEN_ROLE"
