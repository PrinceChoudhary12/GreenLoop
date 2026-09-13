"""FastAPI dependency providers for authentication and authorization."""

from fastapi import Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from backend.app.core.exceptions import AppException
from backend.app.core.logging import get_logger
from backend.app.core.security import decode_access_token
from backend.app.db.session import get_db
from backend.app.models.enums import UserRole
from backend.app.models.user import User
from backend.app.repositories.user_repository import UserRepository

logger = get_logger(__name__)
security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Validate bearer token and retrieve the active authenticated User."""
    unauthorized_exception = AppException(
        message="Could not validate credentials or token expired.",
        status_code=status.HTTP_401_UNAUTHORIZED,
        error_code="UNAUTHORIZED",
    )

    if not credentials or not credentials.credentials:
        raise unauthorized_exception

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise unauthorized_exception

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise unauthorized_exception

    try:
        user_id = int(user_id_str)
    except ValueError:
        raise unauthorized_exception

    user_repo = UserRepository(db)
    user = user_repo.get_by_id(user_id)
    if not user:
        raise unauthorized_exception

    if not user.is_active:
        raise AppException(
            message="User account is inactive.",
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="ACCOUNT_INACTIVE",
        )

    return user


def get_current_active_citizen(
    current_user: User = Depends(get_current_user),
) -> User:
    """Enforce that the authenticated user is a Citizen or Admin."""
    if current_user.role != UserRole.CITIZEN and current_user.role != UserRole.ADMIN:
        raise AppException(
            message="Operation permitted for Citizens only.",
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="FORBIDDEN_ROLE",
        )
    return current_user


def get_current_active_collector(
    current_user: User = Depends(get_current_user),
) -> User:
    """Enforce that the authenticated user is a Collector or Admin."""
    if current_user.role != UserRole.COLLECTOR and current_user.role != UserRole.ADMIN:
        raise AppException(
            message="Operation permitted for Collectors only.",
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="FORBIDDEN_ROLE",
        )
    return current_user
