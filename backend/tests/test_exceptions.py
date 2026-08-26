"""Tests for centralized exception handling."""

from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from backend.app.core.exceptions import (
    AppException,
    ResourceNotFoundException,
    register_exception_handlers,
)


def test_custom_exception_handling():
    """Verify custom AppException produces structured error response without stacktrace."""
    test_app = FastAPI()
    register_exception_handlers(test_app)

    @test_app.get("/trigger-error")
    def trigger():
        raise AppException(
            message="Custom failure occurred",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="CUSTOM_FAILURE",
            details={"field": "test"},
        )

    client = TestClient(test_app)
    response = client.get("/trigger-error")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "CUSTOM_FAILURE"
    assert data["error"]["message"] == "Custom failure occurred"
    assert data["error"]["details"] == {"field": "test"}


def test_not_found_exception():
    """Verify ResourceNotFoundException response."""
    test_app = FastAPI()
    register_exception_handlers(test_app)

    @test_app.get("/trigger-404")
    def trigger_404():
        raise ResourceNotFoundException(resource="Report", identifier="123")

    client = TestClient(test_app)
    response = client.get("/trigger-404")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    data = response.json()
    assert data["error"]["code"] == "NOT_FOUND"
    assert "Report with identifier '123' not found" in data["error"]["message"]
