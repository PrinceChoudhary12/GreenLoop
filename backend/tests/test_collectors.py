"""Tests for collector endpoints, report claiming, and status workflow."""

from fastapi import status
from fastapi.testclient import TestClient

from backend.app.models.enums import UserRole
from backend.app.models.user import User


def _register_citizen(client: TestClient, email: str = "citizen@example.com") -> str:
    res = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Citizen User",
            "email": email,
            "password": "SecurePassword123!",
            "password_confirm": "SecurePassword123!",
        },
    )
    assert res.status_code == status.HTTP_201_CREATED
    return res.json()["access_token"]


def _register_collector(client: TestClient, email: str = "collector@example.com") -> str:
    res = client.post(
        "/api/v1/auth/register/collector",
        json={
            "name": "Collector User",
            "email": email,
            "password": "CollectorPass123!",
            "password_confirm": "CollectorPass123!",
        },
    )
    assert res.status_code == status.HTTP_201_CREATED
    return res.json()["access_token"]


def test_register_collector_success(client: TestClient, db_session):
    """Verify collector registration creates a user with COLLECTOR role."""
    email = "avery.collector@example.com"
    token = _register_collector(client, email)
    assert token

    user = db_session.query(User).filter(User.email == email).first()
    assert user is not None
    assert user.role == UserRole.COLLECTOR


def test_collector_profile_me_returns_metrics(client: TestClient):
    """Verify collector /me endpoint returns profile and aggregated metrics."""
    collector_token = _register_collector(client, "metrics.collector@example.com")
    headers = {"Authorization": f"Bearer {collector_token}"}

    res = client.get("/api/v1/collectors/me", headers=headers)
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["email"] == "metrics.collector@example.com"
    assert data["role"] == "COLLECTOR"
    assert "metrics" in data
    assert "available_count" in data["metrics"]
    assert "assigned_count" in data["metrics"]


def test_collector_available_reports_and_claim(client: TestClient):
    """Verify collector can see submitted reports, claim one, and see it in assigned queue."""
    citizen_token = _register_citizen(client, "reporter@example.com")
    collector_token = _register_collector(client, "pickup.collector@example.com")

    # Citizen submits a report
    c_headers = {"Authorization": f"Bearer {citizen_token}"}
    create_res = client.post(
        "/api/v1/reports",
        data={
            "category": "PLASTIC",
            "description": "Bottles on sidewalk",
            "location": "5th Avenue",
            "priority": "HIGH",
        },
        headers=c_headers,
    )
    assert create_res.status_code == status.HTTP_201_CREATED
    report_id = create_res.json()["id"]

    # Collector views available queue
    col_headers = {"Authorization": f"Bearer {collector_token}"}
    avail_res = client.get("/api/v1/collectors/reports/available", headers=col_headers)
    assert avail_res.status_code == status.HTTP_200_OK
    avail_ids = [r["id"] for r in avail_res.json()]
    assert report_id in avail_ids

    # Collector claims report
    claim_res = client.post(f"/api/v1/collectors/reports/{report_id}/claim", headers=col_headers)
    assert claim_res.status_code == status.HTTP_200_OK
    claimed_data = claim_res.json()
    assert claimed_data["status"] == "UNDER_REVIEW"
    assert claimed_data["collector_id"] is not None

    # Verify report is now in collector's assigned list
    assigned_res = client.get("/api/v1/collectors/reports/assigned", headers=col_headers)
    assert assigned_res.status_code == status.HTTP_200_OK
    assigned_ids = [r["id"] for r in assigned_res.json()]
    assert report_id in assigned_ids


def test_collector_status_update_workflow(client: TestClient):
    """Verify collector can advance status from UNDER_REVIEW -> ACCEPTED -> RESOLVED."""
    citizen_token = _register_citizen(client, "citizen.lifecycle@example.com")
    collector_token = _register_collector(client, "collector.lifecycle@example.com")

    # Create & claim
    c_headers = {"Authorization": f"Bearer {citizen_token}"}
    col_headers = {"Authorization": f"Bearer {collector_token}"}
    report_id = client.post(
        "/api/v1/reports",
        data={"category": "ORGANIC", "description": "Compost bags", "location": "Park"},
        headers=c_headers,
    ).json()["id"]

    client.post(f"/api/v1/collectors/reports/{report_id}/claim", headers=col_headers)

    # 1. Update to ACCEPTED
    res1 = client.patch(
        f"/api/v1/collectors/reports/{report_id}/status",
        json={"status": "ACCEPTED"},
        headers=col_headers,
    )
    assert res1.status_code == status.HTTP_200_OK
    assert res1.json()["status"] == "ACCEPTED"

    # 2. Update to RESOLVED
    res2 = client.patch(
        f"/api/v1/collectors/reports/{report_id}/status",
        json={"status": "RESOLVED"},
        headers=col_headers,
    )
    assert res2.status_code == status.HTTP_200_OK
    assert res2.json()["status"] == "RESOLVED"


def test_citizen_cannot_access_collector_endpoints(client: TestClient):
    """Verify citizen role is rejected (403 Forbidden) from collector routes."""
    citizen_token = _register_citizen(client, "citizen.blocked@example.com")
    headers = {"Authorization": f"Bearer {citizen_token}"}

    res_me = client.get("/api/v1/collectors/me", headers=headers)
    assert res_me.status_code == status.HTTP_403_FORBIDDEN
    assert res_me.json()["error"]["code"] == "FORBIDDEN_ROLE"

    res_avail = client.get("/api/v1/collectors/reports/available", headers=headers)
    assert res_avail.status_code == status.HTTP_403_FORBIDDEN


def test_collector_cannot_create_citizen_report(client: TestClient):
    """Verify collector cannot submit reports via /api/v1/reports."""
    collector_token = _register_collector(client, "collector.blocked@example.com")
    headers = {"Authorization": f"Bearer {collector_token}"}

    res = client.post(
        "/api/v1/reports",
        data={"category": "METAL", "description": "Metal pipes", "location": "Street"},
        headers=headers,
    )
    assert res.status_code == status.HTTP_403_FORBIDDEN
    assert res.json()["error"]["code"] == "FORBIDDEN_ROLE"
