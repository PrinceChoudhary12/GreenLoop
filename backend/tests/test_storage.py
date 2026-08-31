"""Tests for storage service and image upload validations."""

import io
import pytest
from fastapi import UploadFile

from backend.app.core.exceptions import AppException
from backend.app.services.storage_service import StorageService


@pytest.mark.asyncio
async def test_storage_rejects_invalid_mime_type():
    """Verify storage rejects non-image MIME types."""
    fake_txt = io.BytesIO(b"Hello world text content")
    upload = UploadFile(filename="document.txt", file=fake_txt, headers={"content-type": "text/plain"})

    with pytest.raises(AppException) as exc_info:
        await StorageService.save_image(upload)

    assert exc_info.value.status_code == 400
    assert exc_info.value.error_code == "INVALID_FILE_TYPE"


@pytest.mark.asyncio
async def test_storage_rejects_oversized_file():
    """Verify storage rejects files exceeding maximum size limit."""
    # 6MB dummy content
    oversized = io.BytesIO(b"X" * (6 * 1024 * 1024))
    upload = UploadFile(filename="giant.jpg", file=oversized, headers={"content-type": "image/jpeg"})

    with pytest.raises(AppException) as exc_info:
        await StorageService.save_image(upload)

    assert exc_info.value.status_code == 400
    assert exc_info.value.error_code == "FILE_TOO_LARGE"


@pytest.mark.asyncio
async def test_storage_accepts_valid_image():
    """Verify storage saves valid image and returns sanitized relative path."""
    valid_png = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4")
    upload = UploadFile(filename="safe_photo.png", file=valid_png, headers={"content-type": "image/png"})

    saved_path = await StorageService.save_image(upload)
    assert saved_path is not None
    assert saved_path.startswith("/uploads/")
    assert saved_path.endswith(".png")
