"""Authentication and user management business logic."""

from typing import Tuple
from fastapi import status
from sqlalchemy.orm import Session

from backend.app.core.exceptions import AppException
from backend.app.core.logging import get_logger
from backend.app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from backend.app.models.enums import UserRole
from backend.app.models.user import User
from backend.app.repositories.user_repository import UserRepository
from backend.app.schemas.user import UserLogin, UserRegister, UserProfileUpdate, UserPasswordChange

logger = get_logger(__name__)


class AuthService:
    """Service handling user registration, authentication, and token issuance."""

    @staticmethod
    def register_citizen(db: Session, data: UserRegister) -> Tuple[User, str]:
        """Register a new citizen account and issue a JWT access token."""
        return AuthService._register_user(db=db, data=data, role=UserRole.CITIZEN)

    @staticmethod
    def register_collector(db: Session, data: UserRegister) -> Tuple[User, str]:
        """Register a new collector account and issue a JWT access token."""
        return AuthService._register_user(db=db, data=data, role=UserRole.COLLECTOR)

    @staticmethod
    def _register_user(db: Session, data: UserRegister, role: UserRole) -> Tuple[User, str]:
        """Create a role-scoped account while preserving shared credential rules."""
        user_repo = UserRepository(db)

        # Check if email is already taken
        existing_user = user_repo.get_by_email(data.email)
        if existing_user:
            logger.warning(f"Registration rejected: Email '{data.email}' already exists.")
            raise AppException(
                message="An account with this email address already exists.",
                status_code=status.HTTP_409_CONFLICT,
                error_code="EMAIL_ALREADY_EXISTS",
            )

        # Hash password securely with bcrypt
        password_hash = get_password_hash(data.password)

        # Create new role-scoped user
        new_user = User(
            name=data.name,
            email=data.email,
            password_hash=password_hash,
            role=role,
            is_active=True,
        )
        user = user_repo.create(new_user)
        logger.info(f"{role.value.title()} registered successfully: User ID {user.id} ({user.email})")

        # Generate JWT access token
        token = create_access_token(subject=user.id, role=user.role.value)
        return user, token

    @staticmethod
    def authenticate_user(db: Session, data: UserLogin) -> Tuple[User, str]:
        """Authenticate user credentials and issue a JWT access token."""
        user_repo = UserRepository(db)
        user = user_repo.get_by_email(data.email)

        # Generic error message to prevent user enumeration
        invalid_cred_error = AppException(
            message="Invalid email or password.",
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="INVALID_CREDENTIALS",
        )

        if not user:
            logger.warning(f"Login failed: User not found for email '{data.email}'.")
            raise invalid_cred_error

        if not user.is_active:
            logger.warning(f"Login failed: Inactive account for User ID {user.id}.")
            raise AppException(
                message="Account has been deactivated. Please contact support.",
                status_code=status.HTTP_403_FORBIDDEN,
                error_code="ACCOUNT_INACTIVE",
            )

        if not verify_password(data.password, user.password_hash):
            logger.warning(f"Login failed: Invalid password for User ID {user.id}.")
            raise invalid_cred_error

        logger.info(f"User authenticated successfully: User ID {user.id}")
        token = create_access_token(subject=user.id, role=user.role.value)
        return user, token

    @staticmethod
    def update_profile(db: Session, user: User, data: "UserProfileUpdate") -> User:
        """Update mutable profile fields for the authenticated user."""
        user_repo = UserRepository(db)
        user.name = data.name
        updated = user_repo.update(user)
        logger.info(f"Profile updated successfully for User ID {user.id}")
        return updated

    @staticmethod
    def change_password(db: Session, user: User, data: "UserPasswordChange") -> None:
        """Change user password after verifying current credentials."""
        user_repo = UserRepository(db)
        if not verify_password(data.current_password, user.password_hash):
            logger.warning(f"Password change failed: Incorrect current password for User ID {user.id}.")
            raise AppException(
                message="Incorrect current password.",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="INVALID_CURRENT_PASSWORD",
            )

        user.password_hash = get_password_hash(data.new_password)
        user_repo.update(user)
        logger.info(f"Password changed successfully for User ID {user.id}")
