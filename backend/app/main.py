import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .api.router import api_router, root_router
from .auth.service import purge_expired_tokens
from .config import settings
from .database import SessionLocal
from .rate_limit import limiter
from .security_logging import SecurityLoggingMiddleware

logger = logging.getLogger('app.main')

_PURGE_INTERVAL_SECONDS = 6 * 60 * 60


async def _token_purge_loop() -> None:
    # refresh_tokens/password_reset_tokens растут вечно без периодической чистки:
    # ротация создаёт строку каждые ~28 минут на активного пользователя
    while True:
        try:
            db = SessionLocal()
            try:
                deleted = await asyncio.to_thread(purge_expired_tokens, db)
                if deleted:
                    logger.info('token purge: deleted %d rows', deleted)
            finally:
                db.close()
        except Exception:
            logger.exception('token purge failed')
        await asyncio.sleep(_PURGE_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(_: FastAPI):
    purge_task = asyncio.create_task(_token_purge_loop())
    yield
    purge_task.cancel()


app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)

# Rate limiter — handles 429 responses for @limiter.limit() decorated routes
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allow_headers=['Authorization', 'Content-Type', 'Accept'],
)

app.add_middleware(SecurityLoggingMiddleware)

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception('Unhandled exception on %s %s', request.method, request.url.path)
    return JSONResponse(status_code=500, content={'detail': 'Internal server error'})


app.include_router(root_router)
app.include_router(api_router)
