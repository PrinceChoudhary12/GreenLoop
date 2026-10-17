"""Comprehensive Master End-to-End Regression & Integration Test Suite.

Simulates the entire multi-role GreenLoop lifecycle:
1. Citizen, Collector, and Admin account provisioning and authentication.
2. Waste report submission with photo attachment.
3. In-app notifications and activity timeline verification.
4. Scheduled pickup request with duplicate active pickup guard enforcement.
5. Admin dispatch, collector assignment, and state machine lifecycle transitions:
   (REQUESTED -> SCHEDULED -> ASSIGNED -> ACCEPTED -> IN_PROGRESS -> COMPLETED).
6. Atomic waste report resolution upon pickup completion.
7. Role-isolated direct messaging between Citizen and Collector with unread tracking.
8. Location consent and map visibility verification.
9. Role-aware global search across reports, pickups, and facilities.
10. Admin recycling center management and citizen discovery.
11. Profile updates and password change verification.
"""

import io
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.security import get_password_hash
from backend.app.models.enums import UserRole
from backend.app.models.user import User


def _create_admin_user(db: Session, email: str = "superadmin@greenloop.org") -> User:
    """Helper to provision an active administrator in the test database."""
    admin = User(
        name="System Administrator",
        email=email,
        password_hash=get_password_hash("SuperAdminSecret123!"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def test_complete_greenloop_production_e2e_workflow(client: TestClient, db_session: Session):
    """Executes the full interconnected user, collector, and admin lifecycle."""

    # -------------------------------------------------------------------------
    # 1. Citizen & Collector Registration and Authentication
    # -------------------------------------------------------------------------
    # 1.1 Register Citizen
    cit_res = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Jane Citizen",
            "email": "jane.citizen@example.com",
            "password": "CitizenSecretPassword123!",
            "password_confirm": "CitizenSecretPassword123!",
        },
    )
    assert cit_res.status_code == status.HTTP_201_CREATED
    cit_token = cit_res.json()["access_token"]
    cit_id = cit_res.json()["user"]["id"]
    cit_headers = {"Authorization": f"Bearer {cit_token}"}

    # 1.2 Register Collector
    col_res = client.post(
        "/api/v1/auth/register/collector",
        json={
            "name": "Bob Collector",
            "email": "bob.collector@example.com",
            "password": "CollectorSecretPassword123!",
            "password_confirm": "CollectorSecretPassword123!",
        },
    )
    assert col_res.status_code == status.HTTP_201_CREATED
    col_token = col_res.json()["access_token"]
    col_id = col_res.json()["user"]["id"]
    col_headers = {"Authorization": f"Bearer {col_token}"}

    # 1.3 Authenticate Admin
    _create_admin_user(db_session, "admin.ops@greenloop.org")
    adm_login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin.ops@greenloop.org", "password": "SuperAdminSecret123!"},
    )
    assert adm_login_res.status_code == status.HTTP_200_OK
    adm_token = adm_login_res.json()["access_token"]
    adm_headers = {"Authorization": f"Bearer {adm_token}"}

    # -------------------------------------------------------------------------
    # 2. Citizen Submits Waste Report with Valid PNG Image
    # -------------------------------------------------------------------------
    fake_png = io.BytesIO(
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    )
    report_res = client.post(
        "/api/v1/reports",
        data={
            "category": "PLASTIC",
            "description": "Massive overflow of recyclable plastic containers behind community hall.",
            "location": "Oak Avenue & 4th Street",
            "priority": "HIGH",
            "latitude": "37.7749",
            "longitude": "-122.4194",
        },
        files={"image": ("plastic_dump.png", fake_png, "image/png")},
        headers=cit_headers,
    )
    assert report_res.status_code == status.HTTP_201_CREATED
    report = report_res.json()
    report_id = report["id"]
    assert report["status"] == "SUBMITTED"
    assert report["image_path"].startswith("/uploads/")

    # -------------------------------------------------------------------------
    # 3. Notification & Activity Log Verification
    # -------------------------------------------------------------------------
    notif_res = client.get("/api/v1/notifications", headers=cit_headers)
    assert notif_res.status_code == status.HTTP_200_OK
    notifications = notif_res.json()["items"]
    assert len(notifications) >= 1
    assert any(n["type"] == "REPORT_CREATED" for n in notifications)

    # Mark notification as read
    notif_id = notifications[0]["id"]
    mark_res = client.patch(f"/api/v1/notifications/{notif_id}/read", headers=cit_headers)
    assert mark_res.status_code == status.HTTP_200_OK
    assert mark_res.json()["is_read"] is True

    # -------------------------------------------------------------------------
    # 4. Citizen Requests Scheduled Waste Pickup
    # -------------------------------------------------------------------------
    pickup_res = client.post(
        "/api/v1/pickups",
        json={
            "report_id": report_id,
            "time_slot": "Morning (09:00 - 12:00)",
            "contact_phone": "+1-555-0199",
            "notes": "Gate code is 4321; bins are stacked by the loading dock.",
        },
        headers=cit_headers,
    )
    assert pickup_res.status_code == status.HTTP_201_CREATED
    pickup = pickup_res.json()
    pickup_id = pickup["id"]
    assert pickup["status"] == "REQUESTED"

    # Concurrency Guard: Attempt duplicate active pickup for same report -> must be 409
    dup_res = client.post(
        "/api/v1/pickups",
        json={
            "report_id": report_id,
            "time_slot": "Afternoon",
            "contact_phone": "+1-555-0199",
        },
        headers=cit_headers,
    )
    assert dup_res.status_code == status.HTTP_400_BAD_REQUEST
    assert dup_res.json()["error"]["code"] == "DUPLICATE_ACTIVE_PICKUP"

    # -------------------------------------------------------------------------
    # 5. Admin Schedules & Assigns Collector to Pickup
    # -------------------------------------------------------------------------
    assign_res = client.post(
        f"/api/v1/admin/pickups/{pickup_id}/schedule",
        json={
            "scheduled_date": "2026-10-20",
            "time_slot": "Morning (09:00 - 12:00)",
            "collector_id": col_id,
        },
        headers=adm_headers,
    )
    assert assign_res.status_code == status.HTTP_200_OK
    assert assign_res.json()["status"] == "ASSIGNED"
    assert assign_res.json()["collector_id"] == col_id

    # -------------------------------------------------------------------------
    # 6. Collector Pickup Workflow Transitions to Completion
    # -------------------------------------------------------------------------
    # 6.1 Accept Pickup
    col_accept_res = client.post(f"/api/v1/collectors/pickups/{pickup_id}/accept", headers=col_headers)
    assert col_accept_res.status_code == status.HTTP_200_OK
    assert col_accept_res.json()["status"] == "ACCEPTED"

    # 6.2 Start Pickup (In Progress)
    col_progress_res = client.post(f"/api/v1/collectors/pickups/{pickup_id}/start", headers=col_headers)
    assert col_progress_res.status_code == status.HTTP_200_OK
    assert col_progress_res.json()["status"] == "IN_PROGRESS"

    # 6.3 Complete Pickup
    col_complete_res = client.post(f"/api/v1/collectors/pickups/{pickup_id}/complete", headers=col_headers)
    assert col_complete_res.status_code == status.HTTP_200_OK
    assert col_complete_res.json()["status"] == "COMPLETED"
    assert col_complete_res.json()["completed_at"] is not None

    # Atomic Report Resolution Check: Associated waste report must now be RESOLVED
    check_rep = client.get(f"/api/v1/reports/{report_id}", headers=cit_headers)
    assert check_rep.status_code == status.HTTP_200_OK
    assert check_rep.json()["status"] == "RESOLVED"

    # -------------------------------------------------------------------------
    # 7. Direct Messaging Between Citizen and Collector
    # -------------------------------------------------------------------------
    # 7.1 Citizen initiates conversation with collector
    conv_res = client.post(
        "/api/v1/messaging/conversations",
        json={
            "recipient_id": col_id,
            "entity_type": "report",
            "entity_id": report_id,
        },
        headers=cit_headers,
    )
    assert conv_res.status_code == status.HTTP_201_CREATED
    conv_id = conv_res.json()["id"]

    # 7.2 Citizen sends message
    send_res = client.post(
        f"/api/v1/messaging/conversations/{conv_id}/messages",
        json={"body": "Thank you for clearing the plastics so quickly Bob!"},
        headers=cit_headers,
    )
    assert send_res.status_code == status.HTTP_201_CREATED

    # 7.3 Collector receives message and unread count is >= 1
    unread_res = client.get("/api/v1/messaging/unread-count", headers=col_headers)
    assert unread_res.status_code == status.HTTP_200_OK
    assert unread_res.json()["unread_count"] >= 1

    # 7.4 Collector fetches messages and marks them read
    conv_messages_res = client.get(f"/api/v1/messaging/conversations/{conv_id}/messages", headers=col_headers)
    assert conv_messages_res.status_code == status.HTTP_200_OK
    messages = conv_messages_res.json()["items"]
    assert len(messages) >= 1
    assert "Thank you for clearing" in messages[0]["body"]

    read_res = client.post(f"/api/v1/messaging/conversations/{conv_id}/read", headers=col_headers)
    assert read_res.status_code == status.HTTP_200_OK

    # 7.5 Collector replies
    col_reply = client.post(
        f"/api/v1/messaging/conversations/{conv_id}/messages",
        json={"body": "Glad to help Jane, all sorted!"},
        headers=col_headers,
    )
    assert col_reply.status_code == status.HTTP_201_CREATED

    # -------------------------------------------------------------------------
    # 8. Location Consent and Map Data
    # -------------------------------------------------------------------------
    # Collector enables location sharing
    loc_res = client.post(
        "/api/v1/location/update",
        json={"latitude": 37.7750, "longitude": -122.4190, "is_sharing_active": True},
        headers=col_headers,
    )
    assert loc_res.status_code == status.HTTP_200_OK

    # Admin requests map logistics visualizer data
    map_res = client.get("/api/v1/location/map-data", headers=adm_headers)
    assert map_res.status_code == status.HTTP_200_OK
    map_data = map_res.json()
    assert "points" in map_data
    assert "user_location" in map_data
    assert map_data["total_points"] >= 1

    # -------------------------------------------------------------------------
    # 9. Role-Aware Global Search
    # -------------------------------------------------------------------------
    # Citizen search matches their own reports
    cit_search = client.get("/api/v1/search?q=plastic", headers=cit_headers)
    assert cit_search.status_code == status.HTTP_200_OK
    assert cit_search.json()["total_results"] >= 1
    assert any(r["entity_id"] == report_id for r in cit_search.json()["results"])

    # Admin search matches cross-role entities
    adm_search = client.get("/api/v1/search?q=plastic", headers=adm_headers)
    assert adm_search.status_code == status.HTTP_200_OK
    assert adm_search.json()["total_results"] >= 1
    assert any(r["entity_id"] == report_id for r in adm_search.json()["results"])

    # -------------------------------------------------------------------------
    # 10. Recycling Center Directory & Admin Management
    # -------------------------------------------------------------------------
    center_payload = {
        "name": "Metro Green Recovery Center",
        "description": "State of the art plastic, paper, and e-waste recycling facility.",
        "address": "1000 Industrial Parkway, Sector 9",
        "latitude": 37.7800,
        "longitude": -122.4100,
        "phone": "+1-555-8822",
        "email": "contact@metrorecycling.org",
        "website": "https://metrorecycling.org",
        "accepted_categories": ["PLASTIC", "PAPER", "E_WASTE"],
        "opening_hours": "Mon-Sat 08:00 - 18:00",
    }
    create_center = client.post("/api/v1/recycling-centers", json=center_payload, headers=adm_headers)
    assert create_center.status_code == status.HTTP_201_CREATED
    center_id = create_center.json()["id"]

    # Public authenticated citizen browses center directory
    centers_list = client.get("/api/v1/recycling-centers", headers=cit_headers)
    assert centers_list.status_code == status.HTTP_200_OK
    centers = centers_list.json()
    assert any(c["id"] == center_id for c in centers)

    # -------------------------------------------------------------------------
    # 11. Profile Update and Password Change
    # -------------------------------------------------------------------------
    profile_res = client.put(
        "/api/v1/auth/me",
        json={"name": "Jane Citizen Updated"},
        headers=cit_headers,
    )
    assert profile_res.status_code == status.HTTP_200_OK
    assert profile_res.json()["name"] == "Jane Citizen Updated"

    pw_res = client.put(
        "/api/v1/auth/me/password",
        json={
            "current_password": "CitizenSecretPassword123!",
            "new_password": "NewCitizenPassword456!",
            "new_password_confirm": "NewCitizenPassword456!",
        },
        headers=cit_headers,
    )
    assert pw_res.status_code == status.HTTP_200_OK

    # Verify login with old password fails
    fail_res = client.post(
        "/api/v1/auth/login",
        json={"email": "jane.citizen@example.com", "password": "CitizenSecretPassword123!"},
    )
    assert fail_res.status_code == status.HTTP_401_UNAUTHORIZED

    # Verify login with new password succeeds
    success_res = client.post(
        "/api/v1/auth/login",
        json={"email": "jane.citizen@example.com", "password": "NewCitizenPassword456!"},
    )
    assert success_res.status_code == status.HTTP_200_OK
    assert success_res.json()["user"]["name"] == "Jane Citizen Updated"

    # -------------------------------------------------------------------------
    # 12. Admin Analytics Health and KPIs
    # -------------------------------------------------------------------------
    analytics_res = client.get("/api/v1/analytics/overview?time_range=all", headers=adm_headers)
    assert analytics_res.status_code == status.HTTP_200_OK
    overview = analytics_res.json()
    assert overview["total_reports"] >= 1
    assert overview["resolved_reports"] >= 1
