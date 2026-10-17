"""Automated verification for production security hardening.

Tests security headers, request payload protection, magic byte signature checks,
and rate limiting protection.
"""

import io
import pytest
from fastapi import status
from fastapi.testclient import TestClient

from backend.app.core.exceptions import AppException
from backend.app.core.rate_limit import limiter
from backend.app.services.storage_service import StorageService
from fastapi import UploadFile


def test_security_headers_present_on_responses(client: TestClient):
    """Verify security headers (CSP, nosniff, DENY, etc.) are attached to API responses."""
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK

    headers = response.headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("X-XSS-Protection") == "1; mode=block"
    assert "default-src 'self'" in headers.get("Content-Security-Policy", "")
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


def test_rate_limiting_enforcement(client: TestClient):
    """Verify rate limiter blocks excessive requests with 429 status and Retry-After header."""
    limiter.clear()
    headers = {"x-test-rate-limit": "true", "x-forwarded-for": "198.51.100.42"}

    # Simulate rapid auth requests exceeding auth threshold
    hit_429 = False
    for _ in range(35):
        res = client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@example.com", "password": "wrongpassword123"},
            headers=headers,
        )
        if res.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            hit_429 = True
            assert "Retry-After" in res.headers
            assert res.json()["error"]["code"] == "RATE_LIMIT_EXCEEDED"
            break

    assert hit_429, "Rate limiter should have triggered HTTP 429 on excessive requests"
    limiter.clear()


@pytest.mark.asyncio
async def test_storage_rejects_disguised_file_signature():
    """Verify storage rejects non-image files masquerading as images via fake mime types."""
    # Text content disguised as image/jpeg
    fake_payload = io.BytesIO(b"<!DOCTYPE html><html><script>alert(1)</script></html>")
    upload = UploadFile(
        filename="exploit.jpg",
        file=fake_payload,
        headers={"content-type": "image/jpeg"},
    )

    with pytest.raises(AppException) as exc_info:
        await StorageService.save_image(upload)

    assert exc_info.value.status_code == 400
    assert exc_info.value.error_code == "INVALID_FILE_SIGNATURE"


def test_request_payload_too_large_rejection(client: TestClient):
    """Verify requests with Content-Length exceeding maximum allowed bytes are rejected with 413."""
    headers = {"content-length": str(15 * 1024 * 1024)}  # 15 MB
    res = client.post("/api/v1/auth/login", json={}, headers=headers)
    assert res.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
    assert res.json()["error"]["code"] == "PAYLOAD_TOO_LARGE"
