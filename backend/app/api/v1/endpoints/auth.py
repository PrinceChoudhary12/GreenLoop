"""Authentication API endpoints."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.app.core.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.user import (
    MessageResponse,
    TokenResponse,
    UserLogin,
    UserPasswordChange,
    UserProfileUpdate,
    UserRegister,
    UserResponse,
)
from backend.app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register Citizen Account",
    description="Register a new citizen with name, email, and password.",
)
def register(
    payload: UserRegister,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Handle new citizen registration and issue JWT token."""
    user, token = AuthService.register_citizen(db=db, data=payload)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/register/collector",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register Collector Account",
    description="Register a new waste collector account with name, email, and password.",
)
def register_collector(
    payload: UserRegister,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Handle new collector registration and issue JWT token."""
    user, token = AuthService.register_collector(db=db, data=payload)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User Login",
    description="Authenticate with email and password to receive a JWT access token.",
)
def login(
    payload: UserLogin,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Authenticate user credentials."""
    user, token = AuthService.authenticate_user(db=db, data=payload)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Current User Profile",
    description="Retrieve profile details of the currently authenticated user.",
)
def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Return currently authenticated user."""
    return UserResponse.model_validate(current_user)


@router.put(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Current User Profile",
    description="Update mutable profile information (e.g. name) of the currently authenticated user.",
)
def update_me(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    """Update profile of currently authenticated user."""
    user = AuthService.update_profile(db=db, user=current_user, data=payload)
    return UserResponse.model_validate(user)


@router.put(
    "/me/password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Change Current User Password",
    description="Change password for the currently authenticated user after verifying current password.",
)
def change_my_password(
    payload: UserPasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Change password for currently authenticated user."""
    AuthService.change_password(db=db, user=current_user, data=payload)
    return MessageResponse(message="Password changed successfully.")
