"""
In-process TTL cache for analytics endpoints.
Thread-safe dict keyed by (user_id, cache_key). No external dependencies.
"""
import hashlib
import threading
import time
from typing import Any


class TTLCache:
    def __init__(self, default_ttl: int = 300) -> None:
        self._store: dict[tuple[str, str], tuple[Any, float]] = {}
        self._lock = threading.Lock()
        self._default_ttl = default_ttl

    def _make_key(self, user_id: str, endpoint: str, params: dict) -> tuple[str, str]:
        params_hash = hashlib.md5(
            '&'.join(f'{k}={v}' for k, v in sorted(params.items())).encode()
        ).hexdigest()[:8]
        return (user_id, f'{endpoint}:{params_hash}')

    def get(self, user_id: str, endpoint: str, params: dict) -> Any | None:
        key = self._make_key(user_id, endpoint, params)
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expires_at = entry
            if time.monotonic() > expires_at:
                del self._store[key]
                return None
            return value

    def set(self, user_id: str, endpoint: str, params: dict, value: Any, ttl: int | None = None) -> None:
        key = self._make_key(user_id, endpoint, params)
        expires_at = time.monotonic() + (ttl if ttl is not None else self._default_ttl)
        with self._lock:
            self._store[key] = (value, expires_at)

    def invalidate_user(self, user_id: str) -> None:
        with self._lock:
            keys_to_delete = [k for k in self._store if k[0] == user_id]
            for k in keys_to_delete:
                del self._store[k]


analytics_cache = TTLCache(default_ttl=300)
