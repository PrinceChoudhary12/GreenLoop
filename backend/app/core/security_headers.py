"""Production security headers and request size enforcement middleware."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from backend.app.core.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Enforces standard HTTP security response headers and request body limits."""

    async def dispatch(self, request: Request, call_next):
        # 1. Enforce max request content-length limit
        content_length_str = request.headers.get("content-length")
        if content_length_str:
            try:
                content_length = int(content_length_str)
                if content_length > settings.MAX_REQUEST_BODY_BYTES:
                    return JSONResponse(
                        status_code=413,
                        content={
                            "error": {
                                "code": "PAYLOAD_TOO_LARGE",
                                "message": f"Request payload exceeds the maximum allowed limit ({settings.MAX_REQUEST_BODY_BYTES // (1024 * 1024)} MB).",
                                "details": {},
                            }
                        },
                    )
            except ValueError:
                pass

        # 2. Process request
        response: Response = await call_next(request)

        # 3. Attach security headers if enabled
        if settings.ENABLE_SECURITY_HEADERS:
            headers = response.headers
            headers["X-Content-Type-Options"] = "nosniff"
            headers["X-Frame-Options"] = "DENY"
            headers["X-XSS-Protection"] = "1; mode=block"
            headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            headers["Permissions-Policy"] = "camera=(), microphone=(), payment=()"

            # Apply strict CSP
            headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "img-src 'self' data: blob: https:; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' data: https://fonts.gstatic.com; "
                "connect-src 'self' http://127.0.0.1:* http://localhost:* https:; "
                "frame-ancestors 'none';"
            )

            # Strict Transport Security in production/staging environments
            if settings.APP_ENV in ("production", "staging"):
                headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        return response
