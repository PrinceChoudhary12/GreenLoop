"""Tests for Notifications System (Milestone 06)."""

import uuid
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.security import create_access_token, get_password_hash
from backend.app.models.enums import NotificationType, PickupStatus, ReportPriority, ReportStatus, UserRole, WasteCategory
from backend.app.models.notification import Notification
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


def _create_report(db: Session, user: User) -> WasteReport:
    """Helper to create a waste report."""
    report = WasteReport(
        user_id=user.id,
        category=WasteCategory.PLASTIC,
        description="Discarded plastic bottles near community park.",
        location="Sector 4, Central Park Gate",
        priority=ReportPriority.HIGH,
        status=ReportStatus.SUBMITTED,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def test_notification_generated_on_report_submission(client: TestClient, db_session: Session) -> None:
    """Test that submitting a report generates a notification for the citizen."""
    citizen, token = _create_user(db_session, UserRole.CITIZEN, "citizen")

    res = client.post(
        "/api/v1/reports",
        data={
            "category": "PLASTIC",
            "description": "Plastic bottles scattered near bus station.",
            "location": "Bus Stop #14, Main Road",
            "priority": "HIGH",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == status.HTTP_201_CREATED

    notif_res = client.get(
        "/api/v1/notifications",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert notif_res.status_code == status.HTTP_200_OK
    data = notif_res.json()
    assert data["total"] >= 1
    assert data["unread_count"] >= 1
    assert any(n["type"] == "REPORT_CREATED" for n in data["items"])


def test_notification_generated_on_pickup_lifecycle(client: TestClient, db_session: Session) -> None:
    """Test notifications created across pickup workflow."""
    citizen, cit_token = _create_user(db_session, UserRole.CITIZEN, "citizen")
    collector, col_token = _create_user(db_session, UserRole.COLLECTOR, "collector")
    admin, adm_token = _create_user(db_session, UserRole.ADMIN, "admin")

    report = _create_report(db_session, citizen)

    # 1. Citizen requests pickup
    res_req = client.post(
        "/api/v1/pickups",
        json={"report_id": report.id, "contact_phone": "+123456789"},
        headers={"Authorization": f"Bearer {cit_token}"},
    )
    assert res_req.status_code == status.HTTP_201_CREATED
    pickup_id = res_req.json()["id"]

    # 2. Admin schedules and assigns collector
    res_sched = client.post(
        f"/api/v1/admin/pickups/{pickup_id}/schedule",
        json={
            "scheduled_date": "2026-09-25",
            "time_slot": "Morning (09:00 - 12:00)",
            "collector_id": collector.id,
        },
        headers={"Authorization": f"Bearer {adm_token}"},
    )
    assert res_sched.status_code == status.HTTP_200_OK

    # Check collector received assignment notification
    col_notifs = client.get(
        "/api/v1/notifications",
        headers={"Authorization": f"Bearer {col_token}"},
    ).json()
    assert any(n["type"] == "PICKUP_ASSIGNED" and n["entity_id"] == pickup_id for n in col_notifs["items"])

    # 3. Collector accepts pickup
    res_accept = client.post(
        f"/api/v1/collectors/pickups/{pickup_id}/accept",
        headers={"Authorization": f"Bearer {col_token}"},
    )
    assert res_accept.status_code == status.HTTP_200_OK

    # 4. Collector starts pickup
    res_start = client.post(
        f"/api/v1/collectors/pickups/{pickup_id}/start",
        headers={"Authorization": f"Bearer {col_token}"},
    )
    assert res_start.status_code == status.HTTP_200_OK

    # 5. Collector completes pickup
    res_comp = client.post(
        f"/api/v1/collectors/pickups/{pickup_id}/complete",
        headers={"Authorization": f"Bearer {col_token}"},
    )
    assert res_comp.status_code == status.HTTP_200_OK

    # Check citizen notifications
    cit_notifs = client.get(
        "/api/v1/notifications",
        headers={"Authorization": f"Bearer {cit_token}"},
    ).json()
    types = [n["type"] for n in cit_notifs["items"]]
    assert "PICKUP_REQUESTED" in types
    assert "PICKUP_SCHEDULED" in types
    assert "PICKUP_ACCEPTED" in types
    assert "PICKUP_IN_PROGRESS" in types
    assert "PICKUP_COMPLETED" in types


def test_notification_ownership_isolation(client: TestClient, db_session: Session) -> None:
    """Verify user cannot read or update another user's notifications."""
    user_a, token_a = _create_user(db_session, UserRole.CITIZEN, "user_a")
    user_b, token_b = _create_user(db_session, UserRole.CITIZEN, "user_b")

    notif_a = Notification(
        user_id=user_a.id,
        type=NotificationType.SYSTEM_ALERT,
        title="Alert for User A",
        message="Important account notice.",
        is_read=False,
    )
    db_session.add(notif_a)
    db_session.commit()
    db_session.refresh(notif_a)

    # User B lists notifications - should not see User A's
    res_b = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {token_b}"})
    assert res_b.status_code == status.HTTP_200_OK
    assert not any(n["id"] == notif_a.id for n in res_b.json()["items"])

    # User B attempts to mark User A's notification as read
    res_patch = client.patch(
        f"/api/v1/notifications/{notif_a.id}/read",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_patch.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]


def test_mark_single_and_all_read(client: TestClient, db_session: Session) -> None:
    """Test marking individual notification and all notifications as read."""
    user, token = _create_user(db_session, UserRole.CITIZEN, "mark_test")

    n1 = Notification(
        user_id=user.id,
        type=NotificationType.SYSTEM_ALERT,
        title="Notification 1",
        message="Message 1",
        is_read=False,
    )
    n2 = Notification(
        user_id=user.id,
        type=NotificationType.SYSTEM_ALERT,
        title="Notification 2",
        message="Message 2",
        is_read=False,
    )
    db_session.add_all([n1, n2])
    db_session.commit()

    # Initial count check
    count_res = client.get("/api/v1/notifications/unread-count", headers={"Authorization": f"Bearer {token}"})
    assert count_res.json()["unread_count"] == 2

    # Mark n1 read
    patch_res = client.patch(f"/api/v1/notifications/{n1.id}/read", headers={"Authorization": f"Bearer {token}"})
    assert patch_res.status_code == status.HTTP_200_OK
    assert patch_res.json()["is_read"] is True

    # Count should now be 1
    count_res2 = client.get("/api/v1/notifications/unread-count", headers={"Authorization": f"Bearer {token}"})
    assert count_res2.json()["unread_count"] == 1

    # Mark all read
    all_res = client.post("/api/v1/notifications/mark-all-read", headers={"Authorization": f"Bearer {token}"})
    assert all_res.status_code == status.HTTP_200_OK
    assert all_res.json()["marked_count"] == 1

    # Count should now be 0
    count_res3 = client.get("/api/v1/notifications/unread-count", headers={"Authorization": f"Bearer {token}"})
    assert count_res3.json()["unread_count"] == 0
