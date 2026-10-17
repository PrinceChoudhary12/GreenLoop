"""Tests for application configuration and production hardening."""

import pytest
from pydantic import ValidationError
from backend.app.core.config import Settings


def test_default_settings():
    """Verify default settings instantiation and values in development."""
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


# ==============================================================================
# PRODUCTION CONFIGURATION HARDENING TESTS
# ==============================================================================

VALID_PROD_SECRET = "a" * 64
VALID_PROD_DB = "postgresql+psycopg2://user:RealProductionPass2026!@db:5432/greenloop"
VALID_PROD_CORS = "https://greencycle.eco,https://app.greencycle.eco"


def test_production_accepts_valid_hardened_config():
    """Verify production startup succeeds when all production secrets and origins are valid."""
    settings = Settings(
        APP_ENV="production",
        DEBUG=False,
        SECRET_KEY=VALID_PROD_SECRET,
        DATABASE_URL=VALID_PROD_DB,
        BACKEND_CORS_ORIGINS=VALID_PROD_CORS,
    )
    assert settings.APP_ENV == "production"
    assert settings.DEBUG is False
    assert settings.SECRET_KEY == VALID_PROD_SECRET
    assert "https://greencycle.eco" in settings.BACKEND_CORS_ORIGINS


def test_production_rejects_debug_true():
    """Verify production startup fails if DEBUG is True."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            APP_ENV="production",
            DEBUG=True,
            SECRET_KEY=VALID_PROD_SECRET,
            DATABASE_URL=VALID_PROD_DB,
            BACKEND_CORS_ORIGINS=VALID_PROD_CORS,
        )
    assert "DEBUG must be set to False in production" in str(exc_info.value)


@pytest.mark.parametrize(
    "placeholder_secret",
    [
        "greenloop-dev-secret-key-change-in-production-min-32-chars-long",
        "greenloop-production-secret-key-replace-with-secure-32-chars-token",
        "replace_with_strong_secret_key_minimum_32_characters_long",
        "some-placeholder-secret-key-that-is-long-enough-32",
        "change-in-production-secret-key-for-greenloop-32",
    ],
)
def test_production_rejects_placeholder_secret_key(placeholder_secret: str):
    """Verify production startup fails when SECRET_KEY matches known placeholders."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            APP_ENV="production",
            DEBUG=False,
            SECRET_KEY=placeholder_secret,
            DATABASE_URL=VALID_PROD_DB,
            BACKEND_CORS_ORIGINS=VALID_PROD_CORS,
        )
    assert "Cannot use development defaults or known placeholder tokens" in str(exc_info.value)


def test_production_rejects_short_secret_key():
    """Verify production startup fails when SECRET_KEY is shorter than 32 characters."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            APP_ENV="production",
            DEBUG=False,
            SECRET_KEY="short-secret-12345",
            DATABASE_URL=VALID_PROD_DB,
            BACKEND_CORS_ORIGINS=VALID_PROD_CORS,
        )
    assert "SECRET_KEY must be at least 32 characters long" in str(exc_info.value)


def test_production_rejects_sqlite_database():
    """Verify production startup fails when DATABASE_URL uses SQLite."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            APP_ENV="production",
            DEBUG=False,
            SECRET_KEY=VALID_PROD_SECRET,
            DATABASE_URL="sqlite:///./production.db",
            BACKEND_CORS_ORIGINS=VALID_PROD_CORS,
        )
    assert "DATABASE_URL cannot use SQLite in production" in str(exc_info.value)


@pytest.mark.parametrize(
    "placeholder_db_url",
    [
        "postgresql+psycopg2://user:greenloop_secure_password_replace_in_prod@db:5432/greenloop",
        "postgresql+psycopg2://user:replace_with_strong_database_password_min_24_chars@db:5432/greenloop",
        "postgresql+psycopg2://postgres:password@db:5432/greenloop",
        "postgresql+psycopg2://user:root@db:5432/greenloop",
    ],
)
def test_production_rejects_placeholder_database_password(placeholder_db_url: str):
    """Verify production startup fails when DATABASE_URL contains default/placeholder passwords."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            APP_ENV="production",
            DEBUG=False,
            SECRET_KEY=VALID_PROD_SECRET,
            DATABASE_URL=placeholder_db_url,
            BACKEND_CORS_ORIGINS=VALID_PROD_CORS,
        )
    assert "contains insecure placeholder password" in str(exc_info.value)


def test_production_rejects_default_dev_cors_origins():
    """Verify production startup fails when BACKEND_CORS_ORIGINS is left as development defaults."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            APP_ENV="production",
            DEBUG=False,
            SECRET_KEY=VALID_PROD_SECRET,
            DATABASE_URL=VALID_PROD_DB,
            # Leaving BACKEND_CORS_ORIGINS to default dev list
        )
    assert "BACKEND_CORS_ORIGINS cannot silently fall back to development localhost defaults" in str(exc_info.value)


def test_production_rejects_empty_database_url():
    """Verify production startup fails when DATABASE_URL is empty."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            APP_ENV="production",
            DEBUG=False,
            SECRET_KEY=VALID_PROD_SECRET,
            DATABASE_URL="",
            BACKEND_CORS_ORIGINS=VALID_PROD_CORS,
        )
    assert "DATABASE_URL must be explicitly configured in production" in str(exc_info.value)


def test_production_rejects_whitespace_database_url():
    """Verify production startup fails when DATABASE_URL is whitespace-only."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            APP_ENV="production",
            DEBUG=False,
            SECRET_KEY=VALID_PROD_SECRET,
            DATABASE_URL="   \t\n  ",
            BACKEND_CORS_ORIGINS=VALID_PROD_CORS,
        )
    assert "DATABASE_URL must be explicitly configured in production" in str(exc_info.value)


@pytest.mark.parametrize(
    "wildcard_cors",
    [
        "*",
        "https://app.greencycle.eco,*",
        "*,https://example.com",
    ],
)
def test_production_rejects_wildcard_cors_origins(wildcard_cors: str):
    """Verify production startup fails when BACKEND_CORS_ORIGINS contains wildcard '*'."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            APP_ENV="production",
            DEBUG=False,
            SECRET_KEY=VALID_PROD_SECRET,
            DATABASE_URL=VALID_PROD_DB,
            BACKEND_CORS_ORIGINS=wildcard_cors,
        )
    assert "BACKEND_CORS_ORIGINS cannot contain wildcard '*'" in str(exc_info.value)


def test_production_accepts_external_postgresql_database_url():
    """Verify production startup accepts a valid external PostgreSQL connection string."""
    external_url = "postgresql+psycopg2://rds_admin:StrongProdDbPass2026!@aws-rds-cluster.internal:5432/greencycle_prod"
    settings = Settings(
        APP_ENV="production",
        DEBUG=False,
        SECRET_KEY=VALID_PROD_SECRET,
        DATABASE_URL=external_url,
        BACKEND_CORS_ORIGINS=VALID_PROD_CORS,
    )
    assert settings.DATABASE_URL == external_url


def test_development_allows_development_defaults():
    """Verify development environment preserves local developer workflow without errors."""
    dev_settings = Settings(
        APP_ENV="development",
        DEBUG=True,
    )
    assert dev_settings.APP_ENV == "development"
    assert dev_settings.DEBUG is True
    assert "sqlite" in dev_settings.DATABASE_URL


