import json
from typing import Any, Optional

import redis

from app.core.config import settings

# TTL 1h pour les tableaux de bord (cf. docs/ARCHITECTURE.md - "cache Redis adaptatif").
CACHE_TTL_SECONDS = 3600


class AnalyticsCache:
    def __init__(self, client: redis.Redis):
        self._client = client

    def get(self, key: str) -> Optional[Any]:
        value = self._client.get(key)
        return json.loads(value) if value else None

    def set(self, key: str, value: Any) -> None:
        self._client.set(key, json.dumps(value), ex=CACHE_TTL_SECONDS)


def get_cache() -> AnalyticsCache:
    client = redis.Redis(
        host=settings.redis_host,
        port=settings.redis_port,
        password=settings.redis_password or None,
        decode_responses=True,
    )
    return AnalyticsCache(client)
