"""In-memory sliding window rate limiting for GreenLoop API.

Protects sensitive authentication, search, and transactional endpoints
against brute-force and denial-of-service abuse.
"""

import sys
import time
from collections import defaultdict
from typing import Dict, List, Tuple
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from backend.app.core.config import settings
from backend.app.core.logging import get_logger

logger = get_logger("greenloop.rate_limit")


class RateLimiter:
    """Sliding-window in-memory request rate limiter."""

    def __init__(self):
        # Maps (client_ip, endpoint_category) -> list of timestamp floats
        self._requests: Dict[Tuple[str, str], List[float]] = defaultdict(list)
        self._last_cleanup = time.time()

    def _cleanup_old_entries(self, now: float, window_seconds: float = 60.0):
        """Periodically purge expired timestamp entries to prevent memory growth."""
        if now - self._last_cleanup < 120.0:
            return
        self._last_cleanup = now
        cutoff = now - window_seconds
        expired_keys = []
        for key, timestamps in self._requests.items():
            self._requests[key] = [ts for ts in timestamps if ts > cutoff]
            if not self._requests[key]:
                expired_keys.append(key)
        for key in expired_keys:
            self._requests.pop(key, None)

    def is_allowed(
        self, client_ip: str, category: str, limit: int, window_seconds: float = 60.0
    ) -> Tuple[bool, int, int]:
        """Determine if request is permitted under rate limit.

        Returns (is_allowed, remaining_requests, retry_after_seconds).
        """
        now = time.time()
        self._cleanup_old_entries(now, window_seconds)

        key = (client_ip, category)
        cutoff = now - window_seconds
        # Filter to requests within current window
        valid_timestamps = [ts for ts in self._requests[key] if ts > cutoff]
        self._requests[key] = valid_timestamps

        if len(valid_timestamps) >= limit:
            oldest_ts = valid_timestamps[0]
            retry_after = max(1, int(window_seconds - (now - oldest_ts)))
            return False, 0, retry_after

        # Record this request
        valid_timestamps.append(now)
        self._requests[key] = valid_timestamps
        remaining = max(0, limit - len(valid_timestamps))
        return True, remaining, 0

    def clear(self):
        """Reset rate limiter state (useful for test suites)."""
        self._requests.clear()
        self._last_cleanup = time.time()


limiter = RateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """HTTP middleware applying rate limits according to request route."""

    async def dispatch(self, request: Request, call_next):
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        # Skip rate limiting for static uploads, docs, health, and test environments
        path = request.url.path
        if (
            path.startswith("/uploads")
            or path.startswith("/docs")
            or path.startswith("/redoc")
            or path.startswith("/openapi")
            or path == "/health"
            or path == f"{settings.API_V1_STR}/health"
            or settings.APP_ENV == "testing"
        ):
            return await call_next(request)

        # Determine client identifier
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "127.0.0.1"

        # Bypass for test suites unless explicitly testing rate limits
        if (client_ip in ("testclient", "testserver") or "pytest" in sys.modules) and "x-test-rate-limit" not in request.headers:
            return await call_next(request)

        # Categorize route and determine threshold
        if "/auth/login" in path or "/auth/register" in path or "/auth/me/password" in path:
            category = "auth"
            limit = settings.RATE_LIMIT_AUTH_PER_MINUTE
        else:
            category = "api"
            limit = settings.RATE_LIMIT_API_PER_MINUTE

        allowed, remaining, retry_after = limiter.is_allowed(client_ip, category, limit)

        if not allowed:
            logger.warning(
                f"Rate limit exceeded for IP {client_ip} on {path} (Category: {category}, Limit: {limit}/min)"
            )
            response = JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": f"Too many requests. Please wait {retry_after} seconds before retrying.",
                        "details": {"retry_after_seconds": retry_after},
                    }
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                },
            )
            return response

        response: Response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
