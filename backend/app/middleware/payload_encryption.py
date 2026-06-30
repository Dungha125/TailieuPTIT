import json
import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.utils import payload_crypto

logger = logging.getLogger(__name__)

SKIP_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}
SKIP_PREFIXES = (
    "/admin/upload",
    "/documents/download/",
    "/documents/preview/",
    "/seo/",
)


def _should_skip(path: str) -> bool:
    if path in SKIP_PATHS:
        return True
    return any(path.startswith(prefix) for prefix in SKIP_PREFIXES)


class PayloadEncryptionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not payload_crypto.is_enabled():
            if (
                request.headers.get("x-encrypted") == "1"
                and request.method in ("POST", "PUT", "PATCH")
            ):
                return JSONResponse(
                    status_code=400,
                    content={
                        "detail": (
                            "Server does not accept encrypted payloads. "
                            "Disable payload encryption on the frontend or enable "
                            "ENABLE_API_PAYLOAD_ENCRYPTION on the backend."
                        )
                    },
                )
            return await call_next(request)

        path = request.url.path.rstrip("/") or "/"
        if _should_skip(path):
            return await call_next(request)

        content_type = request.headers.get("content-type", "")
        if (
            request.headers.get("x-encrypted") == "1"
            and request.method in ("POST", "PUT", "PATCH")
            and "multipart/form-data" not in content_type
        ):
            body = await request.body()
            try:
                plaintext = payload_crypto.decrypt_bytes(body)
            except Exception as e:
                logger.warning("Payload decrypt failed: %s", e)
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Invalid encrypted payload"},
                )

            async def receive():
                return {"type": "http.request", "body": plaintext, "more_body": False}

            request = Request(request.scope, receive)

        response = await call_next(request)

        if response.status_code >= 400:
            return response

        resp_ct = response.headers.get("content-type", "")
        if "application/json" not in resp_ct:
            return response

        body = b""
        async for chunk in response.body_iterator:
            body += chunk

        if not body:
            return response

        try:
            encrypted = payload_crypto.encrypt_bytes(body)
        except Exception as e:
            logger.warning("Payload encrypt failed: %s", e)
            return Response(
                content=body,
                status_code=response.status_code,
                media_type="application/json",
            )

        headers = dict(response.headers)
        headers.pop("content-length", None)
        headers["X-Encrypted"] = "1"
        headers["Content-Type"] = "text/plain; charset=utf-8"

        return Response(
            content=encrypted,
            status_code=response.status_code,
            headers=headers,
        )
