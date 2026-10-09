"""Integration tests for the Recycling Centers API — M08."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.models.user import User
from backend.app.models.enums import UserRole
from backend.app.core.security import get_password_hash, create_access_token


# ── Helpers ──────────────────────────────────────────────────────────────────

def _create_user(db: Session, *, name: str, email: str, role: UserRole) -> tuple[User, str]:
    """Create a user and return (user, bearer_token)."""
    user = User(
        name=name,
        email=email,
        password_hash=get_password_hash("testpassword"),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(subject=str(user.id), role=role.value)
    return user, token


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


CENTER_PAYLOAD = {
    "name": "EcoHub Recycling",
    "address": "123 Green Street, Eco City",
    "description": "Accepts most common recyclables",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "phone": "+1 555 000 1234",
    "email": "info@ecohub.test",
    "website": "https://ecohub.test",
    "accepted_categories": "PLASTIC,GLASS,METAL",
    "opening_hours": "Mon-Fri 08:00-18:00",
    "is_active": True,
}


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestRecyclingCentersAuth:
    """Authorization tests."""

    def test_list_requires_auth(self, client: TestClient) -> None:
        """Unauthenticated list request must return 403 (no bearer)."""
        resp = client.get("/api/v1/recycling-centers")
        assert resp.status_code in (401, 403)

    def test_create_requires_admin(self, client: TestClient, db_session: Session) -> None:
        """Non-admin user must not create a center."""
        _, citizen_token = _create_user(db_session, name="Citizen1", email="c1@test.com", role=UserRole.CITIZEN)
        resp = client.post("/api/v1/recycling-centers", json=CENTER_PAYLOAD, headers=_auth(citizen_token))
        assert resp.status_code == 403

    def test_delete_requires_admin(self, client: TestClient, db_session: Session) -> None:
        """Non-admin user must not delete a center."""
        _, admin_token = _create_user(db_session, name="Admin1", email="a1@test.com", role=UserRole.ADMIN)
        create_resp = client.post("/api/v1/recycling-centers", json=CENTER_PAYLOAD, headers=_auth(admin_token))
        assert create_resp.status_code == 201
        center_id = create_resp.json()["id"]

        _, citizen_token = _create_user(db_session, name="Citizen2", email="c2@test.com", role=UserRole.CITIZEN)
        del_resp = client.delete(f"/api/v1/recycling-centers/{center_id}", headers=_auth(citizen_token))
        assert del_resp.status_code == 403


class TestRecyclingCentersCRUD:
    """Full CRUD lifecycle tests (admin)."""

    def test_admin_create_center(self, client: TestClient, db_session: Session) -> None:
        """Admin can create a recycling center with all fields."""
        _, token = _create_user(db_session, name="Admin2", email="a2@test.com", role=UserRole.ADMIN)
        resp = client.post("/api/v1/recycling-centers", json=CENTER_PAYLOAD, headers=_auth(token))
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "EcoHub Recycling"
        assert data["address"] == "123 Green Street, Eco City"
        assert "PLASTIC" in (data["accepted_categories"] or "")
        assert data["is_active"] is True
        assert data["id"] > 0

    def test_list_centers_authenticated(self, client: TestClient, db_session: Session) -> None:
        """Any authenticated user can list active centers."""
        _, admin_token = _create_user(db_session, name="Admin3", email="a3@test.com", role=UserRole.ADMIN)
        client.post("/api/v1/recycling-centers", json=CENTER_PAYLOAD, headers=_auth(admin_token))

        _, citizen_token = _create_user(db_session, name="Citizen3", email="c3@test.com", role=UserRole.CITIZEN)
        resp = client.get("/api/v1/recycling-centers", headers=_auth(citizen_token))
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_get_center_detail(self, client: TestClient, db_session: Session) -> None:
        """Retrieve a specific center by ID."""
        _, token = _create_user(db_session, name="Admin4", email="a4@test.com", role=UserRole.ADMIN)
        create_resp = client.post("/api/v1/recycling-centers", json=CENTER_PAYLOAD, headers=_auth(token))
        center_id = create_resp.json()["id"]

        resp = client.get(f"/api/v1/recycling-centers/{center_id}", headers=_auth(token))
        assert resp.status_code == 200
        assert resp.json()["id"] == center_id

    def test_admin_update_center(self, client: TestClient, db_session: Session) -> None:
        """Admin can update a center's name and accepted_categories."""
        _, token = _create_user(db_session, name="Admin5", email="a5@test.com", role=UserRole.ADMIN)
        create_resp = client.post("/api/v1/recycling-centers", json=CENTER_PAYLOAD, headers=_auth(token))
        center_id = create_resp.json()["id"]

        update = {"name": "Updated EcoHub", "accepted_categories": "GLASS,PAPER"}
        resp = client.put(f"/api/v1/recycling-centers/{center_id}", json=update, headers=_auth(token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Updated EcoHub"
        assert "GLASS" in (data["accepted_categories"] or "")

    def test_admin_soft_delete_center(self, client: TestClient, db_session: Session) -> None:
        """Soft-delete sets is_active=False rather than removing the record."""
        _, token = _create_user(db_session, name="Admin6", email="a6@test.com", role=UserRole.ADMIN)
        create_resp = client.post("/api/v1/recycling-centers", json=CENTER_PAYLOAD, headers=_auth(token))
        center_id = create_resp.json()["id"]

        del_resp = client.delete(f"/api/v1/recycling-centers/{center_id}", headers=_auth(token))
        assert del_resp.status_code == 200
        assert del_resp.json()["is_active"] is False

        # Center should still be retrievable by admin (not in default active listing)
        detail = client.get(f"/api/v1/recycling-centers/{center_id}", headers=_auth(token))
        assert detail.status_code == 200
        assert detail.json()["is_active"] is False

    def test_get_nonexistent_center_returns_404(self, client: TestClient, db_session: Session) -> None:
        """Requesting a missing center ID returns 404."""
        _, token = _create_user(db_session, name="Admin7", email="a7@test.com", role=UserRole.ADMIN)
        resp = client.get("/api/v1/recycling-centers/99999", headers=_auth(token))
        assert resp.status_code == 404


class TestRecyclingCentersFilters:
    """Search and filter tests."""

    def test_search_filter_by_name(self, client: TestClient, db_session: Session) -> None:
        """Search query filters centers by name."""
        _, token = _create_user(db_session, name="Admin8", email="a8@test.com", role=UserRole.ADMIN)
        client.post("/api/v1/recycling-centers", json={**CENTER_PAYLOAD, "name": "SearchTarget Hub"}, headers=_auth(token))
        client.post("/api/v1/recycling-centers", json={**CENTER_PAYLOAD, "name": "Other Center", "email": "oc@test.com"}, headers=_auth(token))

        resp = client.get("/api/v1/recycling-centers?search=SearchTarget", headers=_auth(token))
        assert resp.status_code == 200
        results = resp.json()
        assert all("searchtarget" in r["name"].lower() for r in results)

    def test_category_filter(self, client: TestClient, db_session: Session) -> None:
        """Category filter returns only centers accepting that category."""
        _, token = _create_user(db_session, name="Admin9", email="a9@test.com", role=UserRole.ADMIN)
        client.post("/api/v1/recycling-centers", json={**CENTER_PAYLOAD, "accepted_categories": "HAZARDOUS", "email": "hz@test.com"}, headers=_auth(token))

        resp = client.get("/api/v1/recycling-centers?category=HAZARDOUS", headers=_auth(token))
        assert resp.status_code == 200
        results = resp.json()
        assert any("HAZARDOUS" in (r["accepted_categories"] or "") for r in results)
