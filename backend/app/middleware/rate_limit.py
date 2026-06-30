import logging
import re

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.config import settings
from app.services.rate_limit_service import rate_limit_service
from app.utils.client import get_client_ip

logger = logging.getLogger(__name__)

ROUTE_RULES: list[tuple[re.Pattern, int, int]] = [
    (re.compile(r"^/auth/login$"), settings.rate_limit_login, 60),
    (re.compile(r"^/admin/upload$"), settings.rate_limit_upload, 60),
    (re.compile(r"^/documents/search"), settings.rate_limit_search, 60),
]

SKIP_PATHS = {"/health", "/docs", "/openapi.json", "/redoc", "/seo/sitemap.xml", "/seo/robots.txt"}


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path.rstrip("/") or "/"
        if path in SKIP_PATHS or request.method == "OPTIONS":
            return await call_next(request)

        ip = get_client_ip(request)
        if rate_limit_service.is_banned(ip):
            rate_limit_service.log_security_event("ip_banned_block", ip, path)
            return JSONResponse(
                status_code=403,
                content={"detail": "Access temporarily blocked. Try again later."},
                headers={"Retry-After": str(settings.rate_limit_ban_seconds)},
            )

        limit, window = settings.rate_limit_public, 60
        for pattern, route_limit, route_window in ROUTE_RULES:
            if pattern.search(path):
                limit, window = route_limit, route_window
                break

        user_key = self._user_key(request)
        keys = [f"ip:{ip}:{path}", f"global:{path}"]
        if user_key:
            keys.append(f"user:{user_key}:{path}")

        for key in keys:
            allowed, retry_after = rate_limit_service.check_sliding_window(key, limit, window)
            if not allowed:
                rate_limit_service.log_security_event("rate_limit", ip, f"{path} key={key}")
                if key.startswith(f"ip:{ip}"):
                    over_key = f"over:{ip}"
                    over_allowed, _ = rate_limit_service.check_sliding_window(
                        over_key, settings.rate_limit_burst_threshold, 60
                    )
                    if not over_allowed:
                        rate_limit_service.ban_ip(ip)

                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please slow down."},
                    headers={"Retry-After": str(retry_after)},
                )

        return await call_next(request)

    @staticmethod
    def _user_key(request: Request) -> str | None:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            return auth[7:20]
        return None
