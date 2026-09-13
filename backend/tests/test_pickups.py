"""Tests for Waste Pickup Workflow (Milestone 05)."""

import uuid
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.security import create_access_token, get_password_hash
from backend.app.models.enums import PickupStatus, ReportPriority, ReportStatus, UserRole, WasteCategory
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


def _create_report(db: Session, user: User, status_val: ReportStatus = ReportStatus.SUBMITTED) -> WasteReport:
    """Helper to create a waste report."""
    report = WasteReport(
        user_id=user.id,
        category=WasteCategory.PLASTIC,
        description="Discarded plastic bottles near community park.",
        location="Sector 4, Central Park Gate",
        priority=ReportPriority.HIGH,
        status=status_val,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def test_citizen_request_pickup_success(client: TestClient, db_session: Session) -> None:
    """Test citizen requesting a scheduled pickup for an eligible report."""
    citizen, token = _create_user(db_session, UserRole.CITIZEN, "citizen")
    report = _create_report(db_session, citizen)

    response = client.post(
        "/api/v1/pickups",
        json={
            "report_id": report.id,
            "contact_phone": "+1-555-0199",
            "notes": "Large bags placed on the front porch.",
            "preferred_date": "2026-09-20",
            "preferred_time_slot": "Morning (09:00 - 12:00)",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["report_id"] == report.id
    assert data["user_id"] == citizen.id
    assert data["status"] == "REQUESTED"
    assert data["contact_phone"] == "+1-555-0199"
    assert data["time_slot"] == "Morning (09:00 - 12:00)"
    assert data["report"]["category"] == "PLASTIC"


def test_citizen_cannot_request_pickup_for_others_report(client: TestClient, db_session: Session) -> None:
    """Test ownership enforcement when requesting a pickup."""
    owner, _ = _create_user(db_session, UserRole.CITIZEN, "owner")
    other_citizen, token = _create_user(db_session, UserRole.CITIZEN, "other")
    report = _create_report(db_session, owner)

    response = client.post(
        "/api/v1/pickups",
        json={"report_id": report.id, "contact_phone": "123456"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.json()["error"]["code"] == "FORBIDDEN_OWNERSHIP"


def test_cannot_request_pickup_for_resolved_or_rejected_report(client: TestClient, db_session: Session) -> None:
    """Test that resolved or rejected reports cannot receive pickup requests."""
    citizen, token = _create_user(db_session, UserRole.CITIZEN, "citizen")
    resolved_report = _create_report(db_session, citizen, ReportStatus.RESOLVED)
    rejected_report = _create_report(db_session, citizen, ReportStatus.REJECTED)

    resp1 = client.post(
        "/api/v1/pickups",
        json={"report_id": resolved_report.id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp1.status_code == status.HTTP_400_BAD_REQUEST
    assert resp1.json()["error"]["code"] == "REPORT_INELIGIBLE"

    resp2 = client.post(
        "/api/v1/pickups",
        json={"report_id": rejected_report.id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp2.status_code == status.HTTP_400_BAD_REQUEST
    assert resp2.json()["error"]["code"] == "REPORT_INELIGIBLE"


def test_duplicate_active_pickup_prevention(client: TestClient, db_session: Session) -> None:
    """Test duplicate active pickup request rejection."""
    citizen, token = _create_user(db_session, UserRole.CITIZEN, "citizen")
    report = _create_report(db_session, citizen)

    # First request succeeds
    resp1 = client.post(
        "/api/v1/pickups",
        json={"report_id": report.id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp1.status_code == status.HTTP_201_CREATED

    # Second request fails
    resp2 = client.post(
        "/api/v1/pickups",
        json={"report_id": report.id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp2.status_code == status.HTTP_400_BAD_REQUEST
    assert resp2.json()["error"]["code"] == "DUPLICATE_ACTIVE_PICKUP"


def test_admin_schedule_and_assign_pickup(client: TestClient, db_session: Session) -> None:
    """Test admin scheduling and assigning pickups."""
    citizen, c_token = _create_user(db_session, UserRole.CITIZEN, "citizen")
    admin, a_token = _create_user(db_session, UserRole.ADMIN, "admin")
    collector, _ = _create_user(db_session, UserRole.COLLECTOR, "collector")
    report = _create_report(db_session, citizen)

    # Citizen requests pickup
    req_resp = client.post(
        "/api/v1/pickups",
        json={"report_id": report.id},
        headers={"Authorization": f"Bearer {c_token}"},
    )
    pickup_id = req_resp.json()["id"]

    # Admin schedules without collector -> SCHEDULED
    sched_resp = client.post(
        f"/api/v1/admin/pickups/{pickup_id}/schedule",
        json={
            "scheduled_date": "2026-09-22",
            "time_slot": "Afternoon (12:00 - 16:00)",
            "notes": "Gate code is #1234",
        },
        headers={"Authorization": f"Bearer {a_token}"},
    )
    assert sched_resp.status_code == status.HTTP_200_OK
    assert sched_resp.json()["status"] == "SCHEDULED"

    # Admin assigns collector -> ASSIGNED
    assign_resp = client.post(
        f"/api/v1/admin/pickups/{pickup_id}/assign",
        json={"collector_id": collector.id},
        headers={"Authorization": f"Bearer {a_token}"},
    )
    assert assign_resp.status_code == status.HTTP_200_OK
    assert assign_resp.json()["status"] == "ASSIGNED"
    assert assign_resp.json()["collector_id"] == collector.id


def test_admin_combined_schedule_with_collector(client: TestClient, db_session: Session) -> None:
    """Test admin scheduling with collector assigned immediately."""
    citizen, c_token = _create_user(db_session, UserRole.CITIZEN, "citizen")
    admin, a_token = _create_user(db_session, UserRole.ADMIN, "admin")
    collector, _ = _create_user(db_session, UserRole.COLLECTOR, "collector")
    report = _create_report(db_session, citizen)

    req_resp = client.post(
        "/api/v1/pickups",
        json={"report_id": report.id},
        headers={"Authorization": f"Bearer {c_token}"},
    )
    pickup_id = req_resp.json()["id"]

    combined_resp = client.post(
        f"/api/v1/admin/pickups/{pickup_id}/schedule",
        json={
            "scheduled_date": "2026-09-22",
            "time_slot": "Morning (09:00 - 12:00)",
            "collector_id": collector.id,
        },
        headers={"Authorization": f"Bearer {a_token}"},
    )
    assert combined_resp.status_code == status.HTTP_200_OK
    assert combined_resp.json()["status"] == "ASSIGNED"
    assert combined_resp.json()["collector_id"] == collector.id


def test_collector_lifecycle_workflow_and_atomic_resolution(client: TestClient, db_session: Session) -> None:
    """Test full collector workflow: ASSIGNED -> ACCEPTED -> IN_PROGRESS -> COMPLETED (and report becomes RESOLVED)."""
    citizen, c_token = _create_user(db_session, UserRole.CITIZEN, "citizen")
    admin, a_token = _create_user(db_session, UserRole.ADMIN, "admin")
    collector, col_token = _create_user(db_session, UserRole.COLLECTOR, "collector")
    report = _create_report(db_session, citizen)

    # 1. Citizen creates pickup
    p_resp = client.post(
        "/api/v1/pickups",
        json={"report_id": report.id},
        headers={"Authorization": f"Bearer {c_token}"},
    )
    pickup_id = p_resp.json()["id"]

    # 2. Admin schedules & assigns collector
    client.post(
        f"/api/v1/admin/pickups/{pickup_id}/schedule",
        json={
            "scheduled_date": "2026-09-21",
            "time_slot": "Morning (09:00 - 12:00)",
            "collector_id": collector.id,
        },
        headers={"Authorization": f"Bearer {a_token}"},
    )

    # 3. Collector accepts
    acc_resp = client.post(
        f"/api/v1/collectors/pickups/{pickup_id}/accept",
        headers={"Authorization": f"Bearer {col_token}"},
    )
    assert acc_resp.status_code == status.HTTP_200_OK
    assert acc_resp.json()["status"] == "ACCEPTED"

    # 4. Collector starts collection
    start_resp = client.post(
        f"/api/v1/collectors/pickups/{pickup_id}/start",
        headers={"Authorization": f"Bearer {col_token}"},
    )
    assert start_resp.status_code == status.HTTP_200_OK
    assert start_resp.json()["status"] == "IN_PROGRESS"

    # 5. Collector completes pickup
    comp_resp = client.post(
        f"/api/v1/collectors/pickups/{pickup_id}/complete",
        headers={"Authorization": f"Bearer {col_token}"},
    )
    assert comp_resp.status_code == status.HTTP_200_OK
    assert comp_resp.json()["status"] == "COMPLETED"
    assert comp_resp.json()["completed_at"] is not None

    # 6. Verify underlying waste report is atomically RESOLVED
    db_session.expire_all()
    updated_report = db_session.get(WasteReport, report.id)
    assert updated_report is not None
    assert updated_report.status == ReportStatus.RESOLVED
    assert updated_report.collector_id == collector.id


def test_invalid_lifecycle_transitions_rejected(client: TestClient, db_session: Session) -> None:
    """Test that illegal lifecycle skips are blocked."""
    citizen, c_token = _create_user(db_session, UserRole.CITIZEN, "citizen")
    admin, a_token = _create_user(db_session, UserRole.ADMIN, "admin")
    collector, col_token = _create_user(db_session, UserRole.COLLECTOR, "collector")
    other_col, other_token = _create_user(db_session, UserRole.COLLECTOR, "other_col")
    report = _create_report(db_session, citizen)

    p_resp = client.post(
        "/api/v1/pickups",
        json={"report_id": report.id},
        headers={"Authorization": f"Bearer {c_token}"},
    )
    pickup_id = p_resp.json()["id"]

    # Trying to accept before assignment
    resp = client.post(
        f"/api/v1/collectors/pickups/{pickup_id}/accept",
        headers={"Authorization": f"Bearer {col_token}"},
    )
    assert resp.status_code == status.HTTP_403_FORBIDDEN

    # Admin assigns collector
    client.post(
        f"/api/v1/admin/pickups/{pickup_id}/schedule",
        json={"scheduled_date": "2026-09-21", "time_slot": "Morning", "collector_id": collector.id},
        headers={"Authorization": f"Bearer {a_token}"},
    )

    # Other collector trying to accept
    resp = client.post(
        f"/api/v1/collectors/pickups/{pickup_id}/accept",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert resp.status_code == status.HTTP_403_FORBIDDEN

    # Trying to start before accepting
    resp = client.post(
        f"/api/v1/collectors/pickups/{pickup_id}/start",
        headers={"Authorization": f"Bearer {col_token}"},
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST

    # Trying to complete before starting
    resp = client.post(
        f"/api/v1/collectors/pickups/{pickup_id}/complete",
        headers={"Authorization": f"Bearer {col_token}"},
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_pickup_cancellation_rules(client: TestClient, db_session: Session) -> None:
    """Test cancellation permissions and in-progress/completed cancellation barriers."""
    citizen, c_token = _create_user(db_session, UserRole.CITIZEN, "citizen")
    admin, a_token = _create_user(db_session, UserRole.ADMIN, "admin")
    collector, col_token = _create_user(db_session, UserRole.COLLECTOR, "collector")
    report = _create_report(db_session, citizen)

    # 1. Citizen cancels in REQUESTED
    p1 = client.post("/api/v1/pickups", json={"report_id": report.id}, headers={"Authorization": f"Bearer {c_token}"}).json()
    cancel_resp = client.post(
        f"/api/v1/pickups/{p1['id']}/cancel",
        json={"cancellation_reason": "Items cleared by private contractor"},
        headers={"Authorization": f"Bearer {c_token}"},
    )
    assert cancel_resp.status_code == status.HTTP_200_OK
    assert cancel_resp.json()["status"] == "CANCELLED"
    assert cancel_resp.json()["cancellation_reason"] == "Items cleared by private contractor"

    # Now that p1 is CANCELLED, citizen can request a new pickup for the report
    p2 = client.post("/api/v1/pickups", json={"report_id": report.id}, headers={"Authorization": f"Bearer {c_token}"}).json()
    # Admin schedules & assigns
    client.post(
        f"/api/v1/admin/pickups/{p2['id']}/schedule",
        json={"scheduled_date": "2026-09-21", "time_slot": "Morning", "collector_id": collector.id},
        headers={"Authorization": f"Bearer {a_token}"},
    )
    # Collector accepts
    client.post(f"/api/v1/collectors/pickups/{p2['id']}/accept", headers={"Authorization": f"Bearer {col_token}"})

    # Citizen trying to cancel accepted pickup -> rejected
    c_cancel = client.post(
        f"/api/v1/pickups/{p2['id']}/cancel",
        json={"cancellation_reason": "Want to cancel"},
        headers={"Authorization": f"Bearer {c_token}"},
    )
    assert c_cancel.status_code == status.HTTP_400_BAD_REQUEST
    assert c_cancel.json()["error"]["code"] == "CITIZEN_CANNOT_CANCEL_ACCEPTED_PICKUP"

    # Collector starts route -> IN_PROGRESS
    client.post(f"/api/v1/collectors/pickups/{p2['id']}/start", headers={"Authorization": f"Bearer {col_token}"})

    # Admin trying to cancel IN_PROGRESS -> rejected
    a_cancel = client.post(
        f"/api/v1/pickups/{p2['id']}/cancel",
        json={"cancellation_reason": "Emergency cancel"},
        headers={"Authorization": f"Bearer {a_token}"},
    )
    assert a_cancel.status_code == status.HTTP_400_BAD_REQUEST
    assert a_cancel.json()["error"]["code"] == "CANNOT_CANCEL_IN_PROGRESS_OR_COMPLETED"


def test_pickup_listing_and_role_isolation(client: TestClient, db_session: Session) -> None:
    """Test citizen, collector, and admin listing queries and data isolation."""
    c1, t1 = _create_user(db_session, UserRole.CITIZEN, "citizen1")
    c2, t2 = _create_user(db_session, UserRole.CITIZEN, "citizen2")
    col1, col_t1 = _create_user(db_session, UserRole.COLLECTOR, "collector1")
    col2, col_t2 = _create_user(db_session, UserRole.COLLECTOR, "collector2")
    admin, a_token = _create_user(db_session, UserRole.ADMIN, "admin")

    r1 = _create_report(db_session, c1)
    r2 = _create_report(db_session, c2)

    # C1 requests pickup -> P1
    p1 = client.post("/api/v1/pickups", json={"report_id": r1.id}, headers={"Authorization": f"Bearer {t1}"}).json()
    # C2 requests pickup -> P2
    p2 = client.post("/api/v1/pickups", json={"report_id": r2.id}, headers={"Authorization": f"Bearer {t2}"}).json()

    # Admin assigns P1 to Col1, P2 to Col2
    client.post(f"/api/v1/admin/pickups/{p1['id']}/assign", json={"collector_id": col1.id}, headers={"Authorization": f"Bearer {a_token}"})
    client.post(f"/api/v1/admin/pickups/{p2['id']}/assign", json={"collector_id": col2.id}, headers={"Authorization": f"Bearer {a_token}"})

    # C1 list check -> only P1
    c1_list = client.get("/api/v1/pickups", headers={"Authorization": f"Bearer {t1}"}).json()
    assert len(c1_list) == 1
    assert c1_list[0]["id"] == p1["id"]

    # Col1 list check -> only P1
    col1_list = client.get("/api/v1/collectors/pickups", headers={"Authorization": f"Bearer {col_t1}"}).json()
    assert len(col1_list) == 1
    assert col1_list[0]["id"] == p1["id"]

    # Admin list check -> both P1 and P2
    admin_list = client.get("/api/v1/admin/pickups", headers={"Authorization": f"Bearer {a_token}"}).json()
    assert len(admin_list) >= 2
