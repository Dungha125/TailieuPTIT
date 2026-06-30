import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.utils.client import get_client_ip

logger = logging.getLogger(__name__)

SENSITIVE_PATHS = {"/auth/login", "/admin/upload"}


class RequestLoggingMiddleware(BaseHTTPMiddleware):
  async def dispatch(self, request: Request, call_next):
    request_id = request.headers.get("X-Request-Id") or uuid.uuid4().hex[:16]
    request.state.request_id = request_id
    ip = get_client_ip(request)
    path = request.url.path
    start = time.perf_counter()

    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000

    log_level = logging.WARNING if response.status_code >= 400 else logging.INFO
    logger.log(
      log_level,
      "request_id=%s ip=%s method=%s path=%s status=%s duration_ms=%.1f",
      request_id,
      ip,
      request.method,
      path,
      response.status_code,
      duration_ms,
    )

    if path in SENSITIVE_PATHS or response.status_code in (401, 403, 429):
      from app.services.rate_limit_service import rate_limit_service

      rate_limit_service.log_security_event(
        "suspicious_request",
        ip,
        f"{request.method} {path} -> {response.status_code}",
      )

    response.headers["X-Request-Id"] = request_id
    return response
