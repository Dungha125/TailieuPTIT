import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


async def verify_turnstile(token: str | None, ip: str) -> bool:
    if not settings.turnstile_secret_key:
        return True
    if not token:
        return False
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data={
                    "secret": settings.turnstile_secret_key,
                    "response": token,
                    "remoteip": ip,
                },
            )
            data = res.json()
            return bool(data.get("success"))
    except Exception as e:
        logger.warning("Turnstile verification error: %s", e)
        return False
