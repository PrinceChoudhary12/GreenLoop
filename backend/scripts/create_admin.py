#!/usr/bin/env python3
"""CLI script to seed or promote an Administrator account in GreenLoop."""

import argparse
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.core.security import get_password_hash
from backend.app.db.base import Base
from backend.app.db.session import engine, SessionLocal
from backend.app.models.enums import UserRole
from backend.app.models.user import User
from backend.app.repositories.user_repository import UserRepository


def create_or_promote_admin(name: str, email: str, password: str) -> None:
    """Ensure an administrator exists with given credentials."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user_repo = UserRepository(db)
        email_clean = email.strip().lower()
        existing_user = user_repo.get_by_email(email_clean)

        if existing_user:
            existing_user.name = name.strip()
            existing_user.role = UserRole.ADMIN
            existing_user.is_active = True
            if password:
                existing_user.password_hash = get_password_hash(password)
            user_repo.update(existing_user)
            print(f"[SUCCESS] User '{email_clean}' promoted to Administrator (User ID: {existing_user.id}).")
        else:
            if not password:
                print("[ERROR] Password is required to create a new Administrator account.")
                sys.exit(1)
            new_admin = User(
                name=name.strip(),
                email=email_clean,
                password_hash=get_password_hash(password),
                role=UserRole.ADMIN,
                is_active=True,
            )
            created = user_repo.create(new_admin)
            print(f"[SUCCESS] Created new Administrator account '{email_clean}' (User ID: {created.id}).")
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Create or promote a GreenLoop Administrator.")
    parser.add_argument("--name", default="System Administrator", help="Admin display name")
    parser.add_argument("--email", default="admin@greenloop.local", help="Admin email address")
    parser.add_argument("--password", default="AdminSecure2026!", help="Admin password")
    args = parser.parse_args()

    create_or_promote_admin(name=args.name, email=args.email, password=args.password)


if __name__ == "__main__":
    main()
