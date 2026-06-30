import logging
import time
import uuid

from app.config import settings
from app.services.redis_service import redis_service

logger = logging.getLogger(__name__)


class RateLimitService:
    """Sliding-window rate limiting with optional IP ban."""

    def _client(self):
        return redis_service.client

    def is_banned(self, ip: str) -> bool:
        try:
            return bool(self._client().get(f"ban:ip:{ip}"))
        except Exception as e:
            logger.warning("Redis ban check error: %s", e)
            return settings.rate_limit_fail_closed

    def ban_ip(self, ip: str, seconds: int | None = None) -> None:
        ttl = seconds or settings.rate_limit_ban_seconds
        try:
            self._client().setex(f"ban:ip:{ip}", ttl, "1")
            logger.warning("IP banned for %ds: %s", ttl, ip)
        except Exception as e:
            logger.warning("Redis ban set error: %s", e)

    def check_sliding_window(self, key: str, limit: int, window: int) -> tuple[bool, int]:
        """
        Returns (allowed, retry_after_seconds).
        Fail-closed when Redis unavailable if configured.
        """
        try:
            now = time.time()
            redis_key = f"rl:sw:{key}"
            member = f"{now}:{uuid.uuid4().hex[:8]}"
            pipe = self._client().pipeline()
            pipe.zremrangebyscore(redis_key, 0, now - window)
            pipe.zadd(redis_key, {member: now})
            pipe.zcard(redis_key)
            pipe.expire(redis_key, window + 1)
            results = pipe.execute()
            count = int(results[2])

            if count > limit:
                return False, window
            return True, 0
        except Exception as e:
            logger.warning("Redis sliding window error: %s", e)
            if settings.rate_limit_fail_closed:
                return False, window
            return True, 0

    def record_login_failure(self, ip: str) -> int:
        """Track failed logins; auto-ban after threshold. Returns failure count."""
        try:
            key = f"auth:fail:{ip}"
            count = self._client().incr(key)
            if count == 1:
                self._client().expire(key, settings.login_lockout_window)
            if count >= settings.login_max_attempts:
                self.ban_ip(ip, settings.login_ban_seconds)
                self._client().delete(key)
            return int(count)
        except Exception as e:
            logger.warning("Redis login failure tracking error: %s", e)
            return 0

    def clear_login_failures(self, ip: str) -> None:
        try:
            self._client().delete(f"auth:fail:{ip}")
        except Exception as e:
            logger.warning("Redis clear login failures error: %s", e)

    def log_security_event(self, event: str, ip: str, detail: str = "") -> None:
        try:
            entry = f"{time.time():.0f}|{event}|{ip}|{detail}"
            self._client().lpush("security:events", entry)
            self._client().ltrim("security:events", 0, 9999)
        except Exception as e:
            logger.warning("Security event log error: %s", e)
        logger.info("SECURITY %s ip=%s %s", event, ip, detail)


rate_limit_service = RateLimitService()
