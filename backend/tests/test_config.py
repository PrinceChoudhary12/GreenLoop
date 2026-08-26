"""Tests for application configuration."""

from backend.app.core.config import Settings


def test_default_settings():
    """Verify default settings instantiation and values."""
    settings = Settings()
    assert settings.APP_NAME == "GreenLoop"
    assert settings.APP_VERSION == "1.0.0"
    assert settings.API_V1_STR == "/api/v1"
    assert isinstance(settings.BACKEND_CORS_ORIGINS, list)
    assert len(settings.BACKEND_CORS_ORIGINS) > 0


def test_cors_origins_parsing_comma_separated():
    """Verify CORS origins parsed from comma-separated string."""
    settings = Settings(BACKEND_CORS_ORIGINS="http://localhost:3000,http://example.com")
    assert "http://localhost:3000" in settings.BACKEND_CORS_ORIGINS
    assert "http://example.com" in settings.BACKEND_CORS_ORIGINS
