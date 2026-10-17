"""Application configuration using Pydantic Settings."""

import json
from typing import List, Optional, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """GreenLoop environment settings."""

    # Application info
    APP_NAME: str = "GreenLoop"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # Server settings
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # Logging
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str = "sqlite:///./greenloop.db"

    # Authentication & Security
    SECRET_KEY: str = "greenloop-dev-secret-key-change-in-production-min-32-chars-long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # File Uploads
    UPLOAD_DIR: str = "uploads"
    MAX_IMAGE_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB
    ALLOWED_IMAGE_TYPES: List[str] = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/jpg",
    ]

    # Cloud Object Storage (optional for production persistence: Cloudinary or Supabase)
    CLOUDINARY_URL: Optional[str] = None
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    SUPABASE_BUCKET: str = "uploads"

    # CORS origins
    # Type is Union[List[str], str] so pydantic-settings v2 does NOT attempt
    # JSON-decoding before our validator runs (it only auto-decodes List[str]).
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """Parse CORS origins whether supplied as JSON string or list."""
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, str) and v.startswith("["):
            return json.loads(v)
        return v

    # Security & Hardening
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_AUTH_PER_MINUTE: int = 30
    RATE_LIMIT_API_PER_MINUTE: int = 150
    ENABLE_SECURITY_HEADERS: bool = True
    MAX_REQUEST_BODY_BYTES: int = 10 * 1024 * 1024  # 10 MB

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key_security(cls, v: str) -> str:
        """Validate secret key minimum length."""
        if not v or len(v.strip()) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long.")
        return v

    @model_validator(mode="after")
    def validate_production_hardening(self) -> "Settings":
        """Strict production environment configuration validation.

        Ensures production startup fails immediately and clearly when secrets
        are missing, weak, or left as development placeholder defaults.
        """
        is_production = self.APP_ENV.lower() in ("production", "prod")

        if is_production:
            # 1. DEBUG must be explicitly False
            if self.DEBUG:
                raise ValueError(
                    "Production configuration error: DEBUG must be set to False in production. "
                    "Running with DEBUG=True leaks sensitive debug internals and stack traces."
                )

            # 2. Strict SECRET_KEY validation
            disallowed_secret_placeholders = {
                "greenloop-dev-secret-key-change-in-production-min-32-chars-long",
                "greenloop-production-secret-key-replace-with-secure-32-chars-token",
                "replace_with_strong_secret_key_minimum_32_characters_long",
                "replace_with_a_secure_random_key_min_32_characters",
                "change-me-in-production-min-32-characters-required",
            }
            sec_lower = (self.SECRET_KEY or "").lower()
            if (
                not self.SECRET_KEY
                or len(self.SECRET_KEY.strip()) < 32
                or self.SECRET_KEY in disallowed_secret_placeholders
                or "replace_with" in sec_lower
                or "change-in-production" in sec_lower
                or "placeholder" in sec_lower
            ):
                raise ValueError(
                    "Production configuration error: SECRET_KEY must be a unique, cryptographically "
                    "secure string (minimum 32 characters) generated outside source control. "
                    "Cannot use development defaults or known placeholder tokens."
                )

            # 3. Database URL and credential validation
            db_url_str = (self.DATABASE_URL or "").strip()
            db_url_lower = db_url_str.lower()
            if not db_url_str:
                raise ValueError(
                    "Production configuration error: DATABASE_URL must be explicitly configured in production. "
                    "Cannot be empty or whitespace."
                )
            if "sqlite" in db_url_lower:
                raise ValueError(
                    "Production configuration error: DATABASE_URL cannot use SQLite in production. "
                    "A managed PostgreSQL connection (postgresql+psycopg2://) is required."
                )

            disallowed_db_placeholders = [
                "greenloop_secure_password_replace_in_prod",
                "replace_with_strong_database_password_min_24_chars",
                ":password@",
                ":postgres@",
                ":root@",
                ":123456@",
            ]
            for placeholder in disallowed_db_placeholders:
                if placeholder in db_url_lower:
                    raise ValueError(
                        f"Production configuration error: DATABASE_URL contains insecure placeholder password '{placeholder}'. "
                        "A unique production database password must be configured outside source control."
                    )

            # 4. CORS Origins validation
            dev_default_origins = {
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5175",
                "http://127.0.0.1:5175",
                "http://localhost:3000",
            }
            current_origins = (
                set(self.BACKEND_CORS_ORIGINS)
                if isinstance(self.BACKEND_CORS_ORIGINS, list)
                else set()
            )
            if not current_origins or current_origins == dev_default_origins:
                raise ValueError(
                    "Production configuration error: BACKEND_CORS_ORIGINS cannot silently fall back to "
                    "development localhost defaults. Specify approved production client domains (e.g., https://yourdomain.com)."
                )
            if "*" in current_origins:
                raise ValueError(
                    "Production configuration error: BACKEND_CORS_ORIGINS cannot contain wildcard '*' when "
                    "allow_credentials=True. Specify explicit approved client origins."
                )

        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()

