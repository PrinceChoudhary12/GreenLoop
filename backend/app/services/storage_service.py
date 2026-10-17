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

        # 3. Magic byte signature verification
        is_valid_sig = False
        if contents.startswith(b"\x89PNG\r\n\x1a\n"):
            is_valid_sig = True
        elif contents.startswith(b"\xff\xd8\xff"):
            is_valid_sig = True
        elif contents.startswith(b"RIFF") and len(contents) >= 12 and contents[8:12] == b"WEBP":
            is_valid_sig = True

        if not is_valid_sig:
            raise AppException(
                message="Uploaded file content does not match a valid image signature (JPEG, PNG, or WebP).",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="INVALID_FILE_SIGNATURE",
            )

        # 4. Determine safe file extension
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
        # 5. Save image: attempt persistent cloud storage if configured, otherwise save to local disk
        cloud_url = await cls._save_to_cloud(contents, unique_filename, content_type)
        if cloud_url:
            return cloud_url

        # Fallback to local disk storage
        upload_dir = cls._ensure_upload_dir()
        file_path = os.path.join(upload_dir, unique_filename)
        with open(file_path, "wb") as f:
            f.write(contents)

        logger.info(f"Image uploaded locally: {unique_filename} ({len(contents)} bytes)")
        return f"/uploads/{unique_filename}"

    @classmethod
    async def _save_to_cloud(cls, contents: bytes, filename: str, content_type: str) -> Optional[str]:
        """Upload to Cloudinary or Supabase Storage if configured."""
        import hashlib
        import time
        from urllib.parse import urlparse
        import httpx

        # 1. Cloudinary upload
        cloud_name = settings.CLOUDINARY_CLOUD_NAME
        api_key = settings.CLOUDINARY_API_KEY
        api_secret = settings.CLOUDINARY_API_SECRET

        if settings.CLOUDINARY_URL and not cloud_name:
            try:
                parsed = urlparse(settings.CLOUDINARY_URL)
                api_key = parsed.username
                api_secret = parsed.password
                cloud_name = parsed.hostname
            except Exception as e:
                logger.warning(f"Failed to parse CLOUDINARY_URL: {e}")

        if cloud_name and api_key and api_secret:
            try:
                timestamp = str(int(time.time()))
                public_id = f"greencycle/{os.path.splitext(filename)[0]}"
                to_sign = f"public_id={public_id}&timestamp={timestamp}{api_secret}"
                signature = hashlib.sha1(to_sign.encode("utf-8")).hexdigest()

                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(
                        f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload",
                        data={
                            "api_key": api_key,
                            "timestamp": timestamp,
                            "public_id": public_id,
                            "signature": signature,
                        },
                        files={"file": (filename, contents, content_type)},
                    )
                    if resp.status_code in (200, 201):
                        data = resp.json()
                        secure_url = data.get("secure_url")
                        if secure_url:
                            logger.info(f"Image uploaded to Cloudinary: {secure_url}")
                            return secure_url
                    logger.warning(f"Cloudinary upload returned status {resp.status_code}: {resp.text}")
            except Exception as e:
                logger.warning(f"Cloudinary upload exception, falling back: {e}")

        # 2. Supabase Storage upload
        if settings.SUPABASE_URL and settings.SUPABASE_KEY:
            try:
                base_url = settings.SUPABASE_URL.rstrip("/")
                upload_url = f"{base_url}/storage/v1/object/{settings.SUPABASE_BUCKET}/{filename}"
                headers = {
                    "Authorization": f"Bearer {settings.SUPABASE_KEY}",
                    "apiKey": settings.SUPABASE_KEY,
                    "Content-Type": content_type or "image/jpeg",
                }
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(upload_url, content=contents, headers=headers)
                    if resp.status_code in (200, 201):
                        public_url = f"{base_url}/storage/v1/object/public/{settings.SUPABASE_BUCKET}/{filename}"
                        logger.info(f"Image uploaded to Supabase Storage: {public_url}")
                        return public_url
                    logger.warning(f"Supabase Storage returned status {resp.status_code}: {resp.text}")
            except Exception as e:
                logger.warning(f"Supabase Storage exception, falling back: {e}")

        return None
