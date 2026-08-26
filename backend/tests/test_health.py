"""Tests for application health check endpoints."""

from fastapi import status
from fastapi.testclient import TestClient


def test_root_health_check(client: TestClient):
    """Test root GET /health endpoint."""
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["status"] == "healthy"
    assert data["app_name"] == "GreenLoop"
    assert data["version"] == "1.0.0"
    assert "environment" in data
    assert "components" in data
    assert "database" in data["components"]
    assert data["components"]["database"]["status"] == "healthy"


def test_api_v1_health_check(client: TestClient):
    """Test versioned GET /api/v1/health endpoint."""
    response = client.get("/api/v1/health")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["status"] == "healthy"
    assert data["app_name"] == "GreenLoop"
    assert "components" in data
    assert data["components"]["database"]["status"] == "healthy"
