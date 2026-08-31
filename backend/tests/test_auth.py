"""Tests for user registration, authentication, and JWT authorization."""

from fastapi import status
from fastapi.testclient import TestClient

from backend.app.core.security import verify_password
from backend.app.models.user import User


def test_register_citizen_success(client: TestClient, db_session):
    """Verify citizen registration creates account with hashed password and returns token."""
    payload = {
        "name": "Sarah Jenkins",
        "email": "sarah.jenkins@example.com",
        "password": "SecurePassword123!",
        "password_confirm": "SecurePassword123!",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == status.HTTP_201_CREATED

    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["name"] == "Sarah Jenkins"
    assert data["user"]["email"] == "sarah.jenkins@example.com"
    assert data["user"]["role"] == "CITIZEN"
    assert data["user"]["is_active"] is True

    # Check DB directly to confirm password hash
    user = db_session.query(User).filter(User.email == "sarah.jenkins@example.com").first()
    assert user is not None
    assert user.password_hash != "SecurePassword123!"
    assert verify_password("SecurePassword123!", user.password_hash)


def test_register_duplicate_email_rejection(client: TestClient):
    """Verify duplicate registration with same email returns 409 Conflict."""
    payload = {
        "name": "John Doe",
        "email": "duplicate@example.com",
        "password": "Password12345",
        "password_confirm": "Password12345",
    }
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == status.HTTP_201_CREATED

    # Attempt second registration with same email (even with different case)
    payload2 = {
        "name": "Another Name",
        "email": "DUPLICATE@example.com",
        "password": "Password12345",
        "password_confirm": "Password12345",
    }
    res2 = client.post("/api/v1/auth/register", json=payload2)
    assert res2.status_code == status.HTTP_409_CONFLICT
    data = res2.json()
    assert "error" in data
    assert data["error"]["code"] == "EMAIL_ALREADY_EXISTS"


def test_register_password_mismatch(client: TestClient):
    """Verify validation error when password confirmation does not match."""
    payload = {
        "name": "Mismatch Test",
        "email": "mismatch@example.com",
        "password": "Password123",
        "password_confirm": "DifferentPassword123",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_login_success(client: TestClient):
    """Verify successful login returns valid JWT access token."""
    # Register first
    client.post(
        "/api/v1/auth/register",
        json={
            "name": "Login User",
            "email": "loginuser@example.com",
            "password": "LoginPassword123!",
            "password_confirm": "LoginPassword123!",
        },
    )

    # Login
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "loginuser@example.com", "password": "LoginPassword123!"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "loginuser@example.com"


def test_login_invalid_credentials(client: TestClient):
    """Verify login failure on incorrect password or non-existent email."""
    # Non-existent email
    res1 = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "AnyPassword123"},
    )
    assert res1.status_code == status.HTTP_401_UNAUTHORIZED

    # Wrong password for existing user
    client.post(
        "/api/v1/auth/register",
        json={
            "name": "Wrong Pass User",
            "email": "wrongpass@example.com",
            "password": "CorrectPassword123",
            "password_confirm": "CorrectPassword123",
        },
    )
    res2 = client.post(
        "/api/v1/auth/login",
        json={"email": "wrongpass@example.com", "password": "WrongPassword!"},
    )
    assert res2.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_current_user_me(client: TestClient):
    """Verify /api/v1/auth/me requires valid token and returns authenticated profile."""
    # Unauthenticated request -> 401
    unauth_res = client.get("/api/v1/auth/me")
    assert unauth_res.status_code == status.HTTP_401_UNAUTHORIZED

    # Register & get token
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Profile User",
            "email": "profile@example.com",
            "password": "MyPassword123!",
            "password_confirm": "MyPassword123!",
        },
    )
    token = reg_res.json()["access_token"]

    # Authenticated request -> 200
    headers = {"Authorization": f"Bearer {token}"}
    auth_res = client.get("/api/v1/auth/me", headers=headers)
    assert auth_res.status_code == status.HTTP_200_OK
    data = auth_res.json()
    assert data["name"] == "Profile User"
    assert data["email"] == "profile@example.com"
    assert data["role"] == "CITIZEN"
