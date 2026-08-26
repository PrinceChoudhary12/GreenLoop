"""Application logging configuration for GreenLoop.

Provides structured, clean logging without leaking sensitive data.
"""

import logging
import re
import sys
from typing import Any
from backend.app.core.config import settings

# Sensitive key patterns to sanitize
SENSITIVE_PATTERNS = [
    re.compile(r"(password|token|secret|key|authorization|bearer)\s*[:=]\s*['\"]?([^'\"\s]+)['\"]?", re.IGNORECASE),
]


class SensitiveDataFilter(logging.Filter):
    """Filter that masks sensitive values in log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            msg = record.msg
            for pattern in SENSITIVE_PATTERNS:
                msg = pattern.sub(r"\1: [MASKED]", msg)
            record.msg = msg
        return True


def setup_logging() -> None:
    """Initialize application logging format and handlers."""
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    log_format = "%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d - %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"

    formatter = logging.Formatter(fmt=log_format, datefmt=date_format)

    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    console_handler.addFilter(SensitiveDataFilter())

    # Root Logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Clear existing handlers to avoid duplicates
    if root_logger.hasHandlers():
        root_logger.handlers.clear()

    root_logger.addHandler(console_handler)

    # Silence overly verbose external loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a named logger configured for GreenLoop."""
    return logging.getLogger(name)
