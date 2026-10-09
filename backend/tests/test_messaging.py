"""Comprehensive test suite for direct messaging endpoints and authorization rules."""

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


class TestMessagingEndpoints:

    def test_citizen_cannot_message_another_citizen(self, client: TestClient, db_session: Session):
        """Citizens cannot initiate direct chat with another Citizen."""
        citizen1, token1 = _create_user(db_session, UserRole.CITIZEN, prefix="c1")
        citizen2, _ = _create_user(db_session, UserRole.CITIZEN, prefix="c2")

        response = client.post(
            "/api/v1/messaging/conversations",
            headers={"Authorization": f"Bearer {token1}"},
            json={"recipient_id": citizen2.id, "initial_message": "Hello citizen"},
        )
        res_data = response.json()
        error_msg = res_data.get("error", {}).get("message") or res_data.get("detail", "")
        assert "Citizens can only contact Collectors or Administrators" in error_msg

    def test_citizen_can_message_collector(self, client: TestClient, db_session: Session):
        """Citizen can initiate direct conversation with a Collector."""
        citizen, token = _create_user(db_session, UserRole.CITIZEN, prefix="citizen")
        collector, _ = _create_user(db_session, UserRole.COLLECTOR, prefix="collector")

        response = client.post(
            "/api/v1/messaging/conversations",
            headers={"Authorization": f"Bearer {token}"},
            json={"recipient_id": collector.id, "initial_message": "Hi Collector, about my pickup."},
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "id" in data
        assert len(data["participants"]) == 2

    def test_reusing_existing_conversation(self, client: TestClient, db_session: Session):
        """Initiating a conversation with the same recipient reuses the existing thread."""
        citizen, token = _create_user(db_session, UserRole.CITIZEN, prefix="cit_reuse")
        collector, _ = _create_user(db_session, UserRole.COLLECTOR, prefix="col_reuse")

        resp1 = client.post(
            "/api/v1/messaging/conversations",
            headers={"Authorization": f"Bearer {token}"},
            json={"recipient_id": collector.id},
        )
        assert resp1.status_code == status.HTTP_201_CREATED
        conv1_id = resp1.json()["id"]

        resp2 = client.post(
            "/api/v1/messaging/conversations",
            headers={"Authorization": f"Bearer {token}"},
            json={"recipient_id": collector.id},
        )
        assert resp2.status_code == status.HTTP_201_CREATED
        assert resp2.json()["id"] == conv1_id

    def test_non_participant_cannot_access_messages(self, client: TestClient, db_session: Session):
        """A user who is not a participant in a conversation cannot read messages."""
        citizen1, token1 = _create_user(db_session, UserRole.CITIZEN, prefix="cit_nonp")
        collector, _ = _create_user(db_session, UserRole.COLLECTOR, prefix="col_nonp")
        citizen2, token2 = _create_user(db_session, UserRole.CITIZEN, prefix="cit2_nonp")

        # Citizen 1 starts conversation with Collector
        conv_resp = client.post(
            "/api/v1/messaging/conversations",
            headers={"Authorization": f"Bearer {token1}"},
            json={"recipient_id": collector.id, "initial_message": "Private message"},
        )
        conv_id = conv_resp.json()["id"]

        # Citizen 2 attempts to fetch messages of Citizen 1's conversation
        get_resp = client.get(
            f"/api/v1/messaging/conversations/{conv_id}/messages",
            headers={"Authorization": f"Bearer {token2}"},
        )
        assert get_resp.status_code == status.HTTP_404_NOT_FOUND

    def test_send_and_retrieve_messages_and_unread_count(self, client: TestClient, db_session: Session):
        """Send message, check list, pagination, and unread count."""
        citizen, cit_token = _create_user(db_session, UserRole.CITIZEN, prefix="cit_flow")
        collector, col_token = _create_user(db_session, UserRole.COLLECTOR, prefix="col_flow")

        conv_resp = client.post(
            "/api/v1/messaging/conversations",
            headers={"Authorization": f"Bearer {cit_token}"},
            json={"recipient_id": collector.id},
        )
        conv_id = conv_resp.json()["id"]

        # Send text message from Citizen
        msg_resp = client.post(
            f"/api/v1/messaging/conversations/{conv_id}/messages",
            headers={"Authorization": f"Bearer {cit_token}"},
            json={"body": "Hello world from test!"},
        )
        assert msg_resp.status_code == status.HTTP_201_CREATED
        msg_data = msg_resp.json()
        assert msg_data["body"] == "Hello world from test!"
        assert msg_data["sender_id"] == citizen.id

        # Collector checks unread count -> 1
        unread_resp = client.get(
            "/api/v1/messaging/unread-count",
            headers={"Authorization": f"Bearer {col_token}"},
        )
        assert unread_resp.status_code == status.HTTP_200_OK
        assert unread_resp.json()["unread_count"] >= 1

        # Collector views messages -> marks read
        list_resp = client.get(
            f"/api/v1/messaging/conversations/{conv_id}/messages",
            headers={"Authorization": f"Bearer {col_token}"},
        )
        assert list_resp.status_code == status.HTTP_200_OK
        assert len(list_resp.json()["items"]) >= 1

        # Collector checks unread count -> 0
        unread_after = client.get(
            "/api/v1/messaging/unread-count",
            headers={"Authorization": f"Bearer {col_token}"},
        )
        assert unread_after.json()["unread_count"] == 0
