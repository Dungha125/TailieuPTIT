import json
import logging
from typing import Any

import redis

from app.config import settings

logger = logging.getLogger(__name__)


class RedisService:
    def __init__(self):
        self._client: redis.Redis | None = None

    @property
    def client(self) -> redis.Redis:
        if self._client is None:
            self._client = redis.from_url(settings.redis_url, decode_responses=True)
        return self._client

    def get(self, key: str) -> Any | None:
        try:
            data = self.client.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            logger.warning("Redis GET error: %s", e)
            return None

    def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        try:
            self.client.set(key, json.dumps(value, default=str), ex=ttl)
        except Exception as e:
            logger.warning("Redis SET error: %s", e)

    def delete_pattern(self, pattern: str) -> None:
        try:
            for key in self.client.scan_iter(match=pattern):
                self.client.delete(key)
        except Exception as e:
            logger.warning("Redis DELETE pattern error: %s", e)

    def invalidate_document_caches(self) -> None:
        self.delete_pattern("documents:*")
        self.delete_pattern("search:*")
        self.delete_pattern("doc:*")

    def check_rate_limit(self, key: str, limit: int, window: int) -> bool:
        try:
            current = self.client.incr(key)
            if current == 1:
                self.client.expire(key, window)
            return current <= limit
        except Exception as e:
            logger.warning("Redis rate limit error: %s", e)
            return True

    def increment_hot_download(self, doc_id: int) -> None:
        try:
            self.client.zincrby("hot:downloads", 1, str(doc_id))
        except Exception as e:
            logger.warning("Redis hot ranking error: %s", e)

    def get_hot_downloads(self, limit: int = 10) -> list[int]:
        try:
            results = self.client.zrevrange("hot:downloads", 0, limit - 1)
            return [int(doc_id) for doc_id in results]
        except Exception as e:
            logger.warning("Redis get hot downloads error: %s", e)
            return []

    def add_recent_upload(self, doc_id: int, max_items: int = 20) -> None:
        try:
            self.client.lpush("recent:uploads", str(doc_id))
            self.client.ltrim("recent:uploads", 0, max_items - 1)
        except Exception as e:
            logger.warning("Redis recent uploads error: %s", e)

    def get_recent_uploads(self, limit: int = 10) -> list[int]:
        try:
            results = self.client.lrange("recent:uploads", 0, limit - 1)
            return [int(doc_id) for doc_id in results]
        except Exception as e:
            logger.warning("Redis get recent uploads error: %s", e)
            return []


redis_service = RedisService()
