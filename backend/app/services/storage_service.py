"""File storage service for uploaded waste report images."""

import os
import uuid
from typing import Optional
from fastapi import UploadFile, status

from backend.app.core.config import settings
from backend.app.core.exceptions import AppException
from backend.app.core.logging import get_logger

logger = get_logger(__name__)


class StorageService:
    """Handles secure file validation and local disk storage."""

    @staticmethod
    def _ensure_upload_dir() -> str:
        upload_path = os.path.abspath(settings.UPLOAD_DIR)
        os.makedirs(upload_path, exist_ok=True)
        return upload_path

    @classmethod
    async def save_image(cls, file: Optional[UploadFile]) -> Optional[str]:
        """Validate and securely save an uploaded image file."""
        if not file or not file.filename:
            return None

        # 1. Validate content type
        content_type = file.content_type or ""
        if content_type.lower() not in settings.ALLOWED_IMAGE_TYPES:
            raise AppException(
                message=f"Unsupported file type: '{content_type}'. Allowed types are JPEG, PNG, and WebP.",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="INVALID_FILE_TYPE",
            )

        # 2. Read contents and validate size
        contents = await file.read()
        if len(contents) > settings.MAX_IMAGE_SIZE_BYTES:
            max_mb = settings.MAX_IMAGE_SIZE_BYTES // (1024 * 1024)
            raise AppException(
                message=f"File size exceeds the {max_mb} MB limit.",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="FILE_TOO_LARGE",
            )

        if len(contents) == 0:
            raise AppException(
                message="Uploaded file is empty.",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="EMPTY_FILE",
            )

        # 3. Determine safe file extension
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
            # fallback from content type
            if "png" in content_type:
                ext = ".png"
            elif "webp" in content_type:
                ext = ".webp"
            else:
                ext = ".jpg"

        # 4. Generate collision-resistant unique filename
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        upload_dir = cls._ensure_upload_dir()
        file_path = os.path.join(upload_dir, unique_filename)

        # 5. Write to disk
        with open(file_path, "wb") as f:
            f.write(contents)

        logger.info(f"Image uploaded successfully: {unique_filename} ({len(contents)} bytes)")
        return f"/uploads/{unique_filename}"
