"""Tests for waste report submission, retrieval, and authorization ownership."""

import io
from fastapi import status
from fastapi.testclient import TestClient


def _get_auth_headers(client: TestClient, email: str, name: str = "Test Citizen") -> dict:
    """Helper to register and obtain auth headers for testing."""
    res = client.post(
        "/api/v1/auth/register",
        json={
            "name": name,
            "email": email,
            "password": "Password12345!",
            "password_confirm": "Password12345!",
        },
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_report_success(client: TestClient):
    """Verify authenticated citizen can submit a valid waste report."""
    headers = _get_auth_headers(client, "citizen1@example.com")

    form_data = {
        "category": "PLASTIC",
        "description": "Accumulation of plastic bottles and containers near the park bench.",
        "location": "Central Park, North Entrance",
        "priority": "HIGH",
    }
    response = client.post("/api/v1/reports", data=form_data, headers=headers)
    assert response.status_code == status.HTTP_201_CREATED

    data = response.json()
    assert data["category"] == "PLASTIC"
    assert data["description"] == form_data["description"]
    assert data["location"] == form_data["location"]
    assert data["priority"] == "HIGH"
    assert data["status"] == "SUBMITTED"  # Server-enforced initial status
    assert "id" in data
    assert "created_at" in data


def test_create_report_with_image(client: TestClient):
    """Verify report submission with optional valid image attachment."""
    headers = _get_auth_headers(client, "citizen_img@example.com")

    # Mock PNG file
    fake_png = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4")
    files = {"image": ("test_litter.png", fake_png, "image/png")}
    form_data = {
        "category": "GLASS",
        "description": "Broken glass bottles scattered across the pavement.",
        "location": "Corner of 5th Ave and Pine St",
        "priority": "MEDIUM",
    }

    response = client.post("/api/v1/reports", data=form_data, files=files, headers=headers)
    assert response.status_code == status.HTTP_201_CREATED

    data = response.json()
    assert data["image_path"] is not None
    assert data["image_path"].startswith("/uploads/")
    assert data["image_path"].endswith(".png")


def test_create_report_validation_errors(client: TestClient):
    """Verify validation errors for invalid category, empty description, or short location."""
    headers = _get_auth_headers(client, "citizen_val@example.com")

    # Invalid category
    res1 = client.post(
        "/api/v1/reports",
        data={
            "category": "INVALID_CAT",
            "description": "Valid description length here",
            "location": "Valid location",
        },
        headers=headers,
    )
    assert res1.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Description too short
    res2 = client.post(
        "/api/v1/reports",
        data={
            "category": "ORGANIC",
            "description": "Hi",
            "location": "Valid location",
        },
        headers=headers,
    )
    assert res2.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_list_reports_user_isolation(client: TestClient):
    """Verify citizen only retrieves their own reports and not other citizens' reports."""
    headers_a = _get_auth_headers(client, "citizen_a@example.com", "Citizen A")
    headers_b = _get_auth_headers(client, "citizen_b@example.com", "Citizen B")

    # Citizen A creates 2 reports
    client.post(
        "/api/v1/reports",
        data={"category": "METAL", "description": "Rusty metal pipes discarded on sidewalk", "location": "Old Market"},
        headers=headers_a,
    )
    client.post(
        "/api/v1/reports",
        data={"category": "PAPER", "description": "Cardboard boxes left near dumpster", "location": "Warehouse District"},
        headers=headers_a,
    )

    # Citizen B creates 1 report
    client.post(
        "/api/v1/reports",
        data={"category": "E_WASTE", "description": "Discarded electronic monitor and cables", "location": "Tech Hub Street"},
        headers=headers_b,
    )

    # Citizen A list query
    res_a = client.get("/api/v1/reports", headers=headers_a)
    assert res_a.status_code == status.HTTP_200_OK
    reports_a = res_a.json()
    assert len(reports_a) == 2
    assert all(r["category"] in ["METAL", "PAPER"] for r in reports_a)

    # Citizen B list query
    res_b = client.get("/api/v1/reports", headers=headers_b)
    assert res_b.status_code == status.HTTP_200_OK
    reports_b = res_b.json()
    assert len(reports_b) == 1
    assert reports_b[0]["category"] == "E_WASTE"


def test_get_report_details_ownership_enforcement(client: TestClient):
    """Verify citizen cannot retrieve details of a report submitted by another user."""
    headers_owner = _get_auth_headers(client, "owner@example.com", "Owner")
    headers_other = _get_auth_headers(client, "other@example.com", "Other")

    # Create report as Owner
    create_res = client.post(
        "/api/v1/reports",
        data={"category": "HAZARDOUS", "description": "Leaking paint cans behind garage", "location": "Industrial Area"},
        headers=headers_owner,
    )
    report_id = create_res.json()["id"]

    # Owner can access -> 200
    res_owner = client.get(f"/api/v1/reports/{report_id}", headers=headers_owner)
    assert res_owner.status_code == status.HTTP_200_OK
    assert res_owner.json()["id"] == report_id

    # Other citizen attempt -> 403 Forbidden
    res_other = client.get(f"/api/v1/reports/{report_id}", headers=headers_other)
    assert res_other.status_code == status.HTTP_403_FORBIDDEN
    assert res_other.json()["error"]["code"] == "UNAUTHORIZED_REPORT_ACCESS"
