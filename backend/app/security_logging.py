"""
Structured security logging for the Чек finance app.

Emits JSON log lines to stdout so they can be consumed by any log
aggregator (Loki, ELK, Datadog, CloudWatch, etc.).

Event taxonomy:
  auth.login.success        — successful login
  auth.login.failure        — bad credentials
  auth.register             — new account created
  auth.logout               — explicit logout
  auth.token.refresh        — token rotated
  auth.token.revoked_reuse  — revoked token used → all sessions killed
  auth.password.reset_requested
  auth.password.reset_applied
  auth.password.changed
  http.4xx                  — client error (per request)
  http.5xx                  — server error (per request)
  anomaly.many_401          — IP hammering auth (logged by middleware)
  anomaly.many_403          — IP probing for other users' data
"""

import json
import logging
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# ── Logger setup ──────────────────────────────────────────────────────────────

_log = logging.getLogger('security')

# Ensure security events always go through — don't let root logger suppress them
if not _log.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter('%(message)s'))  # raw JSON lines
    _log.addHandler(_handler)
    _log.setLevel(logging.INFO)
    _log.propagate = False


def _emit(event: str, **fields: object) -> None:
    """Emit a single structured JSON security event to stdout."""
    record = {
        'ts': datetime.now(timezone.utc).isoformat(),
        'event': event,
        **fields,
    }
    _log.info(json.dumps(record, ensure_ascii=False, default=str))


# ── Public helpers (called from route handlers) ───────────────────────────────

def log_login_success(user_id: str, ip: str) -> None:
    _emit('auth.login.success', user_id=user_id, ip=ip)


def log_login_failure(email: str, ip: str) -> None:
    # Log email hash, not plaintext — avoids leaking user data to log systems
    import hashlib
    _emit('auth.login.failure', email_sha256=hashlib.sha256(email.lower().encode()).hexdigest()[:16], ip=ip)


def log_register(user_id: str, ip: str) -> None:
    _emit('auth.register', user_id=user_id, ip=ip)


def log_logout(user_id: str, ip: str) -> None:
    _emit('auth.logout', user_id=user_id, ip=ip)


def log_token_refresh(user_id: str, ip: str) -> None:
    _emit('auth.token.refresh', user_id=user_id, ip=ip)


def log_token_reuse_attack(user_id: str, ip: str) -> None:
    """Fired when a revoked refresh token is presented — possible theft."""
    _emit('auth.token.revoked_reuse', user_id=user_id, ip=ip, severity='HIGH')


def log_password_reset_requested(user_id: str, ip: str) -> None:
    _emit('auth.password.reset_requested', user_id=user_id, ip=ip)


def log_password_reset_applied(user_id: str, ip: str) -> None:
    _emit('auth.password.reset_applied', user_id=user_id, ip=ip)


def log_password_changed(user_id: str, ip: str) -> None:
    _emit('auth.password.changed', user_id=user_id, ip=ip)


# ── Anomaly detection (sliding window counters per IP) ────────────────────────

# Tracks (status_code → deque of timestamps) per IP address
# Memory-bounded: at most _MAX_IPS tracked simultaneously
_MAX_IPS = 10_000
_WINDOW_SECONDS = 60
_THRESHOLD_401 = 20   # >20 auth failures/min from one IP → anomaly
_THRESHOLD_403 = 30   # >30 forbidden/min from one IP → anomaly

_counters: dict[str, dict[int, deque]] = defaultdict(lambda: defaultdict(deque))


def _count_status(ip: str, status: int) -> int:
    """Sliding-window count of `status` codes seen from `ip` in the last minute."""
    now = time.monotonic()
    bucket = _counters[ip][status]

    # Evict old entries
    while bucket and bucket[0] < now - _WINDOW_SECONDS:
        bucket.popleft()

    bucket.append(now)
    return len(bucket)


# ── HTTP middleware ────────────────────────────────────────────────────────────

class SecurityLoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs every 4xx/5xx response with structured JSON.
    Detects per-IP anomalies (brute force, IDOR probing).
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start = time.monotonic()
        try:
            response = await call_next(request)
        except Exception:
            # Необработанное исключение пролетает мимо ветки status>=500 ниже
            # (ответ 500 рендерит внешний ServerErrorMiddleware) — ловим здесь,
            # иначе в логах http.5xx нет стека и дебажить прод нечем
            import traceback
            _emit(
                'http.5xx',
                method=request.method,
                path=request.url.path,
                status=500,
                ip=request.client.host if request.client else 'unknown',
                duration_ms=round((time.monotonic() - start) * 1000),
                severity='ERROR',
                traceback=traceback.format_exc(),
            )
            raise
        duration_ms = round((time.monotonic() - start) * 1000)

        status = response.status_code
        ip = request.client.host if request.client else 'unknown'
        method = request.method
        path = request.url.path

        if status >= 500:
            _emit(
                'http.5xx',
                method=method,
                path=path,
                status=status,
                ip=ip,
                duration_ms=duration_ms,
                severity='ERROR',
            )

        elif status >= 400:
            _emit(
                'http.4xx',
                method=method,
                path=path,
                status=status,
                ip=ip,
                duration_ms=duration_ms,
            )

            # Anomaly detection
            if status == 401:
                count = _count_status(ip, 401)
                if count >= _THRESHOLD_401:
                    _emit(
                        'anomaly.many_401',
                        ip=ip,
                        count=count,
                        window_seconds=_WINDOW_SECONDS,
                        severity='HIGH',
                        note='Possible brute-force or credential stuffing attack',
                    )

            elif status == 403:
                count = _count_status(ip, 403)
                if count >= _THRESHOLD_403:
                    _emit(
                        'anomaly.many_403',
                        ip=ip,
                        count=count,
                        window_seconds=_WINDOW_SECONDS,
                        severity='MEDIUM',
                        note='Possible IDOR probing or enumeration attempt',
                    )

        # Prune IPs to avoid unbounded memory growth
        if len(_counters) > _MAX_IPS:
            oldest = next(iter(_counters))
            del _counters[oldest]

        return response
