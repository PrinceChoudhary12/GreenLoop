"""Tests for location tracking, consent toggling, and geospatial map authorization."""

import uuid
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.security import create_access_token, get_password_hash
from backend.app.models.enums import UserRole
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


class TestLocationEndpoints:

    def test_update_location_valid(self, client: TestClient, db_session: Session):
        """User can update GPS coordinates within valid ranges."""
        user, token = _create_user(db_session, UserRole.CITIZEN, prefix="loc_user")
        response = client.post(
            "/api/v1/location/update",
            headers={"Authorization": f"Bearer {token}"},
            json={"latitude": 37.7749, "longitude": -122.4194, "is_sharing_active": True},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["latitude"] == 37.7749
        assert data["longitude"] == -122.4194
        assert data["is_sharing_active"] is True

    def test_update_location_invalid_coordinates(self, client: TestClient, db_session: Session):
        """Out of range latitude or longitude must be rejected."""
        user, token = _create_user(db_session, UserRole.CITIZEN, prefix="loc_user_invalid")

        # Invalid latitude (> 90)
        res1 = client.post(
            "/api/v1/location/update",
            headers={"Authorization": f"Bearer {token}"},
            json={"latitude": 105.0, "longitude": -122.4194},
        )
        assert res1.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

        # Invalid longitude (< -180)
        res2 = client.post(
            "/api/v1/location/update",
            headers={"Authorization": f"Bearer {token}"},
            json={"latitude": 37.7749, "longitude": -200.0},
        )
        assert res2.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_toggle_consent(self, client: TestClient, db_session: Session):
        """User can enable or disable location sharing consent."""
        user, token = _create_user(db_session, UserRole.CITIZEN, prefix="consent_user")
        response = client.post(
            "/api/v1/location/consent",
            headers={"Authorization": f"Bearer {token}"},
            json={"is_sharing_active": True},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["is_sharing_active"] is True

        response_off = client.post(
            "/api/v1/location/consent",
            headers={"Authorization": f"Bearer {token}"},
            json={"is_sharing_active": False},
        )
        assert response_off.status_code == status.HTTP_200_OK
        assert response_off.json()["is_sharing_active"] is False

    def test_get_map_data_authorization(self, client: TestClient, db_session: Session):
        """Map data returns points authorized for the user's role."""
        citizen, cit_token = _create_user(db_session, UserRole.CITIZEN, prefix="cit_map")
        admin, admin_token = _create_user(db_session, UserRole.ADMIN, prefix="admin_map")

        res_cit = client.get(
            "/api/v1/location/map-data",
            headers={"Authorization": f"Bearer {cit_token}"},
        )
        assert res_cit.status_code == status.HTTP_200_OK
        assert "points" in res_cit.json()

        res_admin = client.get(
            "/api/v1/location/map-data",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_admin.status_code == status.HTTP_200_OK
        assert "points" in res_admin.json()
